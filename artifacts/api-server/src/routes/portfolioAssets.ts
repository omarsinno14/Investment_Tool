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

const ASSET_TYPES = [
  "CASH",
  "STOCKS",
  "ETF",
  "CRYPTO",
  "PRIVATE_EQUITY",
  "REAL_ESTATE",
  "VEHICLE",
  "WATCH",
  "ART",
  "BUSINESS",
  "DEBT",
  "OTHER",
] as const;

const assetTypeEnum = z.enum(ASSET_TYPES);

const createAssetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  assetType: assetTypeEnum,
  currency: z.string().trim().min(1).max(8).optional(),
  currentValue: z.number().finite(),
  costBasis: z.number().finite().nullable().optional(),
  quantity: z.number().finite().nullable().optional(),
  isLiability: z.boolean().optional(),
  passiveIncomeMonthly: z.number().finite().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const updateAssetSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  assetType: assetTypeEnum.optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  currentValue: z.number().finite().optional(),
  costBasis: z.number().finite().nullable().optional(),
  quantity: z.number().finite().nullable().optional(),
  isLiability: z.boolean().optional(),
  passiveIncomeMonthly: z.number().finite().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

function buildSummary(assets: Array<{ assetType: string; currentValue: number; isLiability: boolean; passiveIncomeMonthly: number | null }>) {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalPassiveIncomeMonthly = 0;
  const allocationMap = new Map<string, number>();

  for (const asset of assets) {
    if (asset.isLiability) {
      totalLiabilities += asset.currentValue;
    } else {
      totalAssets += asset.currentValue;
      allocationMap.set(asset.assetType, (allocationMap.get(asset.assetType) ?? 0) + asset.currentValue);
    }
    if (asset.passiveIncomeMonthly != null) {
      totalPassiveIncomeMonthly += asset.passiveIncomeMonthly;
    }
  }

  const allocationByType = Array.from(allocationMap.entries())
    .map(([assetType, value]) => ({
      assetType,
      value,
      pct: totalAssets > 0 ? (value / totalAssets) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    allocationByType,
    totalPassiveIncomeMonthly,
    count: assets.length,
  };
}

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const assets = await prisma.portfolioAsset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const summary = buildSummary(assets);
    return res.json({ assets, summary });
  } catch (e) {
    logger.error({ err: e }, "PortfolioAssets GET error");
    return res.status(500).json({ error: "Failed to load assets" });
  }
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const parsed = createAssetSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid asset", details: parsed.error.flatten() });
  }
  try {
    const d = parsed.data;
    const asset = await prisma.portfolioAsset.create({
      data: {
        userId,
        name: d.name,
        assetType: d.assetType,
        currency: d.currency ?? "USD",
        currentValue: d.currentValue,
        costBasis: d.costBasis ?? null,
        quantity: d.quantity ?? null,
        isLiability: d.isLiability ?? false,
        passiveIncomeMonthly: d.passiveIncomeMonthly ?? null,
        notes: d.notes ?? null,
      },
    });
    return res.status(201).json({ asset });
  } catch (e) {
    logger.error({ err: e }, "PortfolioAssets POST error");
    return res.status(500).json({ error: "Failed to create asset" });
  }
});

router.patch("/:assetId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const parsed = updateAssetSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid asset", details: parsed.error.flatten() });
  }
  try {
    const existing = await prisma.portfolioAsset.findFirst({
      where: { id: req.params.assetId, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Asset not found" });
    }
    const d = parsed.data;
    const data: any = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.assetType !== undefined) data.assetType = d.assetType;
    if (d.currency !== undefined) data.currency = d.currency;
    if (d.currentValue !== undefined) data.currentValue = d.currentValue;
    if (d.costBasis !== undefined) data.costBasis = d.costBasis;
    if (d.quantity !== undefined) data.quantity = d.quantity;
    if (d.isLiability !== undefined) data.isLiability = d.isLiability;
    if (d.passiveIncomeMonthly !== undefined) data.passiveIncomeMonthly = d.passiveIncomeMonthly;
    if (d.notes !== undefined) data.notes = d.notes;

    const asset = await prisma.portfolioAsset.update({
      where: { id: existing.id },
      data,
    });
    return res.json({ asset });
  } catch (e) {
    logger.error({ err: e }, "PortfolioAssets PATCH error");
    return res.status(500).json({ error: "Failed to update asset" });
  }
});

router.delete("/:assetId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const existing = await prisma.portfolioAsset.findFirst({
      where: { id: req.params.assetId, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Asset not found" });
    }
    await prisma.portfolioAsset.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "PortfolioAssets DELETE error");
    return res.status(500).json({ error: "Failed to delete asset" });
  }
});

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get("/export", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const format = (req.query.format === "json" ? "json" : "csv") as "json" | "csv";
  try {
    const assets = await prisma.portfolioAsset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", 'attachment; filename="portfolio-assets.json"');
      return res.send(JSON.stringify({ assets }, null, 2));
    }

    const columns = [
      "name",
      "assetType",
      "currency",
      "currentValue",
      "costBasis",
      "quantity",
      "isLiability",
      "passiveIncomeMonthly",
      "notes",
    ] as const;

    const lines = [columns.join(",")];
    for (const asset of assets) {
      lines.push(columns.map((col) => csvEscape((asset as any)[col])).join(","));
    }
    const csv = lines.join("\r\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="portfolio-assets.csv"');
    return res.send(csv);
  } catch (e) {
    logger.error({ err: e }, "PortfolioAssets export error");
    return res.status(500).json({ error: "Failed to export assets" });
  }
});

export default router;
