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

router.get("/user/notifications", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { limit: limitStr, cursor } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const cursorObj = cursor ? { id: cursor } : undefined;

    const items = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;
    const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });

    return res.json({ notifications: data, nextCursor, unreadCount });
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
