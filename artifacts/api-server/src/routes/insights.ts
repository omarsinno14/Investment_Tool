/**
 * insights.ts — admin-curated market insights (Phase 14).
 *
 * Public read of published insights; admin-only create/update/delete.
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { requireAdmin } from "../lib/adminGuard.js";

const router = Router();

router.get("/insights", async (_req, res) => {
  try {
    const insights = await prisma.adminInsight.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
    return res.json({ insights });
  } catch (e) {
    logger.error({ err: e }, "insights list error");
    return res.status(500).json({ error: "Could not load insights" });
  }
});

router.get("/admin/insights", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const insights = await prisma.adminInsight.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return res.json({ insights });
  } catch (e) {
    logger.error({ err: e }, "admin insights list error");
    return res.status(500).json({ error: "Could not load insights" });
  }
});

const upsertSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
  category: z.string().max(80).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  published: z.boolean().optional(),
});

router.post("/admin/insights", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid insight" });
  try {
    const insight = await prisma.adminInsight.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        category: parsed.data.category || null,
        imageUrl: parsed.data.imageUrl || null,
        published: parsed.data.published ?? true,
        createdByUserId: adminId,
      },
    });
    return res.json({ insight });
  } catch (e) {
    logger.error({ err: e }, "admin insights create error");
    return res.status(500).json({ error: "Could not create insight" });
  }
});

router.patch("/admin/insights/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid insight" });
  try {
    const insight = await prisma.adminInsight.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category || null } : {}),
        ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl || null } : {}),
        ...(parsed.data.published !== undefined ? { published: parsed.data.published } : {}),
      },
    });
    return res.json({ insight });
  } catch (e) {
    logger.error({ err: e }, "admin insights update error");
    return res.status(500).json({ error: "Could not update insight" });
  }
});

router.delete("/admin/insights/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    await prisma.adminInsight.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "admin insights delete error");
    return res.status(500).json({ error: "Could not delete insight" });
  }
});

export default router;
