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

const VALID_TARGET_TYPES = new Set(["USER", "FORUM_POST", "OPPORTUNITY", "HUB_POST", "HUB_COMMENT"]);

router.post("/reports", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { targetType, targetId, reason } = req.body ?? {};
    if (!VALID_TARGET_TYPES.has(targetType) || !targetId || !reason) {
      return res.status(400).json({ error: "targetType, targetId, and reason are required" });
    }
    const report = await prisma.report.create({
      data: { reporterId: userId, targetType, targetId, reason },
    });
    return res.json({ report });
  } catch (e) {
    logger.error({ err: e }, "Report POST error");
    return res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
