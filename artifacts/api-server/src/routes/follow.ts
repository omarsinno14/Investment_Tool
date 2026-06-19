import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

router.post("/user/follow", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { userId: targetId } = req.body ?? {};
    if (!targetId) return res.status(400).json({ error: "userId required" });
    if (targetId === userId) return res.status(400).json({ error: "Cannot follow yourself" });

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, profile: { select: { requiresFollowApproval: true } } } });
    if (!target) return res.status(404).json({ error: "User not found" });

    const requiresApproval = target.profile?.requiresFollowApproval ?? false;
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      return res.json({ following: false, followRequestStatus: null });
    }

    if (requiresApproval) {
      await prisma.followRequest.upsert({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } },
        create: { followerId: userId, followingId: targetId, status: "PENDING" },
        update: { status: "PENDING" },
      });
      return res.json({ following: false, followRequestStatus: "PENDING" });
    }

    await prisma.follow.create({ data: { followerId: userId, followingId: targetId } });
    const isFollowedBy = !!(await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: targetId, followingId: userId } },
    }));
    return res.json({ following: true, followRequestStatus: null, isFollowedBy });
  } catch (e) {
    logger.error({ err: e }, "Follow error");
    return res.status(500).json({ error: "Failed to update follow" });
  }
});

router.get("/user/follow-requests", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const [incoming, outgoing] = await Promise.all([
      prisma.followRequest.findMany({
        where: { followingId: userId, status: "PENDING" },
        include: { follower: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.followRequest.findMany({
        where: { followerId: userId, status: "PENDING" },
        include: { following: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return res.json({ incoming, outgoing });
  } catch (e) {
    logger.error({ err: e }, "Follow requests GET error");
    return res.status(500).json({ error: "Failed to load follow requests" });
  }
});

router.post("/user/follow-requests", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { requestId, action } = req.body ?? {};
    if (!requestId || !["accept", "decline"].includes(action)) {
      return res.status(400).json({ error: "requestId and action (accept|decline) required" });
    }
    const request = await prisma.followRequest.findFirst({
      where: { id: requestId, followingId: userId, status: "PENDING" },
    });
    if (!request) return res.status(404).json({ error: "Follow request not found" });

    if (action === "accept") {
      await prisma.$transaction([
        prisma.followRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } }),
        prisma.follow.create({ data: { followerId: request.followerId, followingId: userId } }),
      ]);
    } else {
      await prisma.followRequest.update({ where: { id: requestId }, data: { status: "DECLINED" } });
    }
    return res.json({ ok: true, action });
  } catch (e) {
    logger.error({ err: e }, "Follow request action error");
    return res.status(500).json({ error: "Failed to update follow request" });
  }
});

export default router;
