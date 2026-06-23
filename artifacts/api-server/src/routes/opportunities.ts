import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { notifyMatchingUsers } from "../lib/pushNotificationService.js";
import { ensureEntitled, getUserEntitlements } from "../lib/subscription.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

const RISK_LEVELS = new Set([
  "EXTREMELY_LOW",
  "LOW",
  "MEDIUM",
  "MEDIUM_HIGH",
  "HIGH",
  "EXTREMELY_HIGH",
]);
const DEAL_STATUSES = new Set(["DRAFT", "OPEN", "CLOSING_SOON", "FUNDED", "CLOSED"]);
const VERIFICATION_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);

const createdByUserSelect = {
  id: true,
  profile: {
    select: { name: true, username: true, imageUrl: true, identityVerified: true },
  },
} as const;

/** Build the structured deal fields from a request body (validating enums, ignoring unknown). */
function buildDealFields(body: any): Record<string, any> {
  const data: Record<string, any> = {};

  if (body.dealType !== undefined) {
    data.dealType = body.dealType ? String(body.dealType) : null;
  }
  if (body.companyName !== undefined) {
    data.companyName = body.companyName ? String(body.companyName) : null;
  }
  if (body.minInvestment !== undefined) {
    data.minInvestment =
      body.minInvestment === null || body.minInvestment === ""
        ? null
        : Number(body.minInvestment);
  }
  if (body.riskLevel !== undefined) {
    if (body.riskLevel === null || body.riskLevel === "") data.riskLevel = null;
    else if (RISK_LEVELS.has(String(body.riskLevel))) data.riskLevel = String(body.riskLevel);
  }
  if (body.dealStatus !== undefined) {
    if (DEAL_STATUSES.has(String(body.dealStatus))) data.dealStatus = String(body.dealStatus);
  }
  if (body.dealVerification !== undefined) {
    if (VERIFICATION_STATUSES.has(String(body.dealVerification)))
      data.dealVerification = String(body.dealVerification);
  }
  if (body.closingDate !== undefined) {
    data.closingDate = body.closingDate ? new Date(body.closingDate) : null;
  }
  if (body.dealScore !== undefined) {
    data.dealScore =
      body.dealScore === null || body.dealScore === "" ? null : Number(body.dealScore);
  }
  if (body.documentUrls !== undefined) {
    data.documentUrls = Array.isArray(body.documentUrls)
      ? body.documentUrls.map((u: any) => String(u)).filter(Boolean)
      : [];
  }
  if (body.expectedRoiDurationMonths !== undefined) {
    data.expectedRoiDurationMonths =
      body.expectedRoiDurationMonths === null || body.expectedRoiDurationMonths === ""
        ? null
        : Number(body.expectedRoiDurationMonths);
  }
  if (body.categories !== undefined) {
    data.categories = Array.isArray(body.categories)
      ? body.categories.map((c: any) => String(c)).filter(Boolean)
      : typeof body.categories === "string"
      ? body.categories.split(",").map((c: string) => c.trim()).filter(Boolean)
      : [];
  }
  if (body.locationName !== undefined) {
    data.locationName = body.locationName ? String(body.locationName) : null;
  }
  if (body.locationMapUrl !== undefined) {
    data.locationMapUrl = body.locationMapUrl ? String(body.locationMapUrl) : null;
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
  }
  if (body.imageUrls !== undefined) {
    data.imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.map((u: any) => String(u)).filter(Boolean)
      : [];
  }

  return data;
}

