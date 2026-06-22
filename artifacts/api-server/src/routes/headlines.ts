import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { fetchAllNews, filterByInterests } from "../lib/newsService.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

/**
 * GET /api/headlines
 * Returns RSS-sourced headlines filtered by the authenticated user's interests.
 * Falls back to returning all headlines if no interests are set.
 * Results are cached in-process for 10 minutes.
 */
router.get("/headlines", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const [allNews, userInterests] = await Promise.all([
      fetchAllNews(),
      prisma.interest.findMany({ where: { userId }, select: { type: true, value: true } }),
    ]);

    let filtered = userInterests.length > 0
      ? filterByInterests(allNews, userInterests)
      : allNews;

    // If filtering produced zero results (interests too narrow), fall back to all
    if (filtered.length === 0) filtered = allNews;

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const headlines = filtered.slice(0, limit);

    return res.json({ headlines, total: filtered.length, cached: true });
  } catch (e) {
    logger.error({ err: e }, "Headlines GET error");
    return res.status(500).json({ error: "Failed to load headlines" });
  }
});

export default router;
