/**
 * savedArticles.ts — bookmark news articles (Phase 14).
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../lib/adminGuard.js";

const router = Router();

router.get("/user/saved-articles", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const articles = await prisma.savedArticle.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return res.json({ articles });
  } catch (e) {
    logger.error({ err: e }, "saved-articles list error");
    return res.status(500).json({ error: "Could not load saved articles" });
  }
});

const saveSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(400),
  source: z.string().max(200).optional(),
  imageUrl: z.string().url().optional(),
  publishedAt: z.string().datetime().optional(),
});

router.post("/user/saved-articles", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid article" });
  try {
    const article = await prisma.savedArticle.upsert({
      where: { userId_url: { userId, url: parsed.data.url } },
      update: {
        title: parsed.data.title,
        source: parsed.data.source,
        imageUrl: parsed.data.imageUrl,
        publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : undefined,
      },
      create: {
        userId,
        url: parsed.data.url,
        title: parsed.data.title,
        source: parsed.data.source,
        imageUrl: parsed.data.imageUrl,
        publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : undefined,
      },
    });
    return res.json({ article });
  } catch (e) {
    logger.error({ err: e }, "saved-articles create error");
    return res.status(500).json({ error: "Could not save article" });
  }
});

router.delete("/user/saved-articles", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const url = String(req.query.url ?? "");
  if (!url) return res.status(400).json({ error: "url is required" });
  try {
    await prisma.savedArticle.deleteMany({ where: { userId, url } });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "saved-articles delete error");
    return res.status(500).json({ error: "Could not remove article" });
  }
});

export default router;
