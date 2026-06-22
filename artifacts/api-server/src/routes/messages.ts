import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { containsProfanity } from "../lib/profanity.js";
import { notifyUser } from "../lib/notify.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

async function getOrCreateConversation(userId: string, partnerId: string) {
  const existing = await prisma.conversationParticipant.findFirst({
    where: { userId },
    include: {
      conversation: {
        include: { participants: { where: { userId: partnerId } } },
      },
    },
  });

  if (existing?.conversation?.participants?.length) {
    return existing.conversation;
  }

  return prisma.conversation.create({
    data: {
      participants: { create: [{ userId }, { userId: partnerId }] },
    },
  });
}

router.get("/user/messages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { partner } = req.query as Record<string, string>;

    if (partner) {
      const partnerUser = await prisma.user.findFirst({
        where: { OR: [{ id: partner }, { profile: { username: partner } }] },
        select: { id: true },
      });
      if (!partnerUser) return res.status(404).json({ error: "User not found" });

      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: partnerUser.id },
            { fromUserId: partnerUser.id, toUserId: userId },
          ],
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      return res.json({ messages });
    }

    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { lastMessageAt: "desc" },
      take: 30,
      include: {
        participants: {
          where: { userId: { not: userId } },
          include: { user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } } },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return res.json({ conversations });
  } catch (e) {
    logger.error({ err: e }, "Messages GET error");
    return res.status(500).json({ error: "Failed to load messages" });
  }
});

router.post("/user/messages", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { toUserId, body, opportunityId } = req.body ?? {};
    if (!toUserId || !body) return res.status(400).json({ error: "toUserId and body required" });
    if (containsProfanity(body)) {
      return res.status(400).json({ error: "Your message contains language that isn't allowed. Please revise it." });
    }

    const conversation = await getOrCreateConversation(userId, toUserId);

    const message = await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId,
        conversationId: conversation.id,
        body,
        opportunityId: opportunityId ?? null,
      },
    });

    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

    await notifyUser(prisma, {
      recipientId: toUserId,
      actorId: userId,
      type: "MESSAGE",
      title: "New message",
      body: String(body).slice(0, 140),
      link: "/messages",
      targetType: "MESSAGE",
      targetId: message.id,
      data: { fromUserId: userId, conversationId: conversation.id },
    });

    return res.json({ message });
  } catch (e) {
    logger.error({ err: e }, "Messages POST error");
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
