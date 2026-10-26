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

/**
 * GET /user/notifications — activity feed, newest first.
 * Direct messages are excluded by default (they live in the Messages inbox);
 * pass `?includeMessages=1` to include them. `?unread=1` returns unread only.
 * Each item is enriched with the actor (`fromUser`) and the viewer's follow
 * state with them so the UI can render "Follow back" inline.
 */
router.get("/user/notifications", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { limit: limitStr, cursor, unread, includeMessages } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 30, 50);
    const cursorObj = cursor ? { id: cursor } : undefined;
    const where: any = { userId };
    if (includeMessages !== "1") where.type = { not: "MESSAGE" };
    if (unread === "1") where.readAt = null;

    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    const actorIds = [
      ...new Set(
        data
          .map((n) => (n.data as any)?.actorId ?? (n.data as any)?.fromUserId)
          .filter((v): v is string => typeof v === "string"),
      ),
    ];
    const [actors, following, requests, unreadCount] = await Promise.all([
      actorIds.length
        ? prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } } },
          })
        : Promise.resolve([]),
      actorIds.length
        ? prisma.follow.findMany({ where: { followerId: userId, followingId: { in: actorIds } }, select: { followingId: true } })
        : Promise.resolve([]),
      actorIds.length
        ? prisma.followRequest.findMany({
            where: { followerId: userId, followingId: { in: actorIds }, status: "PENDING" },
            select: { followingId: true },
          })
        : Promise.resolve([]),
      prisma.notification.count({ where: { userId, readAt: null, type: { not: "MESSAGE" } } }),
    ]);
    const actorMap = new Map(actors.map((a) => [a.id, a]));
    const followingSet = new Set(following.map((f) => f.followingId));
    const requestedSet = new Set(requests.map((r) => r.followingId));

    const notifications = data.map((n) => {
      const actorId = (n.data as any)?.actorId ?? (n.data as any)?.fromUserId;
      return {
        ...n,
        fromUser: actorId ? actorMap.get(actorId) ?? null : null,
        isFollowingFromUser: actorId ? followingSet.has(actorId) : false,
        followRequestStatus: actorId && requestedSet.has(actorId) ? "PENDING" : null,
      };
    });

    return res.json({ notifications, nextCursor, unreadCount });
  } catch (e) {
    logger.error({ err: e }, "Notifications GET error");
    return res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.post("/user/notifications/read-all", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Notifications read-all error");
    return res.status(500).json({ error: "Failed to mark notifications read" });
  }
});

router.post("/user/notifications/:id/read", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId }, data: { readAt: new Date() } });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Notification read error");
    return res.status(500).json({ error: "Failed to mark notification read" });
  }
});

export default router;
