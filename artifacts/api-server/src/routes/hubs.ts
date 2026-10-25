import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { containsProfanity } from "../lib/profanity.js";
import { ensureEntitled } from "../lib/subscription.js";
import { notifyUser } from "../lib/notify.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

router.get("/hubs", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q, limit: limitStr } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const search = (q ?? "").trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const hubs = await prisma.hub.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        owner: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        _count: { select: { memberships: true, posts: true } },
        memberships: { where: { userId }, take: 1 },
      },
    });
    return res.json({ hubs });
  } catch (e) {
    logger.error({ err: e }, "Hubs GET error");
    return res.status(500).json({ error: "Failed to load hubs" });
  }
});

router.get("/hubs/:slug", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({
      where: { slug: req.params.slug },
      include: {
        owner: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        _count: { select: { memberships: true, posts: true } },
        memberships: { where: { userId }, take: 1 },
      },
    });
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    return res.json({ hub });
  } catch (e) {
    logger.error({ err: e }, "Hub GET error");
    return res.status(500).json({ error: "Failed to load hub" });
  }
});

router.post("/hubs", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { name, description, isPrivate } = req.body ?? {};
    if (containsProfanity(name ?? "") || containsProfanity(description ?? "")) {
      return res.status(400).json({ error: "The hub name or description contains language that isn't allowed." });
    }
    if (!name) return res.status(400).json({ error: "Name is required" });

    // Public hubs are open to all members; private hubs require Vertica Elite.
    if (isPrivate) {
      if (
        !(await ensureEntitled(res, userId, (e) => e.privateHubs, {
          feature: "privateHubs",
          message: "Private hubs require Vertica Elite.",
        }))
      )
        return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const hub = await prisma.hub.create({
      data: {
        name,
        slug: `${slug}-${Date.now()}`,
        description: description ?? null,
        isPrivate: Boolean(isPrivate),
        ownerUserId: userId,
        memberships: { create: { userId, role: "owner" } },
      },
    });
    return res.json({ hub });
  } catch (e) {
    logger.error({ err: e }, "Hub POST error");
    return res.status(500).json({ error: "Failed to create hub" });
  }
});

router.post("/hubs/:slug/join", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({ where: { slug: req.params.slug } });
    if (!hub) return res.status(404).json({ error: "Hub not found" });

    const existing = await prisma.hubMembership.findUnique({ where: { hubId_userId: { hubId: hub.id, userId } } });
    if (existing) return res.json({ joined: true });

    if (hub.isPrivate && hub.ownerUserId !== userId) {
      const token = String(req.body?.inviteToken ?? "");
      if (!hub.inviteToken || token !== hub.inviteToken) {
        return res.status(403).json({ error: "This hub is private. Ask the owner for an invite link." });
      }
    }
    await prisma.hubMembership.create({ data: { hubId: hub.id, userId, role: "member" } });
    return res.json({ joined: true });
  } catch (e) {
    logger.error({ err: e }, "Hub join error");
    return res.status(500).json({ error: "Failed to join hub" });
  }
});

router.delete("/hubs/:slug/join", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({ where: { slug: req.params.slug }, select: { id: true, ownerUserId: true } });
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    if (hub.ownerUserId === userId) return res.status(400).json({ error: "Owners can't leave their own hub" });
    await prisma.hubMembership.deleteMany({ where: { hubId: hub.id, userId } });
    return res.json({ joined: false });
  } catch (e) {
    logger.error({ err: e }, "Hub leave error");
    return res.status(500).json({ error: "Failed to leave hub" });
  }
});

router.patch("/hubs/:slug", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({ where: { slug: req.params.slug }, select: { id: true, ownerUserId: true } });
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    if (hub.ownerUserId !== userId && req.session.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Only the hub owner can edit it" });
    }
    const { description, imageUrl, coverImageUrl } = req.body ?? {};
    if (description !== undefined && containsProfanity(String(description ?? ""))) {
      return res.status(400).json({ error: "The description contains language that isn't allowed." });
    }
    const updated = await prisma.hub.update({
      where: { id: hub.id },
      data: {
        ...(description !== undefined && { description: description ? String(description) : null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl ? String(imageUrl) : null }),
        ...(coverImageUrl !== undefined && { coverImageUrl: coverImageUrl ? String(coverImageUrl) : null }),
      },
    });
    return res.json({ hub: updated });
  } catch (e) {
    logger.error({ err: e }, "Hub PATCH error");
    return res.status(500).json({ error: "Failed to update hub" });
  }
});

