import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { paginationSchema } from "@/lib/pagination";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "user.search", requestId);

      const viewerId = await requireUserId();
      if (!viewerId) return jsonResponse(req, { error: "Unauthorized" }, 401, "user.search", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`search:ip:${ip}`, 60, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "user.search", requestId);
        return applyRateLimitHeaders(response, 60, limitResult);
      }

      const { searchParams } = new URL(req.url);
      const raw = (searchParams.get("q") ?? "").trim();
      const parsed = paginationSchema.safeParse({ limit: searchParams.get("limit") ?? "25" });
      if (!parsed.success) {
        return jsonResponse(req, { error: "Invalid pagination" }, 400, "user.search", requestId);
      }
      if (!raw) return jsonResponse(req, { users: [] }, 200, "user.search", requestId);

      const [blocked, blockedBy] = await Promise.all([
        prisma.block.findMany({ where: { blockerId: viewerId }, select: { blockedId: true } }),
        prisma.block.findMany({ where: { blockedId: viewerId }, select: { blockerId: true } }),
      ]);
      const blockedIds = blocked.map((item) => item.blockedId);
      const blockedByIds = blockedBy.map((item) => item.blockerId);

      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { email: { contains: raw, mode: "insensitive" } },
                { profile: { username: { contains: raw, mode: "insensitive" } } },
              ],
            },
            { id: { notIn: [...blockedIds, ...blockedByIds, viewerId] } },
          ],
        },
        select: {
          id: true,
          email: true,
          profile: { select: { name: true, username: true, imageUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: parsed.data.limit,
      });

      const userIds = users.map((user) => user.id);
      const [follows, requests] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: userIds } },
          select: { followingId: true },
        }),
        prisma.followRequest.findMany({
          where: { followerId: viewerId, followingId: { in: userIds }, status: "PENDING" },
          select: { followingId: true, status: true },
        }),
      ]);

      const followingSet = new Set(follows.map((item) => item.followingId));
      const requestMap = new Map(requests.map((item) => [item.followingId, item.status]));

      const enriched = users.map((user) => ({
        ...user,
        isFollowing: followingSet.has(user.id),
        followRequestStatus: requestMap.get(user.id) ?? null,
      }));

      return jsonResponse(req, { users: enriched }, 200, "user.search", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to search users");
      return jsonResponse(req, { error: "Failed to search users" }, 500, "user.search", requestId);
    }
  }, req, "user.search");
}
