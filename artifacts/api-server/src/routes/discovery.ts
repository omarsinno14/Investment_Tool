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

router.get("/user/suggested-follows", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { limit: limitStr } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 8, 20);

    // Users already followed + blocked (both directions) are excluded
    const [following, blocks] = await Promise.all([
      prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      prisma.block.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
        select: { blockerId: true, blockedId: true },
      }),
    ]);

    const excluded = new Set<string>([userId]);
    for (const f of following) excluded.add(f.followingId);
    for (const b of blocks) excluded.add(b.blockerId === userId ? b.blockedId : b.blockerId);

    const candidates = await prisma.user.findMany({
      where: {
        deactivatedAt: null,
        bannedAt: null,
        id: { notIn: Array.from(excluded) },
      },
      take: limit * 4,
      select: {
        id: true,
        profile: {
          select: {
            name: true,
            username: true,
            imageUrl: true,
            occupation: true,
            bio: true,
            reputation: true,
            identityVerified: true,
          },
        },
        _count: { select: { followers: true } },
      },
    });

    candidates.sort((a, b) => {
      const repA = a.profile?.reputation ?? 0;
      const repB = b.profile?.reputation ?? 0;
      if (repB !== repA) return repB - repA;
      return (b._count?.followers ?? 0) - (a._count?.followers ?? 0);
    });

    return res.json({ users: candidates.slice(0, limit) });
  } catch (e) {
    logger.error({ err: e }, "Suggested follows GET error");
    return res.status(500).json({ error: "Failed to load suggested members" });
  }
});

router.get("/discovery/trending", async (_req, res) => {
  const userId = requireAuth(_req, res);
  if (!userId) return;
  try {
    const [opportunities, hubs] = await Promise.all([
      prisma.opportunity.findMany({
        orderBy: [{ boostedAt: "desc" }, { dealScore: "desc" }, { fetchedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          title: true,
          summary: true,
          companyName: true,
          minInvestment: true,
          askCurrency: true,
          expectedRoiPercent: true,
          riskLevel: true,
          dealStatus: true,
          imageUrl: true,
        },
      }),
      prisma.hub.findMany({
        where: { isPrivate: false },
        orderBy: { posts: { _count: "desc" } },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          _count: { select: { memberships: true, posts: true } },
        },
      }),
    ]);

    return res.json({ opportunities, hubs });
  } catch (e) {
    logger.error({ err: e }, "Discovery trending GET error");
    return res.status(500).json({ error: "Failed to load trending" });
  }
});

export default router;
