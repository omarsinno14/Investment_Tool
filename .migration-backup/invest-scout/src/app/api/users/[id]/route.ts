import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { getCachedJson, setCachedJson } from "@/lib/cache";
import { decodeCursor, encodeCursor, paginationSchema } from "@/lib/pagination";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";

type RouteParams = { id?: string };

export async function GET(req: Request, context: { params: Promise<RouteParams> | RouteParams }) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "user.profile", requestId);

      const viewerId = await requireUserId();
      if (!viewerId) return jsonResponse(req, { error: "Unauthorized" }, 401, "user.profile", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`profile:ip:${ip}`, 120, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "user.profile", requestId);
        return applyRateLimitHeaders(response, 120, limitResult);
      }

      const { id } = await context.params;
      if (!id) return jsonResponse(req, { error: "Missing id" }, 400, "user.profile", requestId);

      const { searchParams } = new URL(req.url);
      const parsed = paginationSchema.safeParse({ limit: searchParams.get("limit") ?? "50" });
      if (!parsed.success) {
        return jsonResponse(req, { error: "Invalid pagination" }, 400, "user.profile", requestId);
      }
      const oppCursor = decodeCursor(searchParams.get("opportunitiesCursor"));
      const forumCursor = decodeCursor(searchParams.get("forumCursor"));

      const cacheKey = `profile:${viewerId}:${id}:${parsed.data.limit}:${oppCursor?.id ?? "start"}:${forumCursor?.id ?? "start"}`;
      const cached = await getCachedJson<any>(cacheKey);
      if (cached) {
        return jsonResponse(req, cached, 200, "user.profile", requestId);
      }

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          profile: true,
          interests: true,
        },
      });
      if (!user) return jsonResponse(req, { error: "Not found" }, 404, "user.profile", requestId);

      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: id },
            { blockerId: id, blockedId: viewerId },
          ],
        },
      });

      if (block && block.blockerId !== viewerId) {
        return jsonResponse(
          req,
          {
            user: {
              id: user.id,
              email: "",
              profile: { name: user.profile?.name ?? null, username: user.profile?.username ?? null },
              interests: [],
            },
            isFollowing: false,
            isFollowedBy: false,
            followRequestStatus: null,
            followerCount: null,
            followingCount: null,
            mutualFollowers: [],
            opportunities: [],
            forumPosts: [],
            isBlocked: false,
            isBlockedBy: true,
          },
          200,
          "user.profile",
          requestId
        );
      }

    const isFollowing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: id } },
    });
    const isFollowedBy = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: id, followingId: viewerId } },
    });
    const followRequest = await prisma.followRequest.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: id } },
    });

    const isBlocked = Boolean(block && block.blockerId === viewerId);

    const profile = { ...(user.profile ?? {}) } as any;
    let email = user.email;

    if (!isFollowing || isBlocked) {
      if (profile?.hideAgeFromNonFollowers) profile.age = null;
      if (profile?.hideContactFromNonFollowers) {
        profile.phone = null;
        email = "";
        profile.websiteUrl = null;
      }
      if (profile?.hidePhotoFromNonFollowers) {
        profile.imageUrl = null;
        profile.coverPhotoUrl = null;
      }
    }

    const showPosts = Boolean(!isBlocked && (isFollowing || !profile?.hidePostsFromNonFollowers));

      const opportunityCursorFilter = oppCursor
        ? {
            OR: [
              { publishedAt: { lt: new Date(oppCursor.ts) } },
              { publishedAt: new Date(oppCursor.ts), id: { lt: oppCursor.id } },
            ],
          }
        : {};

      const forumCursorFilter = forumCursor
        ? {
            OR: [
              { createdAt: { lt: new Date(forumCursor.ts) } },
              { createdAt: new Date(forumCursor.ts), id: { lt: forumCursor.id } },
            ],
          }
        : {};

      const opportunities = showPosts
        ? await prisma.opportunity.findMany({
            where: { createdByUserId: id, archivedAt: null, ...opportunityCursorFilter },
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            take: parsed.data.limit,
          })
        : [];

      const forumPosts = showPosts
        ? await prisma.forumPost.findMany({
            where: { userId: id, archivedAt: null, ...forumCursorFilter },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: parsed.data.limit,
          })
        : [];

    const followerCountRaw = await prisma.follow.count({ where: { followingId: id } });
    const followingCountRaw = await prisma.follow.count({ where: { followerId: id } });

    const viewerFollowing = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });

    const targetFollowing = await prisma.follow.findMany({
      where: { followerId: id },
      select: { followingId: true },
    });

    const viewerSet = new Set(viewerFollowing.map((f) => f.followingId));
    const mutualIds = targetFollowing
      .map((f) => f.followingId)
      .filter((followId) => viewerSet.has(followId));

    const mutualFollowers = mutualIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mutualIds } },
          select: {
            id: true,
            email: true,
            profile: { select: { name: true, username: true, imageUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const hideFollowerCount = Boolean(profile?.hideFollowerCount);
    const canViewCounts = !hideFollowerCount || viewerId === id;

      const oppLast = opportunities[opportunities.length - 1];
      const forumLast = forumPosts[forumPosts.length - 1];

      const payload = {
      user: {
        id: user.id,
        email,
        profile: user.profile, // keep returning the real profile object shape
        interests: user.interests,
      },
      isFollowing: Boolean(isFollowing),
      isFollowedBy: Boolean(isFollowedBy),
      followRequestStatus: isBlocked ? null : followRequest?.status ?? null,
      followerCount: canViewCounts ? followerCountRaw : null,
      followingCount: canViewCounts ? followingCountRaw : null,
      mutualFollowers,
      opportunities,
      forumPosts,
      opportunitiesNextCursor: oppLast
        ? encodeCursor({ id: oppLast.id, ts: oppLast.publishedAt?.toISOString() ?? new Date().toISOString() })
        : null,
      forumNextCursor: forumLast
        ? encodeCursor({ id: forumLast.id, ts: forumLast.createdAt.toISOString() })
        : null,
      isBlocked,
      isBlockedBy: false,
      };

      await setCachedJson(cacheKey, payload, Number(process.env.PROFILE_CACHE_TTL_SECONDS || 30));
      return jsonResponse(req, payload, 200, "user.profile", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to load user profile");
      return jsonResponse(req, { error: "Failed to load user profile" }, 500, "user.profile", requestId);
    }
  }, req, "user.profile");
}
