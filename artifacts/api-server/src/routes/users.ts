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

router.get("/users", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q, limit: limitStr, cursor } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const search = (q ?? "").trim();

    const where: any = { deactivatedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { profile: { name: { contains: search, mode: "insensitive" } } },
        { profile: { username: { contains: search, mode: "insensitive" } } },
      ];
    }

    const cursorObj = cursor ? { id: cursor } : undefined;
    const items = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: { select: { name: true, username: true, imageUrl: true, bio: true, occupation: true } },
        _count: { select: { followers: true, following: true } },
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;
    return res.json({ users: data, nextCursor });
  } catch (e) {
    logger.error({ err: e }, "Users GET error");
    return res.status(500).json({ error: "Failed to load users" });
  }
});

router.get("/users/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const user = await prisma.user.findFirst({
      where: {
        AND: [
          { deactivatedAt: null },
          { OR: [{ id: req.params.id }, { profile: { username: req.params.id } }] },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
        _count: { select: { followers: true, following: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "Not found" });

    const [isFollowing, isFollower] = await Promise.all([
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: user.id } }, select: { id: true } }),
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: userId } }, select: { id: true } }),
    ]);

    return res.json({ user, isFollowing: !!isFollowing, isFollower: !!isFollower });
  } catch (e) {
    logger.error({ err: e }, "User GET error");
    return res.status(500).json({ error: "Failed to load user" });
  }
});

router.post("/users/:id/follow", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const targetId = req.params.id;
    if (targetId === userId) return res.status(400).json({ error: "Cannot follow yourself" });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });
    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      return res.json({ following: false });
    }
    await prisma.follow.create({ data: { followerId: userId, followingId: targetId } });
    return res.json({ following: true });
  } catch (e) {
    logger.error({ err: e }, "Follow error");
    return res.status(500).json({ error: "Failed to follow" });
  }
});

export default router;
