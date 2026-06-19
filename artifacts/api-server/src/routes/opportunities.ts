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

router.get("/opportunities", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q, type, tab, limit: limitStr, cursor } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const search = (q ?? "").trim().toLowerCase();

    const where: any = {};
    if (type === "headlines") where.createdByUserId = null;
    else if (type === "community") where.createdByUserId = { not: null };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const cursorObj = cursor ? { id: cursor } : undefined;

    const items = await prisma.opportunity.findMany({
      where,
      orderBy: tab === "trending" ? [{ boostedAt: "desc" }, { fetchedAt: "desc" }] : [{ fetchedAt: "desc" }],
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      include: {
        createdByUser: {
          select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } },
        },
        actions: { where: { userId }, take: 1 },
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return res.json({ opportunities: data, nextCursor });
  } catch (e) {
    logger.error({ err: e }, "Opportunities GET error");
    return res.status(500).json({ error: "Failed to load opportunities" });
  }
});

router.get("/opportunities/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const opp = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      include: {
        createdByUser: {
          select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } },
        },
        actions: { where: { userId }, take: 1 },
      },
    });
    if (!opp) return res.status(404).json({ error: "Not found" });
    return res.json({ opportunity: opp });
  } catch (e) {
    logger.error({ err: e }, "Opportunity GET error");
    return res.status(500).json({ error: "Failed to load opportunity" });
  }
});

router.post("/opportunities", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const body = req.body;
    if (!body?.title) return res.status(400).json({ error: "Title is required" });
    const opp = await prisma.opportunity.create({
      data: {
        title: body.title,
        url: body.url ?? null,
        summary: body.summary ?? null,
        details: body.details ?? null,
        askAmount: body.askAmount ? Number(body.askAmount) : null,
        askCurrency: body.askCurrency ?? "USD",
        tags: Array.isArray(body.tags) ? body.tags : [],
        countryTags: Array.isArray(body.countryTags) ? body.countryTags : [],
        cityTags: Array.isArray(body.cityTags) ? body.cityTags : [],
        assetTags: Array.isArray(body.assetTags) ? body.assetTags : [],
        strategyTags: Array.isArray(body.strategyTags) ? body.strategyTags : [],
        createdByUserId: userId,
        publishedAt: new Date(),
        fetchedAt: new Date(),
      },
    });
    return res.json({ opportunity: opp });
  } catch (e) {
    logger.error({ err: e }, "Opportunity POST error");
    return res.status(500).json({ error: "Failed to create opportunity" });
  }
});

router.post("/opportunities/:id/action", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { state, investedAmt, notes } = req.body ?? {};
    const action = await prisma.opportunityAction.upsert({
      where: { userId_opportunityId: { userId, opportunityId: req.params.id } },
      create: { userId, opportunityId: req.params.id, state: state ?? "NONE", investedAmt: investedAmt ? Number(investedAmt) : null, notes: notes ?? null },
      update: { state: state ?? "NONE", investedAmt: investedAmt ? Number(investedAmt) : null, notes: notes ?? null },
    });
    return res.json({ action });
  } catch (e) {
    logger.error({ err: e }, "Opportunity action error");
    return res.status(500).json({ error: "Failed to update action" });
  }
});

router.get("/user/opportunities", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { limit: limitStr, cursor, status } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const where: any = { createdByUserId: userId };
    if (status === "archived") where.archivedAt = { not: null };
    else if (!status || status === "active") where.archivedAt = null;

    const cursorObj = cursor ? { id: cursor } : undefined;
    const items = await prisma.opportunity.findMany({
      where,
      orderBy: { fetchedAt: "desc" },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      include: {
        createdByUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        actions: { where: { userId }, take: 1 },
      },
    });
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;
    return res.json({ opportunities: data, nextCursor });
  } catch (e) {
    logger.error({ err: e }, "User opportunities GET error");
    return res.status(500).json({ error: "Failed to load opportunities" });
  }
});

router.post("/user/opportunities", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const body: Record<string, any> = {};
    for (const [k, v] of Object.entries(req.body ?? {})) {
      body[k] = v;
    }
    const title = body.title ?? body.get?.("title");
    if (!title) return res.status(400).json({ error: "Title is required" });

    const opp = await prisma.opportunity.create({
      data: {
        title: String(title),
        summary: body.summary ? String(body.summary) : null,
        details: body.details ? String(body.details) : null,
        askAmount: body.askAmount ? Number(body.askAmount) : null,
        askCurrency: body.askCurrency ? String(body.askCurrency) : "USD",
        expectedRoiPercent: body.expectedRoiPercent ? Number(body.expectedRoiPercent) : null,
        expectedRoiDurationMonths: body.expectedRoiDurationMonths ? Number(body.expectedRoiDurationMonths) : null,
        benefits: body.benefits ? String(body.benefits) : null,
        contactEmail: body.contactEmail ? String(body.contactEmail) : null,
        contactPhone: body.contactPhone ? String(body.contactPhone) : null,
        contactUsername: body.contactUsername ? String(body.contactUsername) : null,
        locationName: body.locationName ? String(body.locationName) : null,
        locationMapUrl: body.locationMapUrl ? String(body.locationMapUrl) : null,
        tags: body.tags ? (Array.isArray(body.tags) ? body.tags : String(body.tags).split(",").map((t: string) => t.trim()).filter(Boolean)) : [],
        createdByUserId: userId,
        publishedAt: new Date(),
        fetchedAt: new Date(),
      },
    });
    return res.json({ opportunity: opp });
  } catch (e) {
    logger.error({ err: e }, "User opportunity POST error");
    return res.status(500).json({ error: "Failed to create opportunity" });
  }
});

router.get("/user/opportunities/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const opp = await prisma.opportunity.findFirst({
      where: { id: req.params.id, createdByUserId: userId },
      include: {
        createdByUser: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
        actions: { where: { userId }, take: 1 },
      },
    });
    if (!opp) return res.status(404).json({ error: "Not found" });
    return res.json({ opportunity: opp });
  } catch (e) {
    logger.error({ err: e }, "User opportunity GET error");
    return res.status(500).json({ error: "Failed to load opportunity" });
  }
});

router.patch("/user/opportunities/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const opp = await prisma.opportunity.findFirst({ where: { id: req.params.id, createdByUserId: userId } });
    if (!opp) return res.status(404).json({ error: "Not found" });

    const body = req.body ?? {};
    const updateData: any = {};
    const allowed = ["title", "summary", "details", "askAmount", "askCurrency", "expectedRoiPercent", "expectedRoiDurationMonths", "benefits", "contactEmail", "contactPhone", "contactUsername", "locationName", "locationMapUrl", "tags"];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if ("archived" in body) updateData.archivedAt = body.archived ? new Date() : null;
    if (body.repost) updateData.publishedAt = new Date();

    const updated = await prisma.opportunity.update({ where: { id: req.params.id }, data: updateData });
    return res.json({ opportunity: updated });
  } catch (e) {
    logger.error({ err: e }, "User opportunity PATCH error");
    return res.status(500).json({ error: "Failed to update opportunity" });
  }
});

router.delete("/user/opportunities/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const opp = await prisma.opportunity.findFirst({ where: { id: req.params.id, createdByUserId: userId } });
    if (!opp) return res.status(404).json({ error: "Not found" });
    await prisma.opportunity.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "User opportunity DELETE error");
    return res.status(500).json({ error: "Failed to delete opportunity" });
  }
});

router.post("/upload", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  return res.status(501).json({ error: "File upload not yet supported" });
});

export default router;
