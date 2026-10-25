import { prisma } from "./db.js";

/** Public user shape for chat payloads. Never includes email. */
export const chatUserSelect = {
  id: true,
  profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } },
} as const;

export const messageInclude = {
  fromUser: { select: chatUserSelect },
  opportunity: { select: { id: true, title: true } },
} as const;

export const MAX_MESSAGE_LENGTH = 4000;

/** Blank out the body of soft-deleted messages before they leave the server. */
export function serializeMessage<T extends { body: string; deletedAt: Date | null }>(message: T): T {
  return message.deletedAt ? { ...message, body: "" } : message;
}

/** Resolve a user by id or username (never by email, to prevent enumeration). */
export async function findActiveUser(identifier: string) {
  const value = String(identifier).trim().replace(/^@/, "");
  if (!value) return null;
  return prisma.user.findFirst({
    where: {
      deactivatedAt: null,
      OR: [{ id: value }, { profile: { username: { equals: value, mode: "insensitive" } } }],
    },
    select: chatUserSelect,
  });
}

/** True when either user has blocked the other. */
export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return !!block;
}

/** Find the existing 1:1 conversation between two users, if any. */
export async function findDirectConversation(userId: string, partnerId: string): Promise<string | null> {
  const shared = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: partnerId } } },
        { participants: { every: { userId: { in: [userId, partnerId] } } } },
      ],
    },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    select: { id: true },
  });
  return shared?.id ?? null;
}

export async function createDirectConversation(userId: string, partnerId: string): Promise<string> {
  const conv = await prisma.conversation.create({
    data: { participants: { create: [{ userId }, { userId: partnerId }] } },
    select: { id: true },
  });
  return conv.id;
}

/** Unread message counts per conversation for a user, in one query. */
export async function unreadCountsByConversation(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ conversationId: string; count: bigint }[]>`
    SELECT m."conversationId", COUNT(*)::bigint AS count
    FROM "Message" m
    JOIN "ConversationParticipant" p
      ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."fromUserId" <> ${userId}
      AND m."deletedAt" IS NULL
      AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
    GROUP BY m."conversationId"
  `;
  return new Map(rows.map((r) => [r.conversationId, Number(r.count)]));
}
