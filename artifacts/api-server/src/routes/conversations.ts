import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { containsProfanity } from "../lib/profanity.js";
import { notifyUser } from "../lib/notify.js";
import { ensureEntitled } from "../lib/subscription.js";
import {
  MAX_MESSAGE_LENGTH,
  chatUserSelect,
  createDirectConversation,
  findActiveUser,
  findDirectConversation,
  isBlockedEitherWay,
  messageInclude,
  serializeMessage,
  unreadCountsByConversation,
} from "../lib/chat.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

router.get("/user/conversations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const [participations, unread] = await Promise.all([
      prisma.conversationParticipant.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              participants: {
                where: { userId: { not: userId } },
                select: { userId: true, lastReadAt: true, user: { select: chatUserSelect } },
              },
              messages: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
        orderBy: { conversation: { lastMessageAt: { sort: "desc", nulls: "last" } } },
        take: 100,
      }),
      unreadCountsByConversation(userId),
    ]);

    const conversations = participations.map((p) => {
      const partner = p.conversation.participants[0] ?? null;
      const last = p.conversation.messages[0];
      return {
        id: p.conversationId,
        partner: partner ? { user: partner.user } : null,
        lastMessage: last ? serializeMessage(last) : null,
        lastMessageAt: p.conversation.lastMessageAt ?? p.conversation.createdAt,
        myLastReadAt: p.lastReadAt,
        partnerLastReadAt: partner?.lastReadAt ?? null,
        unreadCount: unread.get(p.conversationId) ?? 0,
      };
    });
    return res.json({ conversations, currentUserId: userId });
  } catch (e) {
    logger.error({ err: e }, "Conversations GET error");
    return res.status(500).json({ error: "Failed to load conversations" });
  }
});

router.post("/user/conversations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { identifier } = req.body ?? {};
    if (!identifier) return res.status(400).json({ error: "identifier required" });

    const partner = await findActiveUser(String(identifier));
    if (!partner) return res.status(404).json({ error: "User not found" });
    if (partner.id === userId) return res.status(400).json({ error: "You cannot message yourself" });
    if (await isBlockedEitherWay(userId, partner.id)) {
      return res.status(403).json({ error: "You can't message this member" });
    }

    // Re-opening an existing thread is always allowed (a Free member can keep
    // replying). Only starting a brand-new private discussion is a Plus+ perk.
    const existing = await findDirectConversation(userId, partner.id);
    if (existing) return res.json({ conversationId: existing, partner, created: false });

    if (
      !(await ensureEntitled(res, userId, (e) => e.privateDiscussions, {
        feature: "privateDiscussions",
        message: "Starting private discussions requires Vertica Plus.",
      }))
    )
      return;

    const conversationId = await createDirectConversation(userId, partner.id);
    return res.json({ conversationId, partner, created: true });
  } catch (e) {
    logger.error({ err: e }, "Conversations POST error");
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

/**
 * GET /user/conversations/:id/messages
 * - default: the newest `limit` messages (ascending), plus `nextCursor` to page older
 * - `?before=<messageId>` (or legacy `cursor` + direction=backward): older page
 * - `?after=<messageId>`: everything newer than that message (used for polling)
 */
router.get("/user/conversations/:id/messages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { id: conversationId } = req.params;
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    const q = req.query as Record<string, string>;
    const limit = Math.min(Number(q.limit) || 30, 100);
    const after = q.after || (q.direction === "forward" ? q.cursor : undefined);
    const before = q.before || (q.direction !== "forward" ? q.cursor : undefined);

    let data;
    let nextCursor: string | null = null;

    if (after) {
      const anchor = await prisma.message.findFirst({
        where: { id: after, conversationId },
        select: { createdAt: true },
      });
      data = anchor
        ? await prisma.message.findMany({
            where: { conversationId, createdAt: { gt: anchor.createdAt } },
            orderBy: { createdAt: "asc" },
            take: 100,
            include: messageInclude,
          })
        : [];
    } else {
      const anchor = before
        ? await prisma.message.findFirst({ where: { id: before, conversationId }, select: { createdAt: true } })
        : null;
      const page = await prisma.message.findMany({
        where: { conversationId, ...(anchor ? { createdAt: { lt: anchor.createdAt } } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        include: messageInclude,
      });
      const hasMore = page.length > limit;
      const trimmed = hasMore ? page.slice(0, limit) : page;
      nextCursor = hasMore ? trimmed[trimmed.length - 1]!.id : null;
      data = trimmed.reverse();
    }

    // Opening/polling a thread marks it read.
    const hasIncoming = data.some((m) => m.fromUserId !== userId);
    if (hasIncoming || !participant.lastReadAt) {
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
      });
    }

    const partner = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      select: { lastReadAt: true },
    });

    return res.json({
      messages: data.map(serializeMessage),
      nextCursor,
      currentUserId: userId,
      partnerLastReadAt: partner?.lastReadAt ?? null,
    });
  } catch (e) {
    logger.error({ err: e }, "Conversation messages GET error");
    return res.status(500).json({ error: "Failed to load messages" });
  }
});

router.post("/user/conversations/:id/messages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { id: conversationId } = req.params;
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    const { body: rawBody, opportunityId } = req.body ?? {};
    const body = typeof rawBody === "string" ? rawBody.trim() : "";
    if (!body) return res.status(400).json({ error: "body required" });
    if (body.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` });
    }
    if (containsProfanity(body)) {
      return res.status(400).json({ error: "Your message contains language that isn't allowed. Please revise it." });
    }

    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    const toUserId = others[0]?.userId;
    if (!toUserId) return res.status(400).json({ error: "This conversation has no other participant" });
    if (await isBlockedEitherWay(userId, toUserId)) {
      return res.status(403).json({ error: "You can't message this member" });
    }

    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { fromUserId: userId, toUserId, conversationId, body, opportunityId: opportunityId ?? null },
        include: messageInclude,
      }),
      prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
      prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: now },
      }),
    ]);

    void notifyUser(prisma, {
      recipientId: toUserId,
      actorId: userId,
      type: "MESSAGE",
      title: "New message",
      body: body.slice(0, 140),
      link: `/messages?c=${conversationId}`,
      targetType: "MESSAGE",
      targetId: message.id,
      data: { fromUserId: userId, conversationId },
    });

    return res.json({ message });
  } catch (e) {
    logger.error({ err: e }, "Conversation message POST error");
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
