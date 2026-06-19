import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { checkIdempotency } from "@/lib/idempotency";

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "follow", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "follow", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`follow:ip:${ip}`, 60, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "follow", requestId);
        return applyRateLimitHeaders(response, 60, limitResult);
      }

      const idempotencyKey = req.headers.get("idempotency-key");
      if (idempotencyKey) {
        const ok = await checkIdempotency(`follow:${userId}:${idempotencyKey}`, 300);
        if (!ok) {
          return jsonResponse(req, { error: "Duplicate request" }, 409, "follow", requestId);
        }
      }

      const body = await req.json().catch(() => null);
      if (!body?.userId) return jsonResponse(req, { error: "Missing userId" }, 400, "follow", requestId);

      const targetId = String(body.userId);
      if (targetId === userId) {
        return jsonResponse(req, { error: "Cannot follow yourself" }, 400, "follow", requestId);
      }

      const blocked = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: targetId },
            { blockerId: targetId, blockedId: userId },
          ],
        },
      });
      if (blocked) {
        return jsonResponse(req, { error: "Unable to follow this user" }, 403, "follow", requestId);
      }

      const existing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      });

      const existingRequest = await prisma.followRequest.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      });

      if (existing) {
        await prisma.follow.delete({
          where: { followerId_followingId: { followerId: userId, followingId: targetId } },
        });
        return jsonResponse(req, { following: false, followRequestStatus: null }, 200, "follow", requestId);
      }

      if (existingRequest) {
        await prisma.followRequest.delete({
          where: { followerId_followingId: { followerId: userId, followingId: targetId } },
        });
        return jsonResponse(req, { following: false, followRequestStatus: null }, 200, "follow", requestId);
      }

      const request = await prisma.followRequest.create({
        data: {
          followerId: userId,
          followingId: targetId,
        },
      });
      await prisma.notification.create({
        data: {
          userId: targetId,
          type: "FOLLOW_REQUEST",
          data: { requestId: request.id, fromUserId: userId },
        },
      });
      return jsonResponse(req, { following: false, followRequestStatus: request.status }, 200, "follow", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to update follow");
      return jsonResponse(req, { error: "Failed to update follow" }, 500, "follow", requestId);
    }
  }, req, "follow");
}