router.get("/hubs/:slug/posts", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({ where: { slug: req.params.slug } });
    if (!hub) return res.status(404).json({ error: "Hub not found" });

    const { limit: limitStr, cursor } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const cursorObj = cursor ? { id: cursor } : undefined;

    const posts = await prisma.hubPost.findMany({
      where: { hubId: hub.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      include: {
        author: { select: { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;
    return res.json({ posts: data, nextCursor });
  } catch (e) {
    logger.error({ err: e }, "Hub posts GET error");
    return res.status(500).json({ error: "Failed to load hub posts" });
  }
});

const HUB_POST_TYPES = new Set(["DISCUSSION", "OPPORTUNITY_IMPORT", "NEWS_IMPORT"]);
const authorSelect = { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } as const;

async function loadHubForMember(slug: string, userId: string) {
  const hub = await prisma.hub.findUnique({ where: { slug }, select: { id: true, isPrivate: true, ownerUserId: true } });
  if (!hub) return { hub: null, isMember: false };
  const membership = await prisma.hubMembership.findUnique({
    where: { hubId_userId: { hubId: hub.id, userId } },
    select: { id: true },
  });
  return { hub, isMember: !!membership };
}

router.post("/hubs/:slug/posts", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { hub, isMember } = await loadHubForMember(req.params.slug, userId);
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    if (!isMember) return res.status(403).json({ error: "Join the hub to post" });

    const { title, body, type, opportunityId, newsHeadline, newsUrl, newsSource } = req.body ?? {};
    const cleanTitle = String(title ?? "").trim();
    const cleanBody = String(body ?? "").trim();
    if (!cleanTitle || !cleanBody) return res.status(400).json({ error: "Title and body are required" });
    if (cleanTitle.length > 200 || cleanBody.length > 10000) {
      return res.status(400).json({ error: "Post is too long" });
    }
    if (containsProfanity(cleanTitle) || containsProfanity(cleanBody)) {
      return res.status(400).json({ error: "Your post contains language that isn't allowed. Please revise it." });
    }

    const post = await prisma.hubPost.create({
      data: {
        hubId: hub.id,
        authorUserId: userId,
        title: cleanTitle,
        body: cleanBody,
        type: HUB_POST_TYPES.has(String(type)) ? (String(type) as any) : "DISCUSSION",
        opportunityId: opportunityId ? String(opportunityId) : null,
        newsHeadline: newsHeadline ? String(newsHeadline) : null,
        newsUrl: newsUrl ? String(newsUrl) : null,
        newsSource: newsSource ? String(newsSource) : null,
      },
      include: { author: { select: authorSelect }, _count: { select: { comments: true, reactions: true } } },
    });
    return res.json({ post });
  } catch (e) {
    logger.error({ err: e }, "Hub post POST error");
    return res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/hubs/:slug/posts/:postId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { hub, isMember } = await loadHubForMember(req.params.slug, userId);
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    if (hub.isPrivate && !isMember) return res.status(403).json({ error: "This hub is private" });

    const post = await prisma.hubPost.findFirst({
      where: { id: req.params.postId, hubId: hub.id, deletedAt: null },
      include: {
        author: { select: authorSelect },
        hub: { select: { id: true, name: true, slug: true } },
        comments: { orderBy: { createdAt: "asc" }, take: 200, include: { user: { select: authorSelect } } },
        reactions: { select: { id: true, type: true, userId: true } },
      },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    return res.json({ post, viewerId: userId, isMember });
  } catch (e) {
    logger.error({ err: e }, "Hub post GET error");
    return res.status(500).json({ error: "Failed to load post" });
  }
});

router.post("/hubs/:slug/posts/:postId/comments", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { hub, isMember } = await loadHubForMember(req.params.slug, userId);
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    if (hub.isPrivate && !isMember) return res.status(403).json({ error: "This hub is private" });

    const body = String(req.body?.body ?? "").trim();
    if (!body) return res.status(400).json({ error: "Comment cannot be empty" });
    if (body.length > 4000) return res.status(400).json({ error: "Comment is too long" });
    if (containsProfanity(body)) {
      return res.status(400).json({ error: "Your comment contains language that isn't allowed. Please revise it." });
    }
    const post = await prisma.hubPost.findFirst({
      where: { id: req.params.postId, hubId: hub.id, deletedAt: null },
      select: { id: true, authorUserId: true, title: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = await prisma.hubComment.create({
      data: { hubId: hub.id, postId: post.id, userId, body },
      include: { user: { select: authorSelect } },
    });
    if (post.authorUserId !== userId) {
      void notifyUser(prisma, {
        recipientId: post.authorUserId,
        actorId: userId,
        type: "FORUM_COMMENT",
        title: "New comment on your hub post",
        body: body.slice(0, 140),
        link: `/hubs/${req.params.slug}/posts/${post.id}`,
        targetType: "HUB_POST",
        targetId: post.id,
      });
    }
    return res.json({ comment });
  } catch (e) {
    logger.error({ err: e }, "Hub comment POST error");
    return res.status(500).json({ error: "Failed to add comment" });
  }
});

router.post("/hubs/:slug/posts/:postId/reactions", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { hub, isMember } = await loadHubForMember(req.params.slug, userId);
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    if (hub.isPrivate && !isMember) return res.status(403).json({ error: "This hub is private" });

    const type = String(req.body?.type ?? "LIKE").toUpperCase().slice(0, 20);
    const post = await prisma.hubPost.findFirst({
      where: { id: req.params.postId, hubId: hub.id, deletedAt: null },
      select: { id: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const existing = await prisma.hubReaction.findUnique({
      where: { postId_userId_type: { postId: post.id, userId, type } },
      select: { id: true },
    });
    if (existing) {
      await prisma.hubReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.hubReaction.create({ data: { hubId: hub.id, postId: post.id, userId, type } });
    }
    const count = await prisma.hubReaction.count({ where: { postId: post.id, type } });
    return res.json({ reacted: !existing, count });
  } catch (e) {
    logger.error({ err: e }, "Hub reaction POST error");
    return res.status(500).json({ error: "Failed to react" });
  }
});

// Lightweight presence: members who pinged in the last 2 minutes. Ephemeral by
// design (an approximate "online now" count), so per-instance memory is fine.
const PRESENCE_WINDOW_MS = 2 * 60 * 1000;
const presence = new Map<string, Map<string, number>>();

function onlineCount(hubId: string): number {
  const seen = presence.get(hubId);
  if (!seen) return 0;
  const cutoff = Date.now() - PRESENCE_WINDOW_MS;
  for (const [uid, ts] of seen) if (ts < cutoff) seen.delete(uid);
  return seen.size;
}

router.get("/hubs/:slug/presence", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({
      where: { slug: req.params.slug },
      include: { _count: { select: { memberships: true } } },
    });
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    return res.json({ onlineNow: Math.max(onlineCount(hub.id), 1), members: hub._count.memberships });
  } catch (e) {
    logger.error({ err: e }, "Hub presence GET error");
    return res.status(500).json({ error: "Failed to load presence" });
  }
});

router.post("/hubs/:slug/presence", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const hub = await prisma.hub.findUnique({
      where: { slug: req.params.slug },
      include: { _count: { select: { memberships: true } } },
    });
    if (!hub) return res.status(404).json({ error: "Hub not found" });
    if (!presence.has(hub.id)) presence.set(hub.id, new Map());
    presence.get(hub.id)!.set(userId, Date.now());
    return res.json({ onlineNow: onlineCount(hub.id), members: hub._count.memberships });
  } catch (e) {
    logger.error({ err: e }, "Hub presence POST error");
    return res.status(500).json({ error: "Failed to update presence" });
  }
});

export default router;
