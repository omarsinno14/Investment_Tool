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

const createdByUserSelect = {
  id: true,
  profile: {
    select: { name: true, username: true, imageUrl: true, identityVerified: true },
  },
} as const;

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q } = req.query as Record<string, string>;
    const search = (q ?? "").trim();
    if (!search) {
      return res.json({ opportunities: [], users: [], hubs: [], posts: [] });
    }
    const lower = search.toLowerCase();

    // Resolve blocked users (both directions) to exclude from member results
    const blocks = await prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = new Set<string>();
    for (const b of blocks) {
      blockedIds.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }
    const excludedUserIds = Array.from(blockedIds);
    const excludeAuthor = excludedUserIds.length
      ? { createdByUserId: { notIn: excludedUserIds } }
      : {};
    const excludePostAuthor = excludedUserIds.length
      ? { userId: { notIn: excludedUserIds } }
      : {};

    const [opportunities, users, hubs, posts] = await Promise.all([
      prisma.opportunity.findMany({
        where: {
          ...excludeAuthor,
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { summary: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
            { tags: { has: lower } },
          ],
        },
        orderBy: [{ boostedAt: "desc" }, { fetchedAt: "desc" }],
        take: 6,
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
          createdByUser: { select: createdByUserSelect },
        },
      }),
      prisma.user.findMany({
        where: {
          deactivatedAt: null,
          id: { notIn: excludedUserIds.length ? excludedUserIds : ["__none__"] },
          OR: [
            { profile: { name: { contains: search, mode: "insensitive" } } },
            { profile: { username: { contains: search, mode: "insensitive" } } },
          ],
        },
        take: 8,
        select: {
          id: true,
          profile: {
            select: { name: true, username: true, imageUrl: true, occupation: true, identityVerified: true },
          },
          _count: { select: { followers: true } },
        },
      }),
      prisma.hub.findMany({
        where: {
          isPrivate: false,
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          _count: { select: { memberships: true, posts: true } },
        },
      }),
      prisma.forumPost.findMany({
        where: {
          archivedAt: null,
          ...excludePostAuthor,
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
            { tags: { has: lower } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          body: true,
          createdAt: true,
          user: { select: createdByUserSelect },
        },
      }),
    ]);

    return res.json({ opportunities, users, hubs, posts });
  } catch (e) {
    logger.error({ err: e }, "Search GET error");
    return res.status(500).json({ error: "Failed to search" });
  }
});

export default router;
