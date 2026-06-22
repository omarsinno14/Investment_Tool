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

router.get("/user/blocks", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        blocked: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true, username: true, imageUrl: true } },
          },
        },
      },
    });
    return res.json({ blocks });
  } catch (e) {
    logger.error({ err: e }, "Blocks GET error");
    return res.status(500).json({ error: "Failed to load blocked users" });
  }
});

router.post("/user/block", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { userId: targetId } = req.body ?? {};
    if (!targetId) return res.status(400).json({ error: "userId required" });
    if (targetId === userId) return res.status(400).json({ error: "Cannot block yourself" });

    const existing = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
    });

    if (existing) {
      await prisma.block.delete({ where: { id: existing.id } });
      return res.json({ blocked: false });
    }

    await prisma.block.create({ data: { blockerId: userId, blockedId: targetId } });
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: targetId },
          { followerId: targetId, followingId: userId },
        ],
      },
    });

    return res.json({ blocked: true });
  } catch (e) {
    logger.error({ err: e }, "Block POST error");
    return res.status(500).json({ error: "Failed to block user" });
  }
});

export default router;
