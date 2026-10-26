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

    // Posts are visible unless the member hides them from non-followers.
    const canSeePosts = isSelf || !!isFollowing || !user.profile?.hidePostsFromNonFollowers;
    const authorSelect = { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } as const;
    const [badges, interests, opportunities, forumPosts, mutualFollowers] = await Promise.all([
      computeAutoBadges(prisma, user.id),
      prisma.interest.findMany({ where: { userId: user.id }, select: { type: true, value: true }, orderBy: { createdAt: "asc" } }),
      canSeePosts
        ? prisma.opportunity.findMany({
            where: { createdByUserId: user.id },
            orderBy: { fetchedAt: "desc" },
            take: 24,
            select: {
              id: true, title: true, summary: true, imageUrls: true, categories: true, locationName: true,
              askAmount: true, askCurrency: true, minInvestment: true, expectedRoiPercent: true,
              dealStatus: true, dealVerification: true, fetchedAt: true,
            },
          })
        : Promise.resolve([]),
      canSeePosts
        ? prisma.forumPost.findMany({
            where: { userId: user.id, archivedAt: null },
            orderBy: { createdAt: "desc" },
            take: 24,
            select: {
              id: true, title: true, body: true, tags: true, createdAt: true,
              _count: { select: { comments: true, reactions: true } },
            },
          })
        : Promise.resolve([]),
      isSelf
        ? Promise.resolve([])
        : prisma.user.findMany({
            // People you follow who also follow this member.
            where: {
              deactivatedAt: null,
              followers: { some: { followerId: userId } },
              following: { some: { followingId: user.id } },
            },
            select: authorSelect,
            take: 12,
          }),
    ]);

    const hideCounts = !isSelf && user.profile?.hideFollowerCount;
    return res.json({
      user: { ...publicUser, interests },
      isSelf,
      isFollowing: !!isFollowing,
      isFollower: !!isFollower,
      isFollowedBy: !!isFollower,
      followerCount: hideCounts ? null : user._count.followers,
      followingCount: hideCounts ? null : user._count.following,
      postsHidden: !canSeePosts,
      opportunities,
      forumPosts,
      mutualFollowers,
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

/** GET /users/:id/followers | /users/:id/following — member lists for profile stats. */
router.get("/users/:id/:list", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  if (req.params.list !== "followers" && req.params.list !== "following") return res.status(404).json({ error: "Not found" });
  try {
    const target = await prisma.user.findFirst({
      where: { deactivatedAt: null, OR: [{ id: req.params.id }, { profile: { username: req.params.id } }] },
      select: { id: true, profile: { select: { hideFollowerCount: true } } },
    });
    if (!target) return res.status(404).json({ error: "Not found" });
    if (target.id !== userId && target.profile?.hideFollowerCount) {
      return res.status(403).json({ error: "This member keeps their connections private" });
    }
    const select = { id: true, profile: { select: { name: true, username: true, imageUrl: true, occupation: true } } } as const;
    const isFollowers = req.params.list === "followers";
    const rows = isFollowers
      ? await prisma.follow.findMany({ where: { followingId: target.id }, select: { follower: { select } }, orderBy: { createdAt: "desc" }, take: 200 })
      : await prisma.follow.findMany({ where: { followerId: target.id }, select: { following: { select } }, orderBy: { createdAt: "desc" }, take: 200 });
    const users = rows.map((r: any) => (isFollowers ? r.follower : r.following));
    const mine = await prisma.follow.findMany({
      where: { followerId: userId, followingId: { in: users.map((u) => u.id) } },
      select: { followingId: true },
    });
    const followingSet = new Set(mine.map((f) => f.followingId));
    return res.json({ users: users.map((u) => ({ ...u, isFollowing: followingSet.has(u.id), isSelf: u.id === userId })) });
  } catch (e) {
    logger.error({ err: e }, "User follow list error");
    return res.status(500).json({ error: "Failed to load list" });
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
