import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { resolveRecipient, getBlockedIds, getOrCreateConversation } from "@/lib/messages";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";

async function hasMutualFollow(prisma: any, userId: string, otherUserId: string) {
  const [a, b] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: otherUserId } }, select: { id: true } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: otherUserId, followingId: userId } }, select: { id: true } }),
  ]);
  return Boolean(a && b);
}

export async function GET(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "conversations", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "conversations", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`conversations:ip:${ip}`, 120, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "conversations", requestId);
        return applyRateLimitHeaders(response, 120, limitResult);
      }

      const conversations = await prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              fromUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
              toUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
              opportunity: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 50,
      });

      const results = await Promise.all(
        conversations.map(async (conversation) => {
          const participant = conversation.participants.find((p) => p.userId === userId);
          const partner = conversation.participants.find((p) => p.userId !== userId);
          const lastMessage = conversation.messages[0] ?? null;
          const unreadCount = await prisma.message.count({
            where: {
              conversationId: conversation.id,
              createdAt: { gt: participant?.lastReadAt ?? new Date(0) },
              fromUserId: { not: userId },
            },
          });

          return {
            id: conversation.id,
            partner,
            lastMessage,
            lastMessageAt: conversation.lastMessageAt,
            partnerLastReadAt: partner?.lastReadAt ?? null,
            myLastReadAt: participant?.lastReadAt ?? null,
            unreadCount,
          };
        })
      );

      return jsonResponse(req, { conversations: results }, 200, "conversations", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to load conversations");
      return jsonResponse(req, { error: "Failed to load conversations" }, 500, "conversations", requestId);
    }
  }, req, "conversations");
}

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "conversations.create", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "conversations.create", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`conversations:create:ip:${ip}`, 60, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "conversations.create", requestId);
        return applyRateLimitHeaders(response, 60, limitResult);
      }

      const body = await req.json().catch(() => null);
      const identifier = String(body?.identifier ?? "").trim();
      if (!identifier) {
        return jsonResponse(req, { error: "Recipient required" }, 400, "conversations.create", requestId);
      }

      const recipient = await resolveRecipient(prisma, identifier);
      if (!recipient) {
        return jsonResponse(req, { error: "Recipient not found" }, 404, "conversations.create", requestId);
      }
      if (recipient.id === userId) {
        return jsonResponse(req, { error: "Cannot message yourself" }, 400, "conversations.create", requestId);
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
        return jsonResponse(req, { error: "Conversation unavailable" }, 403, "conversations.create", requestId);
      }

      const mutual = await hasMutualFollow(prisma, userId, recipient.id);
      if (!mutual) return jsonResponse(req, { error: "Follow each other to message" }, 403, "conversations.create", requestId);

      const conversation = await getOrCreateConversation(prisma, userId, recipient.id);
      return jsonResponse(req, { conversationId: conversation.id }, 200, "conversations.create", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to create conversation");
      return jsonResponse(req, { error: "Failed to create conversation" }, 500, "conversations.create", requestId);
    }
  }, req, "conversations.create");
}
