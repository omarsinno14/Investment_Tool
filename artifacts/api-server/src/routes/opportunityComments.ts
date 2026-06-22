import { Router } from "express";
import { z } from "zod";
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

const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(2000, "Comment is too long"),
  parentId: z.string().optional().nullable(),
});

const commentInclude = {
  user: {
    select: {
      id: true,
      profile: { select: { name: true, username: true, imageUrl: true, reputation: true } },
    },
  },
} as const;

function shapeAuthor(comment: any) {
  return {
    id: comment.user?.id ?? comment.userId,
    name: comment.user?.profile?.name ?? null,
    username: comment.user?.profile?.username ?? null,
    imageUrl: comment.user?.profile?.imageUrl ?? null,
    reputation: comment.user?.profile?.reputation ?? 0,
  };
}

router.get("/:id/comments", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = me?.role === "ADMIN";

    const topLevel = await prisma.opportunityComment.findMany({
      where: { opportunityId: req.params.id, parentId: null, archivedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        ...commentInclude,
        replies: {
          where: { archivedAt: null },
          orderBy: { createdAt: "asc" },
          include: commentInclude,
        },
      },
    });

    const shape = (comment: any) => ({
      id: comment.id,
      opportunityId: comment.opportunityId,
      parentId: comment.parentId,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: shapeAuthor(comment),
      canDelete: isAdmin || comment.userId === userId,
      replies: Array.isArray(comment.replies) ? comment.replies.map(shape) : [],
    });

    return res.json({ comments: topLevel.map(shape) });
  } catch (e) {
    logger.error({ err: e }, "Opportunity comments GET error");
    return res.status(500).json({ error: "Failed to load comments" });
  }
});

router.post("/:id/comments", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const parsed = createCommentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid comment" });
    }
    const { body, parentId } = parsed.data;
    if (containsProfanity(body)) {
      return res.status(400).json({ error: "Your comment contains language that isn't allowed. Please revise it." });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      select: { id: true, createdByUserId: true },
    });
    if (!opportunity) return res.status(404).json({ error: "Opportunity not found" });

    if (parentId) {
      const parent = await prisma.opportunityComment.findFirst({
        where: { id: parentId, opportunityId: req.params.id, archivedAt: null },
        select: { id: true, parentId: true },
      });
      if (!parent) return res.status(400).json({ error: "Parent comment not found" });
      if (parent.parentId) return res.status(400).json({ error: "Replies can only be one level deep" });
    }

    const comment = await prisma.opportunityComment.create({
      data: {
        opportunityId: req.params.id,
        userId,
        parentId: parentId ?? null,
        body,
      },
      include: commentInclude,
    });

    if (opportunity.createdByUserId && opportunity.createdByUserId !== userId) {
      try {
        await prisma.profile.update({
          where: { userId: opportunity.createdByUserId },
          data: { reputation: { increment: 1 } },
        });
      } catch (repErr) {
        logger.error({ err: repErr }, "Reputation increment failed");
      }

      await notifyUser(prisma, {
        recipientId: opportunity.createdByUserId,
        actorId: userId,
        type: "FORUM_COMMENT",
        title: "New comment on your deal",
        body: String(body).slice(0, 140),
        link: `/opportunities/${opportunity.id}`,
        targetType: "OPPORTUNITY",
        targetId: opportunity.id,
        data: { opportunityId: opportunity.id, fromUserId: userId, snippet: String(body).slice(0, 140) },
      });
    }

    return res.json({
      comment: {
        id: comment.id,
        opportunityId: comment.opportunityId,
        parentId: comment.parentId,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: shapeAuthor(comment),
        canDelete: true,
        replies: [],
      },
    });
  } catch (e) {
    logger.error({ err: e }, "Opportunity comment POST error");
    return res.status(500).json({ error: "Failed to add comment" });
  }
});

router.delete("/:id/comments/:commentId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const comment = await prisma.opportunityComment.findFirst({
      where: { id: req.params.commentId, opportunityId: req.params.id },
      select: { id: true, userId: true },
    });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = me?.role === "ADMIN";
    if (!isAdmin && comment.userId !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await prisma.opportunityComment.update({
      where: { id: comment.id },
      data: { archivedAt: new Date() },
    });
    return res.json({ success: true });
  } catch (e) {
    logger.error({ err: e }, "Opportunity comment DELETE error");
    return res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
