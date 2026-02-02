import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getBlockedIds, getOrCreateConversation, resolveRecipient } from "@/lib/messages";

function normalize(value: string) {
  return value.trim();
}

export async function GET(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "messages", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "messages", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`messages:ip:${ip}`, 120, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "messages", requestId);
        return applyRateLimitHeaders(response, 120, limitResult);
      }

      const { searchParams } = new URL(req.url);
      const partner = searchParams.get("partner");
      const { blockedIds, blockedByIds } = await getBlockedIds(prisma, userId);
      const blockedSet = new Set([...blockedIds, ...blockedByIds]);

      if (partner) {
        const recipient = await resolveRecipient(prisma, partner);
        if (!recipient) return jsonResponse(req, { messages: [] }, 200, "messages", requestId);
        if (blockedSet.has(recipient.id)) {
          return jsonResponse(req, { error: "Conversation unavailable" }, 403, "messages", requestId);
        }

        const conversation = await getOrCreateConversation(prisma, userId, recipient.id);
        const messages = await prisma.message.findMany({
          where: {
            OR: [
              { conversationId: conversation.id },
              {
                conversationId: null,
                OR: [
                  { fromUserId: userId, toUserId: recipient.id },
                  { fromUserId: recipient.id, toUserId: userId },
                ],
              },
            ],
          },
          orderBy: { createdAt: "asc" },
          take: 200,
          include: {
            fromUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
            toUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
            opportunity: { select: { id: true, title: true } },
          },
        });

        return jsonResponse(req, { messages, currentUserId: userId, conversationId: conversation.id }, 200, "messages", requestId);
      }

      const messages = await prisma.message.findMany({
        where: {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
          NOT: [
            { fromUserId: { in: blockedIds.length ? blockedIds : [""] } },
            { toUserId: { in: blockedIds.length ? blockedIds : [""] } },
            { fromUserId: { in: blockedByIds.length ? blockedByIds : [""] } },
            { toUserId: { in: blockedByIds.length ? blockedByIds : [""] } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          fromUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
          toUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
          opportunity: { select: { id: true, title: true } },
        },
      });

      return jsonResponse(req, { messages, currentUserId: userId }, 200, "messages", requestId);
    } catch (e) {
      logger.error({ err: e }, "Failed to load messages");
      return jsonResponse(req, { error: "Failed to load messages" }, 500, "messages", requestId);
    }
  }, req, "messages");
}

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "messages.send", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "messages.send", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`messages:send:ip:${ip}`, 60, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "messages.send", requestId);
        return applyRateLimitHeaders(response, 60, limitResult);
      }

      const body = await req.json().catch(() => null);
      if (!body) return jsonResponse(req, { error: "Invalid payload" }, 400, "messages.send", requestId);

      const identifier = normalize(String(body.identifier ?? ""));
      const messageBody = normalize(String(body.body ?? ""));
      const opportunityId = body.opportunityId ? String(body.opportunityId) : null;

      if (!identifier || !messageBody) {
        return jsonResponse(req, { error: "Recipient and message are required" }, 400, "messages.send", requestId);
      }

      const recipient = await resolveRecipient(prisma, identifier);
      if (!recipient) {
        return jsonResponse(req, { error: "Recipient not found" }, 404, "messages.send", requestId);
      }
      if (recipient.id === userId) {
        return jsonResponse(req, { error: "Cannot message yourself" }, 400, "messages.send", requestId);
      }
      const blocked = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: recipient.id },
            { blockerId: recipient.id, blockedId: userId },
          ],
        },
      });
      if (blocked) {
        return jsonResponse(req, { error: "Unable to message this user" }, 403, "messages.send", requestId);
      }

      const conversation = await getOrCreateConversation(prisma, userId, recipient.id);
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          fromUserId: userId,
          toUserId: recipient.id,
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
        where: { id: conversation.id },
        data: { lastMessageAt: message.createdAt },
      });

      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        data: { lastReadAt: message.createdAt },
      });

      await prisma.notification.create({
        data: {
          userId: recipient.id,
          type: "MESSAGE",
          data: { fromUserId: userId, opportunityId: opportunityId ?? undefined, conversationId: conversation.id },
        },
      });

      return jsonResponse(req, { message, conversationId: conversation.id }, 200, "messages.send", requestId);
    } catch (e) {
      logger.error({ err: e }, "Failed to send message");
      return jsonResponse(req, { error: "Failed to send message" }, 500, "messages.send", requestId);
    }
  }, req, "messages.send");
}
