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

const VALID_INTEREST_TYPES = new Set(["ASSET_CLASS", "STRATEGY", "REIT", "COUNTRY", "CITY", "SUBTOPIC", "CUSTOM"]);

router.get("/user/interests", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const interests = await prisma.interest.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { type: true, value: true, parent: true },
    });
    return res.json({ interests });
  } catch (e) {
    logger.error({ err: e }, "Interests GET error");
    return res.status(500).json({ error: "Failed to load interests" });
  }
});

router.post("/user/interests", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { interests } = req.body ?? {};
    if (!Array.isArray(interests)) return res.status(400).json({ error: "Invalid payload" });

    const deduped: { type: string; value: string; parent: string | null }[] = [];
    const seen = new Set<string>();
    for (const item of interests) {
      if (!item || !VALID_INTEREST_TYPES.has(item.type) || typeof item.value !== "string") continue;
      const key = `${item.type}:${item.value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({ type: item.type, value: item.value, parent: item.parent ?? null });
    }

    await prisma.$transaction([
      prisma.interest.deleteMany({ where: { userId } }),
      prisma.interest.createMany({
        data: deduped.map((i) => ({ userId, type: i.type as any, value: i.value, parent: i.parent })),
        skipDuplicates: true,
      }),
    ]);

    const updated = await prisma.interest.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { type: true, value: true, parent: true },
    });
    return res.json({ interests: updated });
  } catch (e) {
    logger.error({ err: e }, "Interests POST error");
    return res.status(500).json({ error: "Failed to save interests" });
  }
});

export default router;
