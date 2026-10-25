import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { computeAutoBadges } from "../lib/badges.js";
import { toggleFollow } from "../lib/follow.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

router.get("/users/search", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q, limit: limitStr } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 10, 30);
    const search = (q ?? "").trim();
    if (!search) return res.json({ users: [] });

    const items = await prisma.user.findMany({
      where: {
        deactivatedAt: null,
        OR: [
          { profile: { name: { contains: search, mode: "insensitive" } } },
          { profile: { username: { contains: search, mode: "insensitive" } } },
        ],
      },
      take: limit,
      select: {
        id: true,
        profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true, occupation: true } },
      },
    });
    return res.json({ users: items });
  } catch (e) {
    logger.error({ err: e }, "Users search error");
    return res.status(500).json({ error: "Failed to search users" });
  }
});

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
        role: true,
        createdAt: true,
        profile: { select: { name: true, username: true, imageUrl: true, bio: true, occupation: true, identityVerified: true } },
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

// Profile fields that are never exposed to other members.
const PRIVATE_PROFILE_FIELDS = [
  "phone",
  "dateOfBirth",
  "netWorth",
  "investAmount",
  "familySituation",
  "currency",
  "layoutPreference",
  "stripeCustomerId",
  "subscriptionStatus",
  "subscriptionRenewsAt",
  "usernameLower",
  "notifyMessages",
  "notifyFollows",
  "notifyOpportunities",
  "notifyForums",
  "notifyJournal",
  "notifyPayments",
  "notifyDigest",
] as const;

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

    const isSelf = user.id === userId;
    const [isFollowing, isFollower, followRequest, blockedByMe, blockedMe] = await Promise.all([
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: user.id } }, select: { id: true } }),
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: userId } }, select: { id: true } }),
      prisma.followRequest.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: user.id } }, select: { status: true } }),
      prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: userId, blockedId: user.id } }, select: { id: true } }),
      prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: userId } }, select: { id: true } }),
    ]);

    let publicUser: any = user;
    if (!isSelf) {
      const { email: _email, ...rest } = user;
      const profile: Record<string, any> | null = user.profile ? { ...user.profile } : null;
      if (profile) {
        for (const field of PRIVATE_PROFILE_FIELDS) delete profile[field];
        const canSeeRestricted = !!isFollowing;
        if (!canSeeRestricted) {
          if (profile.hideAgeFromNonFollowers) profile.age = null;
          if (profile.hideContactFromNonFollowers) {
            profile.websiteUrl = null;
            profile.cvUrl = null;
          }
          if (profile.hidePhotoFromNonFollowers) {
            profile.imageUrl = null;
            profile.coverPhotoUrl = null;
          }
        }
      }
      const counts = profile?.hideFollowerCount ? { followers: null, following: null } : user._count;
      publicUser = { ...rest, profile, _count: counts };
    }

    if (blockedMe && !isSelf) {
      return res.json({
        user: { id: user.id, profile: { username: user.profile?.username ?? null, name: user.profile?.name ?? null } },
        isFollowing: false,
        isFollower: false,
        followRequestStatus: null,
        isBlocked: !!blockedByMe,
        isBlockedBy: true,
        badges: [],
      });
    }

    const badges = await computeAutoBadges(prisma, user.id);

    return res.json({
      user: publicUser,
      isSelf,
      isFollowing: !!isFollowing,
      isFollower: !!isFollower,
      followRequestStatus: followRequest?.status === "PENDING" ? "PENDING" : null,
      isBlocked: !!blockedByMe,
      isBlockedBy: !!blockedMe,
      badges,
    });
  } catch (e) {
    logger.error({ err: e }, "User GET error");
    return res.status(500).json({ error: "Failed to load user" });
  }
});

router.post("/users/:id/follow", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const result = await toggleFollow(userId, req.params.id);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    const { ok: _ok, ...payload } = result;
    return res.json(payload);
  } catch (e) {
    logger.error({ err: e }, "Follow error");
    return res.status(500).json({ error: "Failed to follow" });
  }
});

export default router;
