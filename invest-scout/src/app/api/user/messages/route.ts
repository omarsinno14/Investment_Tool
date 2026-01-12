import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

function normalize(value: string) {
  return value.trim();
}

async function resolveRecipient(prisma: ReturnType<typeof getPrismaClient>, identifier: string) {
  const cleaned = normalize(identifier);
  if (!cleaned) return null;

  if (cleaned.includes("@")) {
    return prisma?.user.findUnique({ where: { email: cleaned.toLowerCase() } });
  }

  const digits = cleaned.replace(/[^\d+]/g, "");
  if (digits.length >= 7) {
    return prisma?.user.findFirst({
      where: { profile: { phone: digits } },
    });
  }

  return prisma?.user.findFirst({
    where: { profile: { username: cleaned } },
  });
}

async function getBlockedIds(prisma: ReturnType<typeof getPrismaClient>, userId: string) {
  const [blocked, blockedBy] = await Promise.all([
    prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    prisma.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
  ]);
  return {
    blockedIds: blocked.map((item) => item.blockedId),
    blockedByIds: blockedBy.map((item) => item.blockerId),
  };
}

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const partner = searchParams.get("partner");
    const { blockedIds, blockedByIds } = await getBlockedIds(prisma, userId);
    const blockedSet = new Set([...blockedIds, ...blockedByIds]);

    if (partner) {
      const recipient = await resolveRecipient(prisma, partner);
      if (!recipient) return NextResponse.json({ messages: [] });
      if (blockedSet.has(recipient.id)) {
        return NextResponse.json({ error: "Conversation unavailable" }, { status: 403 });
      }

      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: recipient.id },
            { fromUserId: recipient.id, toUserId: userId },
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

      return NextResponse.json({ messages, currentUserId: userId });
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

    return NextResponse.json({ messages, currentUserId: userId });
  } catch (e) {
    console.error("Failed to load messages", e);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const identifier = normalize(String(body.identifier ?? ""));
    const messageBody = normalize(String(body.body ?? ""));
    const opportunityId = body.opportunityId ? String(body.opportunityId) : null;

    if (!identifier || !messageBody) {
      return NextResponse.json({ error: "Recipient and message are required" }, { status: 400 });
    }

    const recipient = await resolveRecipient(prisma, identifier);
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }
    if (recipient.id === userId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
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
      return NextResponse.json({ error: "Unable to message this user" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
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

    await prisma.notification.create({
      data: {
        userId: recipient.id,
        type: "MESSAGE",
        data: { fromUserId: userId, opportunityId: opportunityId ?? undefined },
      },
    });

    return NextResponse.json({ message });
  } catch (e) {
    console.error("Failed to send message", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
