import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import type { Opportunity, OpportunityAction } from "@prisma/client";
import { buildMatchContext, getMatchScore, shouldIncludeOpportunity } from "@/lib/match-score";
import { getCachedJson, setCachedJson } from "@/lib/cache";
import { decodeCursor, encodeCursor, paginationSchema } from "@/lib/pagination";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { withTimeout } from "@/lib/timeouts";
import { logger } from "@/lib/logger";
import { getCutoffDate } from "@/lib/news-matcher";

type OpportunityWithUser = Opportunity & {
  createdByUser?: {
    id: string;
    email: string;
    profile?: { name?: string | null; username?: string | null; imageUrl?: string | null } | null;
  } | null;
};

export async function GET(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) {
        return jsonResponse(req, { error: "Database unavailable" }, 500, "opportunities", requestId);
      }

      const userId = await requireUserId();
      if (!userId) {
        return jsonResponse(req, { error: "Unauthorized" }, 401, "opportunities", requestId);
      }

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`opportunities:ip:${ip}`, 120, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "opportunities", requestId);
        return applyRateLimitHeaders(response, 120, limitResult);
      }

      const { searchParams } = new URL(req.url);
      const parsed = paginationSchema.safeParse({
        limit: searchParams.get("limit") ?? undefined,
        cursor: searchParams.get("cursor") ?? undefined,
      });
      if (!parsed.success) {
        return jsonResponse(req, { error: "Invalid pagination" }, 400, "opportunities", requestId);
      }

      const type = searchParams.get("type");
      const tab = searchParams.get("tab") ?? "for-you";
      const search = (searchParams.get("q") ?? "").trim().toLowerCase();
      const where =
        type === "headlines"
          ? { createdByUserId: null }
          : type === "community"
            ? { createdByUserId: { not: null } }
            : undefined;

      const cursorPayload = decodeCursor(parsed.data.cursor);
      const cacheKey = `feed:opportunities:${userId}:${type ?? "all"}:${tab}:${search}:${parsed.data.limit}:${cursorPayload?.id ?? "start"}`;
      const cached = await getCachedJson<{ opportunities: OpportunityWithUser[]; viewerId: string; nextCursor?: string }>(cacheKey);
      if (cached) {
        return jsonResponse(req, cached, 200, "opportunities", requestId);
      }

      const [interests, profile, money] = await Promise.all([
        prisma.interest.findMany({
          where: { userId },
          select: { value: true, type: true },
        }),
        prisma.profile.findUnique({
          where: { userId },
          select: { investAmount: true },
        }),
        prisma.moneyManagement.findUnique({
          where: { userId },
          select: { locationCountry: true, locationRegion: true },
        }),
      ]);

      const context = buildMatchContext({
        interests,
        userCountry: money?.locationCountry ?? null,
        userRegion: money?.locationRegion ?? null,
        investAmount: profile?.investAmount ?? null,
      });

      const cutoff = getCutoffDate();
      const newsFreshFilter =
        type === "headlines"
          ? { publishedAt: { gte: cutoff } }
          : {};
      const baseWhere = where ? { ...where, archivedAt: null, ...newsFreshFilter } : { archivedAt: null };
      const cursorFilter = cursorPayload
        ? {
            OR: [
              { fetchedAt: { lt: new Date(cursorPayload.ts) } },
              { fetchedAt: new Date(cursorPayload.ts), id: { lt: cursorPayload.id } },
            ],
          }
        : {};

      const recent: OpportunityWithUser[] = await withTimeout(
        prisma.opportunity.findMany({
          where: { ...baseWhere, ...cursorFilter },
          orderBy: [{ fetchedAt: "desc" }, { id: "desc" }],
          take: parsed.data.limit * 3,
          include: {
            createdByUser: {
              select: {
                id: true,
                email: true,
                profile: { select: { name: true, username: true, imageUrl: true } },
              },
            },
          },
        }),
        4000,
        "Opportunity query timeout"
      );

      const matched: OpportunityWithUser[] =
        tab === "top" ? recent : recent.filter((o) => shouldIncludeOpportunity(o, context));

      const filtered = search
        ? matched.filter((o) => {
            const hay = `${o.title ?? ""} ${o.summary ?? ""} ${o.details ?? ""} ${(o.tags ?? []).join(" ")}`.toLowerCase();
            return hay.includes(search);
          })
        : matched;

      const limited = filtered.slice(0, parsed.data.limit);
      const ids: string[] = limited.map((m: Opportunity) => m.id);

      const actions: OpportunityAction[] = ids.length
        ? await prisma.opportunityAction.findMany({
            where: { userId, opportunityId: { in: ids } },
          })
        : [];

      const map = new Map<string, OpportunityAction>(
        actions.map((a: OpportunityAction) => [a.opportunityId, a])
      );

      const opportunities = limited.map((o: OpportunityWithUser) => ({
        ...o,
        action: map.get(o.id) ?? null,
        matchScore: getMatchScore(o, context),
      }));

      const now = Date.now();
      const sorted = opportunities.slice().sort((a: any, b: any) => {
        const aBoosted = a.boostedUntil ? new Date(a.boostedUntil).getTime() > now : false;
        const bBoosted = b.boostedUntil ? new Date(b.boostedUntil).getTime() > now : false;
        if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;
        const scoreDiff = (b.matchScore ?? 0) - (a.matchScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.fetchedAt ?? 0).getTime() - new Date(a.fetchedAt ?? 0).getTime();
      });

      const last = sorted[sorted.length - 1];
      const nextCursor = last ? encodeCursor({ id: last.id, ts: last.fetchedAt?.toISOString() ?? new Date().toISOString() }) : undefined;

      const payload = { opportunities: sorted, viewerId: userId, nextCursor };
      await setCachedJson(cacheKey, payload, Number(process.env.FEED_CACHE_TTL_SECONDS || 30));

      return jsonResponse(req, payload, 200, "opportunities", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to fetch opportunities");
      return jsonResponse(req, { error: "Failed to fetch opportunities" }, 500, "opportunities", requestId);
    }
  }, req, "opportunities");
}
