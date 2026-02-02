import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { sanitizeProfanity } from "@/lib/profanity";
import { decodeCursor, encodeCursor, paginationSchema } from "@/lib/pagination";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { MAX_COMMENT_LENGTH } from "@/lib/uploads";

export async function GET(req: Request, { params }: { params: { id?: string } }) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "forum.comments", requestId);
      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "forum.comments", requestId);

      const id = params.id;
      if (!id) return jsonResponse(req, { error: "Missing id" }, 400, "forum.comments", requestId);

      const { searchParams } = new URL(req.url);
      const parsed = paginationSchema.safeParse({
        limit: searchParams.get("limit") ?? undefined,
        cursor: searchParams.get("cursor") ?? undefined,
      });
      if (!parsed.success) {
        return jsonResponse(req, { error: "Invalid pagination" }, 400, "forum.comments", requestId);
      }

      const cursorPayload = decodeCursor(parsed.data.cursor);
      const cursorFilter = cursorPayload
        ? {
            OR: [
              { createdAt: { gt: new Date(cursorPayload.ts) } },
              { createdAt: new Date(cursorPayload.ts), id: { gt: cursorPayload.id } },
            ],
          }
        : {};

      const comments = await prisma.forumComment.findMany({
        where: { postId: id, ...cursorFilter },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: parsed.data.limit,
        include: {
          user: { select: { email: true, profile: { select: { name: true, username: true } } } },
        },
      });

      const last = comments[comments.length - 1];
      const nextCursor = last ? encodeCursor({ id: last.id, ts: last.createdAt.toISOString() }) : undefined;

      return jsonResponse(req, { comments, nextCursor }, 200, "forum.comments", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to load forum comments");
      return jsonResponse(req, { error: "Failed to load forum comments" }, 500, "forum.comments", requestId);
    }
  }, req, "forum.comments");
}

export async function POST(req: Request, { params }: { params: { id?: string } }) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "forum.comment.create", requestId);
      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "forum.comment.create", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`forum:comment:ip:${ip}`, 60, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "forum.comment.create", requestId);
        return applyRateLimitHeaders(response, 60, limitResult);
      }

      const id = params.id;
      if (!id) return jsonResponse(req, { error: "Missing id" }, 400, "forum.comment.create", requestId);

      const body = await req.json().catch(() => null);
      if (!body?.body)
        return jsonResponse(req, { error: "Comment is required" }, 400, "forum.comment.create", requestId);
      const content = sanitizeProfanity(String(body.body).trim());
      if (content.length > MAX_COMMENT_LENGTH) {
        return jsonResponse(req, { error: "Comment too long" }, 400, "forum.comment.create", requestId);
      }

      const comment = await prisma.forumComment.create({
        data: {
          postId: id,
          userId,
          body: content,
        },
      });

      const post = await prisma.forumPost.findUnique({ where: { id }, select: { userId: true } });
      if (post?.userId && post.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: post.userId,
            type: "FORUM_COMMENT",
            data: { postId: id, fromUserId: userId },
          },
        });
      }

      return jsonResponse(req, { comment }, 200, "forum.comment.create", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to create forum comment");
      return jsonResponse(req, { error: "Failed to create forum comment" }, 500, "forum.comment.create", requestId);
    }
  }, req, "forum.comment.create");
}