/** Compute savesCount / interestedCount per opportunity for a set of ids. */
async function computeActionCounts(opportunityIds: string[]) {
  const map = new Map<string, { savesCount: number; interestedCount: number }>();
  for (const id of opportunityIds) map.set(id, { savesCount: 0, interestedCount: 0 });
  if (opportunityIds.length === 0) return map;

  const grouped = await prisma.opportunityAction.groupBy({
    by: ["opportunityId", "state"],
    where: { opportunityId: { in: opportunityIds } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const entry = map.get(row.opportunityId);
    if (!entry) continue;
    const count = row._count._all;
    if (row.state === "SAVED") entry.savesCount += count;
    else if (row.state === "VERY_INTERESTED" || row.state === "INVESTED")
      entry.interestedCount += count;
  }
  return map;
}

router.get("/opportunities", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const {
      q,
      type,
      tab,
      limit: limitStr,
      cursor,
      category,
      risk,
      minInvestment,
      currency,
      location,
      horizon,
      minReturn,
      verification,
      status,
      sort,
    } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);
    const search = (q ?? "").trim().toLowerCase();

    // Advanced filters/sorts are a Plus+ entitlement. Enforce server-side so a
    // Free user cannot apply them by calling the API directly (basic search by
    // query/category and newest/closing/trending sorts stay open to everyone).
    const usesAdvancedFilter =
      [risk, minInvestment, currency, location, horizon, minReturn, verification, status].some(
        (v) => v !== undefined && String(v).trim() !== "" && String(v).trim() !== "All",
      ) ||
      sort === "mostSaved" ||
      sort === "highestInterest";
    if (usesAdvancedFilter) {
      if (
        !(await ensureEntitled(res, userId, (e) => e.advancedFilters, {
          feature: "advancedFilters",
          message: "Advanced filters and sorting require Vertica Plus.",
        }))
      )
        return;
    }

    const where: any = {};
    if (type === "headlines") where.createdByUserId = null;
    else if (type === "community") where.createdByUserId = { not: null };

    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
          { companyName: { contains: search, mode: "insensitive" } },
          { tags: { has: search } },
        ],
      });
    }

    const categoryVal = (category ?? "").trim();
    if (categoryVal && categoryVal !== "All") {
      andConditions.push({ categories: { has: categoryVal } });
    }

    const riskVal = (risk ?? "").trim();
    if (riskVal && RISK_LEVELS.has(riskVal)) {
      andConditions.push({ riskLevel: riskVal });
    }

    if (minInvestment !== undefined && String(minInvestment).trim() !== "") {
      const v = Number(minInvestment);
      if (Number.isFinite(v)) {
        andConditions.push({ OR: [{ minInvestment: { lte: v } }, { minInvestment: null }] });
      }
    }

    const currencyVal = (currency ?? "").trim();
    if (currencyVal && currencyVal !== "All") {
      andConditions.push({ askCurrency: currencyVal });
    }

    const locationVal = (location ?? "").trim();
    if (locationVal) {
      andConditions.push({ locationName: { contains: locationVal, mode: "insensitive" } });
    }

    if (horizon !== undefined && String(horizon).trim() !== "") {
      const v = Number(horizon);
      if (Number.isFinite(v)) {
        andConditions.push({ expectedRoiDurationMonths: { lte: v } });
      }
    }

    if (minReturn !== undefined && String(minReturn).trim() !== "") {
      const v = Number(minReturn);
      if (Number.isFinite(v)) {
        andConditions.push({ expectedRoiPercent: { gte: v } });
      }
    }

    const verificationVal = (verification ?? "").trim();
    if (verificationVal && VERIFICATION_STATUSES.has(verificationVal)) {
      andConditions.push({ dealVerification: verificationVal });
    }

    const statusVal = (status ?? "").trim();
    if (statusVal && DEAL_STATUSES.has(statusVal)) {
      andConditions.push({ dealStatus: statusVal });
    }

    if (andConditions.length) where.AND = andConditions;

    const sortVal = (sort ?? "").trim();
    let orderBy: any;
    switch (sortVal) {
      case "closingSoon":
        orderBy = [{ closingDate: "asc" }, { fetchedAt: "desc" }];
        break;
      case "trending":
        orderBy = [{ boostedAt: "desc" }, { fetchedAt: "desc" }];
        break;
      case "newest":
        orderBy = [{ fetchedAt: "desc" }];
        break;
      default:
        orderBy =
          tab === "trending"
            ? [{ boostedAt: "desc" }, { fetchedAt: "desc" }]
            : [{ fetchedAt: "desc" }];
    }

    // Count-based sorts (mostSaved/highestInterest) rank by aggregates that are not
    // DB columns, so they cannot be combined with cursor pagination (the cursor order
    // would differ from the returned order, causing duplicates/gaps across pages).
    // For these we fetch a bounded window, sort in memory, and return a single page.
    const isCountSort = sortVal === "mostSaved" || sortVal === "highestInterest";
    const COUNT_SORT_WINDOW = 100;
    const cursorObj = cursor ? { id: cursor } : undefined;

    const items = await prisma.opportunity.findMany({
      where,
      orderBy,
      take: isCountSort ? COUNT_SORT_WINDOW : limit + 1,
      cursor: isCountSort ? undefined : cursorObj,
      skip: isCountSort ? 0 : cursorObj ? 1 : 0,
      include: {
        createdByUser: { select: createdByUserSelect },
        actions: { where: { userId }, take: 1 },
      },
    });

    const hasMore = !isCountSort && items.length > limit;
    const data = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    const countsMap = await computeActionCounts(data.map((o) => o.id));

    let opportunities = data.map((o) => {
      const counts = countsMap.get(o.id) ?? { savesCount: 0, interestedCount: 0 };
      const viewerState = o.actions[0]?.state ?? "NONE";
      return {
        ...o,
        savesCount: counts.savesCount,
        interestedCount: counts.interestedCount,
        viewerState,
      };
    });

    if (sortVal === "mostSaved") {
      opportunities.sort((a, b) => b.savesCount - a.savesCount);
      opportunities = opportunities.slice(0, limit);
    } else if (sortVal === "highestInterest") {
      opportunities.sort((a, b) => b.interestedCount - a.interestedCount);
      opportunities = opportunities.slice(0, limit);
    }

    return res.json({ opportunities, nextCursor, viewerId: userId });
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
        createdByUser: { select: createdByUserSelect },
        actions: { where: { userId }, take: 1 },
      },
    });
    if (!opp) return res.status(404).json({ error: "Not found" });

    const countsMap = await computeActionCounts([opp.id]);
    const counts = countsMap.get(opp.id) ?? { savesCount: 0, interestedCount: 0 };
    const viewerState = opp.actions[0]?.state ?? "NONE";

    // Lead/interest identities (the "who is interested" list) are a deal-owner
    // capability — only the opportunity's creator sees them. Everyone else gets
    // the aggregate interestedCount as social proof, never the member list.
    let interestedUsers: Array<{
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
    }> = [];
    if (opp.createdByUserId && opp.createdByUserId === userId) {
      const interestedActions = await prisma.opportunityAction.findMany({
        where: { opportunityId: opp.id, state: { in: ["VERY_INTERESTED", "INVESTED"] } },
        take: 50,
        orderBy: { updatedAt: "desc" },
        select: {
          user: {
            select: { id: true, profile: { select: { name: true, imageUrl: true } } },
          },
        },
      });
      interestedUsers = interestedActions.map((a) => ({
        id: a.user.id,
        displayName: a.user.profile?.name ?? null,
        avatarUrl: a.user.profile?.imageUrl ?? null,
      }));
    }

    // Related opportunities sharing any category/tag
    const relatedMatchers: any[] = [];
    if (opp.categories.length) relatedMatchers.push({ categories: { hasSome: opp.categories } });
    if (opp.tags.length) relatedMatchers.push({ tags: { hasSome: opp.tags } });

    let relatedOpportunities: any[] = [];
    if (relatedMatchers.length) {
      relatedOpportunities = await prisma.opportunity.findMany({
        where: { id: { not: opp.id }, OR: relatedMatchers },
        take: 6,
        orderBy: [{ boostedAt: "desc" }, { fetchedAt: "desc" }],
        select: {
          id: true,
          title: true,
          companyName: true,
          minInvestment: true,
          expectedRoiPercent: true,
          riskLevel: true,
          dealStatus: true,
          imageUrl: true,
        },
      });
    }

    const opportunity = {
      ...opp,
      savesCount: counts.savesCount,
      interestedCount: counts.interestedCount,
      viewerState,
      interestedUsers,
      relatedOpportunities,
    };

    return res.json({ opportunity });
  } catch (e) {
    logger.error({ err: e }, "Opportunity GET error");
    return res.status(500).json({ error: "Failed to load opportunity" });
  }
});

