import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { containsProfanity } from "../lib/profanity.js";
import { ensureEntitled } from "../lib/subscription.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

router.get("/hubs", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q, limit: limitStr } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const search = (q ?? "").trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const hubs = await prisma.hub.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        owner: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        _count: { select: { memberships: true, posts: true } },
        memberships: { where: { userId }, take: 1 },
      },
    });
    return res.json({ hubs });
  } catch (e) {
    logger.error({ err: e }, "Hubs GET error");
    return res.status(500).json({ error: "Failed to load hubs" });
  }
});

router.get("/hubs/:slug", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({
      where: { slug: req.params.slug },
      include: {
        owner: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        _count: { select: { memberships: true, posts: true } },
        memberships: { where: { userId }, take: 1 },
      },
    });
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    return res.json({ hub });
  } catch (e) {
    logger.error({ err: e }, "Hub GET error");
    return res.status(500).json({ error: "Failed to load hub" });
  }
});

router.post("/hubs", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { name, description, isPrivate } = req.body ?? {};
    if (containsProfanity(name ?? "") || containsProfanity(description ?? "")) {
      return res.status(400).json({ error: "The hub name or description contains language that isn't allowed." });
    }
    if (!name) return res.status(400).json({ error: "Name is required" });

    // Public hubs are open to all members; private hubs require Vertica Elite.
    if (isPrivate) {
      if (
        !(await ensureEntitled(res, userId, (e) => e.privateHubs, {
          feature: "privateHubs",
          message: "Private hubs require Vertica Elite.",
        }))
      )
        return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const hub = await prisma.hub.create({
      data: {
        name,
        slug: `${slug}-${Date.now()}`,
        description: description ?? null,
        isPrivate: Boolean(isPrivate),
        ownerUserId: userId,
        memberships: { create: { userId, role: "owner" } },
      },
    });
    return res.json({ hub });
  } catch (e) {
    logger.error({ err: e }, "Hub POST error");
    return res.status(500).json({ error: "Failed to create hub" });
  }
});

router.post("/hubs/:slug/join", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({ where: { slug: req.params.slug } });
    if (!hub) return res.status(404).json({ error: "Hub not found" });

    const existing = await prisma.hubMembership.findUnique({ where: { hubId_userId: { hubId: hub.id, userId } } });
    if (existing) {
      await prisma.hubMembership.delete({ where: { id: existing.id } });
      return res.json({ joined: false });
    }
    await prisma.hubMembership.create({ data: { hubId: hub.id, userId, role: "member" } });
    return res.json({ joined: true });
  } catch (e) {
    logger.error({ err: e }, "Hub join error");
    return res.status(500).json({ error: "Failed to join hub" });
  }
});

router.get("/hubs/:slug/posts", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({ where: { slug: req.params.slug } });
    if (!hub) return res.status(404).json({ error: "Hub not found" });

    const { limit: limitStr, cursor } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const cursorObj = cursor ? { id: cursor } : undefined;

    const posts = await prisma.hubPost.findMany({
      where: { hubId: hub.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      include: {
        author: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;
    return res.json({ posts: data, nextCursor });
  } catch (e) {
    logger.error({ err: e }, "Hub posts GET error");
    return res.status(500).json({ error: "Failed to load hub posts" });
  }
});

router.get("/hubs/:slug/presence", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({
      where: { slug: req.params.slug },
      include: { _count: { select: { memberships: true } } },
    });
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    return res.json({ onlineNow: 1, members: hub._count.memberships });
  } catch (e) {
    logger.error({ err: e }, "Hub presence GET error");
    return res.status(500).json({ error: "Failed to load presence" });
  }
});

router.post("/hubs/:slug/presence", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({
      where: { slug: req.params.slug },
      include: { _count: { select: { memberships: true } } },
    });
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    return res.json({ onlineNow: 1, members: hub._count.memberships });
  } catch (e) {
    logger.error({ err: e }, "Hub presence POST error");
    return res.status(500).json({ error: "Failed to update presence" });
  }
});

export default router;
