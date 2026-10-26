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

router.get("/user/messages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { partner } = req.query as Record<string, string>;

    if (partner) {
      const partnerUser = await findActiveUser(partner);
      if (!partnerUser) return res.status(404).json({ error: "User not found" });

      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: partnerUser.id },
            { fromUserId: partnerUser.id, toUserId: userId },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: messageInclude,
      });
      return res.json({ messages: messages.reverse().map(serializeMessage), currentUserId: userId });
    }

    const [conversations, unread] = await Promise.all([
      prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
        take: 30,
        include: {
          participants: {
            where: { userId: { not: userId } },
            select: { userId: true, user: { select: chatUserSelect } },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      unreadCountsByConversation(userId),
    ]);
    return res.json({
      conversations: conversations.map((c) => ({
        ...c,
        messages: c.messages.map(serializeMessage),
        unreadCount: unread.get(c.id) ?? 0,
      })),
      currentUserId: userId,
    });
  } catch (e) {
    logger.error({ err: e }, "Messages GET error");
    return res.status(500).json({ error: "Failed to load messages" });
  }
});

/**
 * POST /user/messages — send a direct message by recipient id or username
 * (`toUserId` or `identifier`). Used by group broadcast and share flows.
 */
router.post("/user/messages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { toUserId: rawTo, identifier, body: rawBody, opportunityId } = req.body ?? {};
    const body = typeof rawBody === "string" ? rawBody.trim() : "";
    const target = rawTo || identifier;
    if (!target || !body) return res.status(400).json({ error: "Recipient and body required" });
    if (body.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` });
    }
    if (containsProfanity(body)) {
      return res.status(400).json({ error: "Your message contains language that isn't allowed. Please revise it." });
    }

    const recipient = await findActiveUser(String(target));
    if (!recipient) return res.status(404).json({ error: "User not found" });
    if (recipient.id === userId) return res.status(400).json({ error: "You cannot message yourself" });
    if (await isBlockedEitherWay(userId, recipient.id)) {
      return res.status(403).json({ error: "You can't message this member" });
    }

    let conversationId = await findDirectConversation(userId, recipient.id);
    if (!conversationId) {
      if (
        !(await ensureEntitled(res, userId, (e) => e.privateDiscussions, {
          feature: "privateDiscussions",
          message: "Starting private discussions requires Vertica Plus.",
        }))
      )
        return;
      conversationId = await createDirectConversation(userId, recipient.id);
    }

    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          fromUserId: userId,
          toUserId: recipient.id,
          conversationId,
          body,
          opportunityId: opportunityId ?? null,
        },
        include: messageInclude,
      }),
      prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    ]);

    void notifyUser(prisma, {
      recipientId: recipient.id,
      actorId: userId,
      type: "MESSAGE",
      title: "New message",
      body: body.slice(0, 140),
      link: `/messages?c=${conversationId}`,
      targetType: "MESSAGE",
      targetId: message.id,
      data: { fromUserId: userId, conversationId },
    });

    return res.json({ message, conversationId });
  } catch (e) {
    logger.error({ err: e }, "Messages POST error");
    return res.status(500).json({ error: "Failed to send message" });
  }
});

/** PATCH /user/messages/:id — edit your own message. */
router.patch("/user/messages/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body) return res.status(400).json({ error: "Message cannot be empty" });
    if (body.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` });
    }
    if (containsProfanity(body)) {
      return res.status(400).json({ error: "Your message contains language that isn't allowed. Please revise it." });
    }
    const existing = await prisma.message.findFirst({
      where: { id: req.params.id, fromUserId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: "Message not found" });

    const message = await prisma.message.update({
      where: { id: existing.id },
      data: { body, editedAt: new Date() },
      include: messageInclude,
    });
    return res.json({ message });
  } catch (e) {
    logger.error({ err: e }, "Message PATCH error");
    return res.status(500).json({ error: "Failed to edit message" });
  }
});

/** DELETE /user/messages/:id — unsend (soft delete) your own message. */
router.delete("/user/messages/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const result = await prisma.message.updateMany({
      where: { id: req.params.id, fromUserId: userId, deletedAt: null },
      data: { deletedAt: new Date(), body: "" },
    });
    if (result.count === 0) return res.status(404).json({ error: "Message not found" });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Message DELETE error");
    return res.status(500).json({ error: "Failed to remove message" });
  }
});

/** GET /user/mutuals?identifier= — whether you and that member follow each other. */
router.get("/user/mutuals", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const identifier = String((req.query as Record<string, string>).identifier ?? "");
    if (!identifier) {
      // No identifier: list all mutual followers.
      const follows = await prisma.follow.findMany({
        where: { followerId: userId, following: { following: { some: { followingId: userId } } } },
        select: { following: { select: chatUserSelect } },
        take: 200,
      });
      return res.json({ users: follows.map((f) => f.following) });
    }
    const other = await findActiveUser(identifier);
    if (!other) return res.json({ mutual: false });
    const [a, b] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: other.id } },
        select: { id: true },
      }),
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: other.id, followingId: userId } },
        select: { id: true },
      }),
    ]);
    return res.json({ mutual: !!a && !!b, user: other });
  } catch (e) {
    logger.error({ err: e }, "Mutuals GET error");
    return res.status(500).json({ error: "Failed to check mutual follow" });
  }
});

/** GET /user/badge-counts — lightweight unread counts for navigation badges. */
router.get("/user/badge-counts", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const [unread, notifications, followRequests] = await Promise.all([
      unreadCountsByConversation(userId),
      prisma.notification.count({ where: { userId, readAt: null, type: { not: "MESSAGE" } } }),
      prisma.followRequest.count({ where: { followingId: userId, status: "PENDING" } }),
    ]);
    let messages = 0;
    for (const n of unread.values()) messages += n;
    return res.json({ messages, notifications, followRequests });
  } catch (e) {
    logger.error({ err: e }, "Badge counts error");
    return res.status(500).json({ error: "Failed to load badge counts" });
  }
});

export default router;
