import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { containsProfanity } from "../lib/profanity.js";
import { notifyUser } from "../lib/notify.js";
import { ensureEntitled } from "../lib/subscription.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

async function getOrCreateConversation(userId: string, partnerId: string) {
  const mine = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  const myIds = mine.map((p) => p.conversationId);
  if (myIds.length) {
    const shared = await prisma.conversationParticipant.findFirst({
      where: { conversationId: { in: myIds }, userId: partnerId },
      select: { conversationId: true },
    });
    if (shared) return shared.conversationId;
  }
  const conv = await prisma.conversation.create({
    data: { participants: { create: [{ userId }, { userId: partnerId }] } },
  });
  return conv.id;
}

router.get("/user/conversations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: userId } },
              include: {
                user: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
              },
            },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: "desc" } },
    });

    const conversations = participations.map((p) => ({
      id: p.conversationId,
      partner: p.conversation.participants[0] ?? null,
      lastMessage: p.conversation.messages[0] ?? null,
      lastMessageAt: p.conversation.lastMessageAt,
      myLastReadAt: p.lastReadAt,
    }));
    return res.json({ conversations });
  } catch (e) {
    logger.error({ err: e }, "Conversations GET error");
    return res.status(500).json({ error: "Failed to load conversations" });
  }
});

router.post("/user/conversations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  // Starting a private discussion is a Plus+ entitlement. Existing participants
  // (e.g. a Free user replying to a Plus member) can still read and reply.
  if (
    !(await ensureEntitled(res, userId, (e) => e.privateDiscussions, {
      feature: "privateDiscussions",
      message: "Starting private discussions requires Vertica Plus.",
    }))
  )
    return;
  try {
    const { identifier } = req.body ?? {};
    if (!identifier) return res.status(400).json({ error: "identifier required" });

    const partner = await prisma.user.findFirst({
      where: { OR: [{ id: identifier }, { profile: { username: identifier } }, { email: identifier }] },
      select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } },
    });
    if (!partner) return res.status(404).json({ error: "User not found" });

    const conversationId = await getOrCreateConversation(userId, partner.id);
    return res.json({ conversationId, partner });
  } catch (e) {
    logger.error({ err: e }, "Conversations POST error");
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/user/conversations/:id/messages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { id: conversationId } = req.params;
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    const { cursor, direction = "backward", limit: limitStr } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 30, 50);
    const cursorObj = cursor ? { id: cursor } : undefined;

    const messages = await prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: direction === "forward" ? "asc" : "desc" },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      include: {
        fromUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        toUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        opportunity: { select: { id: true, title: true } },
      },
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, -1) : messages;
    const sorted = direction === "forward" ? data : [...data].reverse();
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return res.json({ messages: sorted, nextCursor, currentUserId: userId });
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

    const { body, opportunityId } = req.body ?? {};
    if (!body?.trim()) return res.status(400).json({ error: "body required" });
    if (containsProfanity(body)) {
      return res.status(400).json({ error: "Your message contains language that isn't allowed. Please revise it." });
    }

    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    const toUserId = others[0]?.userId ?? userId;

    const message = await prisma.message.create({
      data: { fromUserId: userId, toUserId, conversationId, body, opportunityId: opportunityId ?? null },
      include: {
        fromUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        toUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
      },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

    if (toUserId && toUserId !== userId) {
      await notifyUser(prisma, {
        recipientId: toUserId,
        actorId: userId,
        type: "MESSAGE",
        title: "New message",
        body: String(body).slice(0, 140),
        link: "/messages",
        targetType: "MESSAGE",
        targetId: message.id,
        data: { fromUserId: userId, conversationId },
      });
    }

    return res.json({ message });
  } catch (e) {
    logger.error({ err: e }, "Conversation message POST error");
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
