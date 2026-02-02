import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { decodeCursor, encodeCursor, paginationSchema } from "@/lib/pagination";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: { id?: string } }) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "conversation.messages", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "conversation.messages", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`conversation:messages:ip:${ip}`, 120, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "conversation.messages", requestId);
        return applyRateLimitHeaders(response, 120, limitResult);
      }

      const conversationId = params.id;
      if (!conversationId) {
        return jsonResponse(req, { error: "Missing conversation id" }, 400, "conversation.messages", requestId);
      }

      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (!participant) {
        return jsonResponse(req, { error: "Forbidden" }, 403, "conversation.messages", requestId);
      }

      const { searchParams } = new URL(req.url);
      const parsed = paginationSchema.safeParse({
        limit: searchParams.get("limit") ?? undefined,
        cursor: searchParams.get("cursor") ?? undefined,
      });
      if (!parsed.success) {
        return jsonResponse(req, { error: "Invalid pagination" }, 400, "conversation.messages", requestId);
      }

      const direction = searchParams.get("direction") ?? "backward";
      const cursorPayload = decodeCursor(parsed.data.cursor);
      const cursorFilter = cursorPayload
        ? direction === "forward"
          ? {
              OR: [
                { createdAt: { gt: new Date(cursorPayload.ts) } },
                { createdAt: new Date(cursorPayload.ts), id: { gt: cursorPayload.id } },
              ],
            }
          : {
              OR: [
                { createdAt: { lt: new Date(cursorPayload.ts) } },
                { createdAt: new Date(cursorPayload.ts), id: { lt: cursorPayload.id } },
              ],
            }
        : {};

      const messages = await prisma.message.findMany({
        where: { conversationId, ...cursorFilter },
        orderBy: direction === "forward" ? [{ createdAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }],
        take: parsed.data.limit,
        include: {
          fromUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
          toUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
          opportunity: { select: { id: true, title: true } },
        },
      });

      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
      });

      const ordered = direction === "forward" ? messages : [...messages].reverse();
      const cursorSource = direction === "forward" ? ordered[ordered.length - 1] : ordered[0];
      const nextCursor = cursorSource ? encodeCursor({ id: cursorSource.id, ts: cursorSource.createdAt.toISOString() }) : null;

      return jsonResponse(req, { messages: ordered, nextCursor, currentUserId: userId }, 200, "conversation.messages", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to load conversation messages");
      return jsonResponse(req, { error: "Failed to load messages" }, 500, "conversation.messages", requestId);
    }
  }, req, "conversation.messages");
}

export async function POST(req: Request, { params }: { params: { id?: string } }) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "conversation.messages.send", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "conversation.messages.send", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`conversation:send:ip:${ip}`, 60, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "conversation.messages.send", requestId);
        return applyRateLimitHeaders(response, 60, limitResult);
      }

      const conversationId = params.id;
      if (!conversationId) {
        return jsonResponse(req, { error: "Missing conversation id" }, 400, "conversation.messages.send", requestId);
      }

      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        include: { conversation: { include: { participants: true } } },
      });
      if (!participant) {
        return jsonResponse(req, { error: "Forbidden" }, 403, "conversation.messages.send", requestId);
      }

      const body = await req.json().catch(() => null);
      const messageBody = String(body?.body ?? "").trim();
      const opportunityId = body?.opportunityId ? String(body.opportunityId) : null;
      if (!messageBody) {
        return jsonResponse(req, { error: "Message is required" }, 400, "conversation.messages.send", requestId);
      }

      const recipient = participant.conversation.participants.find((p) => p.userId !== userId);
      if (!recipient) {
        return jsonResponse(req, { error: "Recipient unavailable" }, 400, "conversation.messages.send", requestId);
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          fromUserId: userId,
          toUserId: recipient.userId,
          body: messageBody,
          opportunityId,
        },
        include: {
          fromUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
          toUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
          opportunity: { select: { id: true, title: true } },
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });

      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: message.createdAt },
      });

      await prisma.notification.create({
        data: {
          userId: recipient.userId,
          type: "MESSAGE",
          data: { fromUserId: userId, opportunityId: opportunityId ?? undefined, conversationId },
        },
      });

      return jsonResponse(req, { message }, 200, "conversation.messages.send", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to send message");
      return jsonResponse(req, { error: "Failed to send message" }, 500, "conversation.messages.send", requestId);
    }
  }, req, "conversation.messages.send");
}
