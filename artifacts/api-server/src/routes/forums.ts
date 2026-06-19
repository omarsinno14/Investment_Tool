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

router.get("/forums", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q, tab, limit: limitStr, cursor } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const search = (q ?? "").trim().toLowerCase();

    const where: any = { archivedAt: null };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const cursorObj = cursor ? { id: cursor } : undefined;
    const orderBy = tab === "trending" ? [{ reactions: { _count: "desc" } }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

    const items = await prisma.forumPost.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      include: {
        user: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        _count: { select: { comments: true, reactions: true, saves: true, reposts: true } },
        saves: { where: { userId }, take: 1 },
        reposts: { where: { userId }, take: 1 },
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return res.json({ posts: data, nextCursor });
  } catch (e) {
    logger.error({ err: e }, "Forums GET error");
    return res.status(500).json({ error: "Failed to load forums" });
  }
});

router.get("/forums/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const post = await prisma.forumPost.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } } },
        },
        reactions: true,
        saves: { where: { userId }, take: 1 },
        reposts: { where: { userId }, take: 1 },
        _count: { select: { comments: true, reactions: true, saves: true, reposts: true } },
      },
    });
    if (!post) return res.status(404).json({ error: "Not found" });
    return res.json({ post });
  } catch (e) {
    logger.error({ err: e }, "Forum post GET error");
    return res.status(500).json({ error: "Failed to load forum post" });
  }
});

router.post("/forums", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const body = req.body;
    if (!body?.title || !body?.body) return res.status(400).json({ error: "Title and body are required" });
    const post = await prisma.forumPost.create({
      data: {
        userId,
        title: body.title,
        body: body.body,
        tags: Array.isArray(body.tags) ? body.tags : [],
        imageUrl: body.imageUrl ?? null,
      },
      include: {
        user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
      },
    });
    return res.json({ post });
  } catch (e) {
    logger.error({ err: e }, "Forum POST error");
    return res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/forums/:id/comments", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const comments = await prisma.forumComment.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } } },
    });
    return res.json({ comments });
  } catch (e) {
    logger.error({ err: e }, "Forum comments GET error");
    return res.status(500).json({ error: "Failed to load comments" });
  }
});

router.post("/forums/:id/comments", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { body } = req.body ?? {};
    if (!body) return res.status(400).json({ error: "Body is required" });
    const comment = await prisma.forumComment.create({
      data: { postId: req.params.id, userId, body },
      include: { user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } } },
    });
    return res.json({ comment });
  } catch (e) {
    logger.error({ err: e }, "Forum comment error");
    return res.status(500).json({ error: "Failed to add comment" });
  }
});

router.get("/forums/:id/reactions", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const reactions = await prisma.forumReaction.findMany({
      where: { postId: req.params.id },
    });
    return res.json({ reactions });
  } catch (e) {
    logger.error({ err: e }, "Forum reactions GET error");
    return res.status(500).json({ error: "Failed to load reactions" });
  }
});

router.post("/forums/:id/reactions", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { type } = req.body ?? {};
    if (!type) return res.status(400).json({ error: "Reaction type required" });
    const existing = await prisma.forumReaction.findUnique({ where: { postId_userId_type: { postId: req.params.id, userId, type } } });
    if (existing) {
      await prisma.forumReaction.delete({ where: { id: existing.id } });
      return res.json({ removed: true });
    }
    const reaction = await prisma.forumReaction.create({ data: { postId: req.params.id, userId, type } });
    return res.json({ reaction });
  } catch (e) {
    logger.error({ err: e }, "Forum reactions POST error");
    return res.status(500).json({ error: "Failed to react" });
  }
});

router.post("/forums/:id/react", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { type } = req.body ?? {};
    if (!type) return res.status(400).json({ error: "Reaction type required" });
    const existing = await prisma.forumReaction.findUnique({ where: { postId_userId_type: { postId: req.params.id, userId, type } } });
    if (existing) {
      await prisma.forumReaction.delete({ where: { id: existing.id } });
      return res.json({ removed: true });
    }
    const reaction = await prisma.forumReaction.create({ data: { postId: req.params.id, userId, type } });
    return res.json({ reaction });
  } catch (e) {
    logger.error({ err: e }, "Forum react error");
    return res.status(500).json({ error: "Failed to react" });
  }
});

router.post("/forums/:id/save", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const existing = await prisma.forumSave.findUnique({ where: { postId_userId: { postId: req.params.id, userId } } });
    if (existing) {
      await prisma.forumSave.delete({ where: { id: existing.id } });
      return res.json({ saved: false });
    }
    await prisma.forumSave.create({ data: { postId: req.params.id, userId } });
    return res.json({ saved: true });
  } catch (e) {
    logger.error({ err: e }, "Forum save error");
    return res.status(500).json({ error: "Failed to save" });
  }
});

export default router;
