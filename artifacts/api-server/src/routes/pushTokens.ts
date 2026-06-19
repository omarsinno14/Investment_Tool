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

router.post("/user/push-token", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { token, platform } = req.body ?? {};
    if (!token) return res.status(400).json({ error: "token required" });
    await (prisma as any).pushToken.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, token, platform: platform ?? "unknown" },
      update: { platform: platform ?? "unknown", updatedAt: new Date() },
    });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Push token POST error");
    return res.status(500).json({ error: "Failed to save push token" });
  }
});

router.delete("/user/push-token", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { token } = req.body ?? {};
    if (!token) return res.status(400).json({ error: "token required" });
    await (prisma as any).pushToken.deleteMany({ where: { userId, token } });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Push token DELETE error");
    return res.status(500).json({ error: "Failed to remove push token" });
  }
});

export default router;