router.post("/opportunities", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  if (
    !(await ensureEntitled(res, userId, (e) => e.canPostOpportunities, {
      feature: "canPostOpportunities",
      message: "Posting opportunities requires a Business or Elite plan.",
    }))
  )
    return;
  try {
    const body = req.body;
    if (!body?.title) return res.status(400).json({ error: "Title is required" });

    const tags = Array.isArray(body.tags)
      ? body.tags
      : typeof body.tags === "string"
      ? body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const opp = await prisma.opportunity.create({
      data: {
        title: body.title,
        url: body.url ?? null,
        summary: body.summary ?? null,
        details: body.details ?? null,
        askAmount: body.askAmount ? Number(body.askAmount) : null,
        askCurrency: body.askCurrency ?? "USD",
        expectedRoiPercent: body.expectedRoiPercent ? Number(body.expectedRoiPercent) : null,
        tags,
        countryTags: Array.isArray(body.countryTags) ? body.countryTags : [],
        cityTags: Array.isArray(body.cityTags) ? body.cityTags : [],
        assetTags: Array.isArray(body.assetTags) ? body.assetTags : [],
        strategyTags: Array.isArray(body.strategyTags) ? body.strategyTags : [],
        createdByUserId: userId,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        ...buildDealFields(body),
      },
    });

    // Fire-and-forget: notify users whose interests match this opportunity
    notifyMatchingUsers({ id: opp.id, title: opp.title, tags: opp.tags, countryTags: opp.countryTags, summary: opp.summary }).catch((e) =>
      logger.error({ err: e }, "Push notification error")
    );

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

    // Free plan caps the number of SAVED opportunities. Only enforce when
    // transitioning a not-yet-saved opportunity into SAVED (re-saving an
    // already-saved deal, or any other state change, is unaffected).
    if (state === "SAVED") {
      const entitlements = await getUserEntitlements(userId);
      const savedLimit = entitlements.savedOpportunityLimit;
      if (savedLimit !== null) {
        const existing = await prisma.opportunityAction.findUnique({
          where: { userId_opportunityId: { userId, opportunityId: req.params.id } },
          select: { state: true },
        });
        if (existing?.state !== "SAVED") {
          const savedCount = await prisma.opportunityAction.count({
            where: { userId, state: "SAVED" },
          });
          if (savedCount >= savedLimit) {
            return res.status(403).json({
              error: "upgrade_required",
              feature: "savedOpportunityLimit",
              message: `Free members can save up to ${savedLimit} opportunities. Upgrade to Vertica Plus for unlimited saves.`,
            });
          }
        }
      }
    }

    const action = await prisma.opportunityAction.upsert({
      where: { userId_opportunityId: { userId, opportunityId: req.params.id } },
      create: {
        userId,
        opportunityId: req.params.id,
        state: state ?? "NONE",
        investedAmt: investedAmt ? Number(investedAmt) : null,
        notes: notes ?? null,
      },
      update: {
        state: state ?? "NONE",
        investedAmt: investedAmt ? Number(investedAmt) : null,
        notes: notes ?? null,
      },
    });
    return res.json({ action });
  } catch (e) {
    logger.error({ err: e }, "Opportunity action error");
    return res.status(500).json({ error: "Failed to update action" });
  }
});

