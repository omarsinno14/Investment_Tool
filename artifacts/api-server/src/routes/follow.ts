import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { notifyUser } from "../lib/notify.js";
import { toggleFollow } from "../lib/follow.js";

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
    const result = await toggleFollow(userId, String(targetId ?? ""));
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    const { ok: _ok, ...payload } = result;
    return res.json(payload);
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
        include: { follower: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.followRequest.findMany({
        where: { followerId: userId, status: "PENDING" },
        include: { following: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } } },
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
        prisma.follow.upsert({
          where: { followerId_followingId: { followerId: request.followerId, followingId: userId } },
          create: { followerId: request.followerId, followingId: userId },
          update: {},
        }),
      ]);
      await notifyUser(prisma, {
        recipientId: request.followerId,
        actorId: userId,
        type: "FOLLOW_ACCEPTED",
        title: "Your follow request was accepted",
        link: `/users/${userId}`,
        targetType: "USER",
        targetId: userId,
        data: { fromUserId: userId },
      });
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
