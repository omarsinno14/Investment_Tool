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

router.get("/user/overview", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const view = (req.query.view as string) ?? "private";
    const isPublic = view === "public";

    const [user, opportunities, forumPosts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          profile: true,
          interests: { select: { type: true, value: true } },
          _count: { select: { followers: true, following: true } },
        },
      }),
      prisma.opportunity.findMany({
        where: { createdByUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          summary: true,
          type: true,
          status: true,
          askAmount: true,
          askCurrency: true,
          tags: true,
          createdAt: true,
          publishedAt: true,
        },
      }),
      prisma.forumPost.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          body: true,
          tags: true,
          createdAt: true,
          _count: { select: { comments: true } },
        },
      }),
    ]);

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      user,
      opportunities,
      forumPosts,
      publicPreview: isPublic,
    });
  } catch (e) {
    logger.error({ err: e }, "Overview GET error");
    return res.status(500).json({ error: "Failed to load overview" });
  }
});

export default router;