router.post("/user/opportunities", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  if (
    !(await ensureEntitled(res, userId, (e) => e.canPostOpportunities, {
      feature: "canPostOpportunities",
      message: "Posting opportunities requires a Business or Elite plan.",
    }))
  )
    return;
  try {
    const body = req.body;
    if (!body?.title) return res.status(400).json({ error: "Title is required" });

    const tags = Array.isArray(body.tags)
      ? body.tags
      : typeof body.tags === "string"
      ? body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const opp = await prisma.opportunity.create({
      data: {
        title: body.title,
        summary: body.summary ?? null,
        details: body.details ?? null,
        askAmount: body.askAmount ? Number(body.askAmount) : null,
        askCurrency: body.askCurrency ?? "USD",
        expectedRoiPercent: body.expectedRoiPercent ? Number(body.expectedRoiPercent) : null,
        tags,
        createdByUserId: userId,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        ...buildDealFields(body),
      },
    });

    // Notify matching users
    notifyMatchingUsers({ id: opp.id, title: opp.title, tags: opp.tags, summary: opp.summary }).catch((e) =>
      logger.error({ err: e }, "Push notification error")
    );

    return res.json({ opportunity: opp });
  } catch (e) {
    logger.error({ err: e }, "User opportunity POST error");
    return res.status(500).json({ error: "Failed to create opportunity" });
  }
});

router.delete("/opportunities/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const opp = await prisma.opportunity.findFirst({
      where: { id: req.params.id, createdByUserId: userId },
    });
    if (!opp) return res.status(404).json({ error: "Not found" });
    await prisma.opportunity.delete({ where: { id: req.params.id } });
    return res.json({ deleted: true });
  } catch (e) {
    logger.error({ err: e }, "Opportunity DELETE error");
    return res.status(500).json({ error: "Failed to delete opportunity" });
  }
});

router.patch("/opportunities/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const opp = await prisma.opportunity.findFirst({
      where: { id: req.params.id, createdByUserId: userId },
    });
    if (!opp) return res.status(404).json({ error: "Not found" });
    const { title, summary, tags } = req.body ?? {};
    const updated = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(summary !== undefined && { summary }),
        ...(tags !== undefined && {
          tags: Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        }),
        ...buildDealFields(req.body ?? {}),
      },
    });
    return res.json({ opportunity: updated });
  } catch (e) {
    logger.error({ err: e }, "Opportunity PATCH error");
    return res.status(500).json({ error: "Failed to update opportunity" });
  }
});

export default router;
