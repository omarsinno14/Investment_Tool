import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { containsProfanity } from "../lib/profanity.js";
import { notifyUser } from "../lib/notify.js";

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
        user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } } } },
        _count: { select: { comments: true, reactions: true, saves: true, reposts: true } },
        saves: { where: { userId }, take: 1 },
        reposts: { where: { userId }, take: 1 },
        reactions: { where: { userId }, select: { type: true } },
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
        user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } } } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } } } } },
        },
        reactions: true,
        saves: { where: { userId }, take: 1 },
        reposts: { where: { userId }, take: 1 },
        _count: { select: { comments: true, reactions: true, saves: true, reposts: true } },
      },
    });
    if (!post || post.archivedAt) return res.status(404).json({ error: "Not found" });
    return res.json({ post, viewerId: userId });
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
    if (containsProfanity(body.title) || containsProfanity(body.body)) {
      return res.status(400).json({ error: "Your post contains language that isn't allowed. Please revise it." });
    }
    const post = await prisma.forumPost.create({
      data: {
        userId,
        title: body.title,
        body: body.body,
        tags: parseTags(body.tags),
        imageUrl: body.imageUrl ?? null,
      },
      include: {
        user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } } } },
      },
    });
    return res.json({ post });
  } catch (e) {
    logger.error({ err: e }, "Forum POST error");
    return res.status(500).json({ error: "Failed to create post" });
  }
});

function parseTags(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",") : [];
  return list.map((t) => String(t).trim().replace(/^#/, "")).filter(Boolean).slice(0, 8);
}

router.patch("/forums/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const post = await prisma.forumPost.findFirst({ where: { id: req.params.id, userId, archivedAt: null }, select: { id: true } });
    if (!post) return res.status(404).json({ error: "Not found" });
    const { title, body, tags } = req.body ?? {};
    if (title !== undefined && !String(title).trim()) return res.status(400).json({ error: "Title is required" });
    if (body !== undefined && !String(body).trim()) return res.status(400).json({ error: "Body is required" });
    if (containsProfanity(String(title ?? "")) || containsProfanity(String(body ?? ""))) {
      return res.status(400).json({ error: "Your post contains language that isn't allowed. Please revise it." });
    }
    const updated = await prisma.forumPost.update({
      where: { id: post.id },
      data: {
        ...(title !== undefined && { title: String(title).trim().slice(0, 300) }),
        ...(body !== undefined && { body: String(body).trim().slice(0, 20000) }),
        ...(tags !== undefined && { tags: parseTags(tags) }),
      },
    });
    return res.json({ post: updated });
  } catch (e) {
    logger.error({ err: e }, "Forum PATCH error");
    return res.status(500).json({ error: "Failed to update post" });
  }
});

router.delete("/forums/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const result = await prisma.forumPost.updateMany({
      where: { id: req.params.id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ error: "Not found" });
    return res.json({ deleted: true });
  } catch (e) {
    logger.error({ err: e }, "Forum DELETE error");
    return res.status(500).json({ error: "Failed to delete post" });
  }
});

/** Comment authors can delete their comments; post authors can remove comments on their post. */
router.delete("/forums/:id/comments/:commentId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const comment = await prisma.forumComment.findFirst({
      where: { id: req.params.commentId, postId: req.params.id },
      select: { id: true, userId: true, post: { select: { userId: true } } },
    });
    if (!comment || (comment.userId !== userId && comment.post.userId !== userId)) {
      return res.status(404).json({ error: "Comment not found" });
    }
    await prisma.forumComment.delete({ where: { id: comment.id } });
    return res.json({ deleted: true });
  } catch (e) {
    logger.error({ err: e }, "Forum comment DELETE error");
    return res.status(500).json({ error: "Failed to delete comment" });
  }
});

router.get("/forums/:id/comments", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const comments = await prisma.forumComment.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } } } } },
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
    const body = String(req.body?.body ?? "").trim();
    if (!body) return res.status(400).json({ error: "Body is required" });
    if (body.length > 4000) return res.status(400).json({ error: "Comment is too long" });
    if (containsProfanity(body)) {
      return res.status(400).json({ error: "Your comment contains language that isn't allowed. Please revise it." });
    }
    const comment = await prisma.forumComment.create({
      data: { postId: req.params.id, userId, body },
      include: { user: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } } } } },
    });

    const post = await prisma.forumPost.findUnique({
      where: { id: req.params.id },
      select: { userId: true, title: true },
    });
    if (post) {
      await notifyUser(prisma, {
        recipientId: post.userId,
        actorId: userId,
        type: "FORUM_COMMENT",
        title: "New comment on your post",
        body: String(body).slice(0, 140),
        link: `/forums/${req.params.id}`,
        targetType: "FORUM_POST",
        targetId: req.params.id,
        data: { postId: req.params.id, fromUserId: userId, snippet: String(body).slice(0, 140) },
      });
    }

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

    const post = await prisma.forumPost.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });
    if (post) {
      await notifyUser(prisma, {
        recipientId: post.userId,
        actorId: userId,
        type: "FORUM_REACTION",
        title: "Someone reacted to your post",
        link: `/forums/${req.params.id}`,
        targetType: "FORUM_POST",
        targetId: req.params.id,
        data: { postId: req.params.id, fromUserId: userId, reactionType: type },
      });
    }

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

    const post = await prisma.forumPost.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });
    if (post) {
      await notifyUser(prisma, {
        recipientId: post.userId,
        actorId: userId,
        type: "FORUM_REACTION",
        title: "Someone reacted to your post",
        link: `/forums/${req.params.id}`,
        targetType: "FORUM_POST",
        targetId: req.params.id,
        data: { postId: req.params.id, fromUserId: userId, reactionType: type },
      });
    }

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
