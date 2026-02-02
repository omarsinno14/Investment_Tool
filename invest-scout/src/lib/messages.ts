import { getPrismaClient } from "@/lib/db";

function normalize(value: string) {
  return value.trim();
}

export async function resolveRecipient(prisma: ReturnType<typeof getPrismaClient>, identifier: string) {
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

export async function getBlockedIds(prisma: ReturnType<typeof getPrismaClient>, userId: string) {
  const [blocked, blockedBy] = await Promise.all([
    prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    prisma.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
  ]);
  return {
    blockedIds: blocked.map((item) => item.blockedId),
    blockedByIds: blockedBy.map((item) => item.blockerId),
  };
}

export async function getOrCreateConversation(prisma: ReturnType<typeof getPrismaClient>, userId: string, partnerId: string) {
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: partnerId } } },
      ],
    },
    include: { participants: true },
  });

  if (existing && existing.participants.length >= 2) {
    return existing;
  }

  return prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: partnerId }],
      },
    },
    include: { participants: true },
  });
}
