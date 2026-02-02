import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(req: Request, { params }: { params: { id?: string } }) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "forum.reaction", requestId);
      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "forum.reaction", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`forum:reaction:ip:${ip}`, 120, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "forum.reaction", requestId);
        return applyRateLimitHeaders(response, 120, limitResult);
      }

      const id = params.id;
      if (!id) return jsonResponse(req, { error: "Missing id" }, 400, "forum.reaction", requestId);

      const body = await req.json().catch(() => null);
      const type = body?.type;
      if (!type) return jsonResponse(req, { error: "Missing reaction type" }, 400, "forum.reaction", requestId);
      const allowed = ["LIKE", "INSIGHTFUL", "CURIOUS"];
      if (!allowed.includes(type)) {
        return jsonResponse(req, { error: "Invalid reaction type" }, 400, "forum.reaction", requestId);
      }

      const existing = await prisma.forumReaction.findUnique({
        where: { postId_userId_type: { postId: id, userId, type } },
      });

      if (existing) {
        await prisma.forumReaction.delete({
          where: { postId_userId_type: { postId: id, userId, type } },
        });
        return jsonResponse(req, { reacted: false }, 200, "forum.reaction", requestId);
      }

      const reaction = await prisma.forumReaction.create({
        data: {
          postId: id,
          userId,
          type,
        },
      });
      const post = await prisma.forumPost.findUnique({ where: { id }, select: { userId: true } });
      if (post?.userId && post.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: post.userId,
            type: "FORUM_REACTION",
            data: { postId: id, fromUserId: userId, reaction: reaction.type },
          },
        });
      }
      return jsonResponse(req, { reacted: true }, 200, "forum.reaction", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to update forum reaction");
      return jsonResponse(req, { error: "Failed to update forum reaction" }, 500, "forum.reaction", requestId);
    }
  }, req, "forum.reaction");
}
