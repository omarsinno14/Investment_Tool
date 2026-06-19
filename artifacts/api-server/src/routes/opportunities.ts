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

export default router;
