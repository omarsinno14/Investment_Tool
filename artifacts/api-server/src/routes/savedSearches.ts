import { Router } from "express";
import { z } from "zod";
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

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  filters: z.record(z.string(), z.any()),
  alertsEnabled: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  alertsEnabled: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ savedSearches });
  } catch (e) {
    logger.error({ err: e }, "SavedSearches GET error");
    return res.status(500).json({ error: "Failed to load saved searches" });
  }
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { name, filters, alertsEnabled } = parsed.data;
    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId,
        name,
        filters: filters as any,
        alertsEnabled: alertsEnabled ?? false,
      },
    });
    return res.json({ savedSearch });
  } catch (e) {
    logger.error({ err: e }, "SavedSearches POST error");
    return res.status(500).json({ error: "Failed to create saved search" });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const existing = await prisma.savedSearch.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { name, filters, alertsEnabled } = parsed.data;
    const savedSearch = await prisma.savedSearch.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(filters !== undefined && { filters: filters as any }),
        ...(alertsEnabled !== undefined && { alertsEnabled }),
      },
    });
    return res.json({ savedSearch });
  } catch (e) {
    logger.error({ err: e }, "SavedSearches PATCH error");
    return res.status(500).json({ error: "Failed to update saved search" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const existing = await prisma.savedSearch.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await prisma.savedSearch.delete({ where: { id: req.params.id } });
    return res.json({ deleted: true });
  } catch (e) {
    logger.error({ err: e }, "SavedSearches DELETE error");
    return res.status(500).json({ error: "Failed to delete saved search" });
  }
});

export default router;
