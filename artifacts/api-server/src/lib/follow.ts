import { prisma } from "./db.js";
import { notifyUser } from "./notify.js";
import { isBlockedEitherWay } from "./chat.js";

export type FollowToggleResult =
  | { ok: true; following: boolean; followRequestStatus: "PENDING" | null; isFollowedBy?: boolean }
  | { ok: false; status: number; error: string };

/**
 * Toggle a follow from `userId` to `targetId`, honouring blocks and the
 * target's follow-approval setting:
 * - already following → unfollow
 * - pending request → cancel it
 * - target requires approval → create a pending request
 * - otherwise → follow
 */
export async function toggleFollow(userId: string, targetId: string): Promise<FollowToggleResult> {
  if (!targetId) return { ok: false, status: 400, error: "userId required" };
  if (targetId === userId) return { ok: false, status: 400, error: "Cannot follow yourself" };

  const target = await prisma.user.findFirst({
    where: { id: targetId, deactivatedAt: null },
    select: { id: true, profile: { select: { requiresFollowApproval: true } } },
  });
  if (!target) return { ok: false, status: 404, error: "User not found" };

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    select: { id: true },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return { ok: true, following: false, followRequestStatus: null };
  }

  const pending = await prisma.followRequest.findFirst({
    where: { followerId: userId, followingId: targetId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) {
    await prisma.followRequest.delete({ where: { id: pending.id } });
    return { ok: true, following: false, followRequestStatus: null };
  }

  if (await isBlockedEitherWay(userId, targetId)) {
    return { ok: false, status: 403, error: "You can't follow this member" };
  }

  if (target.profile?.requiresFollowApproval) {
    await prisma.followRequest.upsert({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      create: { followerId: userId, followingId: targetId, status: "PENDING" },
      update: { status: "PENDING" },
    });
    void notifyUser(prisma, {
      recipientId: targetId,
      actorId: userId,
      type: "FOLLOW_REQUEST",
      title: "New follow request",
      link: `/users/${userId}`,
      targetType: "USER",
      targetId: userId,
      data: { fromUserId: userId },
    });
    return { ok: true, following: false, followRequestStatus: "PENDING" };
  }

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    create: { followerId: userId, followingId: targetId },
    update: {},
  });
  void notifyUser(prisma, {
    recipientId: targetId,
    actorId: userId,
    type: "FOLLOW_ACCEPTED",
    title: "You have a new follower",
    link: `/users/${userId}`,
    targetType: "USER",
    targetId: userId,
    data: { fromUserId: userId },
  });
  const isFollowedBy = !!(await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: targetId, followingId: userId } },
    select: { id: true },
  }));
  return { ok: true, following: true, followRequestStatus: null, isFollowedBy };
}
