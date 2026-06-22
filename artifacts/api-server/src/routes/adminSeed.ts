/**
 * adminSeed.ts
 * POST /api/admin/seed-hubs — idempotently seeds investment-category hubs.
 * Only accessible by ADMIN users.
 */
import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const router = Router();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const INVESTMENT_HUBS: { name: string; description: string }[] = [
  // Traditional
  { name: "Stocks & ETFs", description: "Public equities, index funds, dividend stocks and ETF strategies." },
  { name: "Bonds & Fixed Income", description: "Government bonds, corporate bonds, treasury bills and fixed-income strategies." },
  { name: "Dividend Investing", description: "Dividend stocks, REITs and income-generating investment strategies." },
  { name: "Options & Derivatives", description: "Options, futures, hedging strategies and derivatives trading." },
  // Alternatives
  { name: "Angel Investing", description: "Early-stage startup investments, deal flow and angel syndicate opportunities." },
  { name: "Private Credit", description: "Direct lending, private debt and non-bank financing opportunities." },
  { name: "Hedge Funds", description: "Alternative investment strategies, fund performance and manager analysis." },
  { name: "Revenue-Share Deals", description: "Revenue-share investments — earn a percentage of a company's future revenue." },
  { name: "Infrastructure Investments", description: "Roads, ports, energy grids, telecom towers and infrastructure funds." },
  { name: "Farmland & Agriculture", description: "Agricultural land, crop funds and food production investments." },
  { name: "Carbon Credits", description: "Environmental markets, carbon offset projects and ESG investing." },
  // Business
  { name: "Business Acquisitions", description: "Buying, operating and growing small businesses and micro-cap deals." },
  { name: "E-commerce & SaaS", description: "Acquiring or investing in e-commerce brands, apps and SaaS businesses." },
  { name: "Franchise Opportunities", description: "Franchise investments, locations, operators and expansion funding." },
  { name: "Invoice Factoring", description: "Invoice financing, trade receivables and working capital deals." },
  // Collectibles & Luxury
  { name: "Collectibles & Luxury", description: "Fine art, rare whisky, wine, watches, handbags and alternative collectibles." },
  { name: "Fine Art", description: "Paintings, sculptures, fractional art platforms and blue-chip art investing." },
  { name: "Classic Cars", description: "Rare and investment-grade classic car collecting and deals." },
  { name: "Fine Wine & Whisky", description: "Investment-grade wine, rare whisky casks and collectible spirits." },
  { name: "Luxury Watches", description: "Rolex, Patek Philippe, AP and investment-grade horology." },
  // Digital
  { name: "Bitcoin & Crypto", description: "Bitcoin, Ethereum, crypto ETFs and digital asset investment strategies." },
  { name: "Tokenized Assets", description: "Real-world assets on-chain, tokenized real estate, and blockchain finance." },
  // Commodities
  { name: "Gold & Precious Metals", description: "Gold, silver, platinum and precious metal investment strategies." },
  { name: "Oil & Gas", description: "Energy sector investments, royalties, upstream and downstream opportunities." },
  { name: "Commodities", description: "Agricultural commodities, copper, uranium and raw materials investing." },
  // Music / Media
  { name: "Music Royalties", description: "Investing in song catalogues, streaming royalties and music IP." },
  { name: "Film & Media Finance", description: "Funding films, shows, and content projects for returns." },
];

router.post("/api/admin/seed-hubs", async (req, res) => {
  try {
    // Auth check
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await prisma.user.findUnique({ where: { id: req.session.userId as string }, select: { role: true } });
    if (user?.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

    // Find system bot user
    const systemUser = await prisma.user.findFirst({ where: { email: "system@vertica.app" }, select: { id: true } });
    const ownerUserId = systemUser?.id ?? req.session.userId as string;

    const created: string[] = [];
    const skipped: string[] = [];

    for (const hub of INVESTMENT_HUBS) {
      const slug = slugify(hub.name);
      const exists = await prisma.hub.findUnique({ where: { slug } });
      if (exists) { skipped.push(slug); continue; }
      await prisma.hub.create({
        data: { name: hub.name, slug, description: hub.description, ownerUserId, isPrivate: false },
      });
      created.push(slug);
    }

    logger.info({ created: created.length, skipped: skipped.length }, "Hub seed complete");
    return res.json({ created, skipped, total: INVESTMENT_HUBS.length });
  } catch (e) {
    logger.error({ err: e }, "Seed hubs error");
    return res.status(500).json({ error: "Seed failed" });
  }
});

export default router;
