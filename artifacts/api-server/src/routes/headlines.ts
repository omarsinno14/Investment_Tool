import { Router } from "express";
import { loadInterestMatcher } from "../lib/interestMatch.js";
import { logger } from "../lib/logger.js";
import { fetchAllNews } from "../lib/newsService.js";
import { getUserEntitlements } from "../lib/subscription.js";

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
    // Every member's interests rank and label the feed. Plus+ (personalizedNews)
    // additionally narrows it to matching stories only.
    const entitlements = await getUserEntitlements(userId);
    const [allNews, matcher] = await Promise.all([fetchAllNews(), loadInterestMatcher(userId)]);

    let ranked = allNews.map((item) => {
      // Feed-level topic tags apply to every story in a feed, so topics match on the
      // story's own text; the feed's country tags still place it geographically.
      const match = matcher ? matcher(item.title, item.summary, item.countryTags) : { score: 0, matched: [] as string[] };
      return { ...item, matchScore: match.score, matchedInterests: match.matched };
    });
    if (matcher) {
      // Matches first; the feed is already newest-first, and sort is stable.
      ranked = [...ranked].sort((a, b) => Number(b.matchScore > 0) - Number(a.matchScore > 0));
    }

    let filtered = ranked;
    if (matcher && entitlements.personalizedNews) {
      const onlyMatches = ranked.filter((item) => item.matchScore > 0);
      // Fall back to the full feed if the member's interests are too narrow today.
      if (onlyMatches.length > 0) filtered = onlyMatches;
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const headlines = filtered.slice(0, limit);

    return res.json({
      headlines,
      total: filtered.length,
      cached: true,
      personalized: Boolean(matcher),
      interestsOnly: Boolean(matcher && entitlements.personalizedNews),
    });
  } catch (e) {
    logger.error({ err: e }, "Headlines GET error");
    return res.status(500).json({ error: "Failed to load headlines" });
  }
});

export default router;
