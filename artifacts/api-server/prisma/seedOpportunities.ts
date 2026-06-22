/**
 * Seed script — creates rich, realistic, compliance-safe investment opportunities.
 * Run with: cd artifacts/api-server && npx tsx prisma/seedOpportunities.ts
 *
 * Idempotent: skips any opportunity whose title already exists.
 * Compliance: no "guaranteed" language — all returns are projected/target/estimated.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type RiskLevel =
  | "EXTREMELY_LOW"
  | "LOW"
  | "MEDIUM"
  | "MEDIUM_HIGH"
  | "HIGH"
  | "EXTREMELY_HIGH";
type DealStatus = "DRAFT" | "OPEN" | "CLOSING_SOON" | "FUNDED" | "CLOSED";
type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

interface SeedOpp {
  title: string;
  companyName: string;
  summary: string;
  details: string;
  dealType: string;
  categories: string[];
  minInvestment: number;
  askAmount: number;
  askCurrency: string;
  expectedRoiPercent: number;
  expectedRoiDurationMonths: number;
  riskLevel: RiskLevel;
  dealStatus: DealStatus;
  dealVerification: VerificationStatus;
  locationName: string;
  tags: string[];
  documentUrls: string[];
  closingInDays: number;
  dealScore: number;
  imageUrl: string;
}

const OPPORTUNITIES: SeedOpp[] = [
  {
    title: "Riverside Logistics Park — Stabilized Industrial Income",
    companyName: "Meridian Industrial Partners",
    summary:
      "A fully-leased last-mile logistics park near a major distribution corridor, offering projected stabilized cash yield from creditworthy tenants.",
    details:
      "Riverside Logistics Park comprises three Class-A warehouse buildings totaling 420,000 sq ft, located within eight miles of an interstate interchange and a regional rail hub. The asset is 100% leased to four national tenants on weighted-average lease terms of 7.2 years, with contractual annual rent escalations of 3%.\n\nMeridian Industrial Partners has owned and operated logistics assets across the region for over a decade. The business plan is income-focused: collect contracted rent, maintain the buildings, and refinance at a targeted hold of five years. Projected returns are driven primarily by in-place cash flow rather than speculative appreciation.\n\nInvestors receive quarterly distribution reports and access to a secure data room containing leases, the rent roll, and third-party property condition reports. All figures are estimates based on current leases and may vary with market conditions.",
    dealType: "Real Estate",
    categories: ["Real Estate", "Industrial", "Income"],
    minInvestment: 25000,
    askAmount: 8500000,
    askCurrency: "USD",
    expectedRoiPercent: 11.5,
    expectedRoiDurationMonths: 60,
    riskLevel: "LOW",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "Columbus, Ohio, USA",
    tags: ["real-estate", "industrial", "logistics", "income", "warehouse"],
    documentUrls: [
      "https://docs.example.com/riverside-logistics/offering-memorandum.pdf",
      "https://docs.example.com/riverside-logistics/rent-roll.pdf",
    ],
    closingInDays: 45,
    dealScore: 88,
    imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200",
  },
  {
    title: "Helio Grid — Distributed Solar Portfolio",
    companyName: "Helio Renewable Energy",
    summary:
      "A diversified portfolio of commercial rooftop and community solar projects backed by long-term power purchase agreements.",
    details:
      "Helio Grid aggregates 38 operating solar installations across commercial rooftops, municipal buildings, and two community solar farms, totaling 24 MW of capacity. Each project sells electricity under 15- to 20-year power purchase agreements with investment-grade offtakers, producing contracted, inflation-linked revenue.\n\nThe portfolio is already energized and generating, removing construction risk from the investment. Helio's operations team handles monitoring, maintenance, and warranty management. The projected return blends contracted cash distributions with the residual value of the assets at the end of the hold period.\n\nThe data room includes the PPAs, engineering reports, production data, and independent yield assessments. Energy production estimates are based on historical irradiance data and are subject to weather variability.",
    dealType: "Renewable Energy",
    categories: ["Renewable Energy", "Infrastructure", "Income"],
    minInvestment: 10000,
    askAmount: 6200000,
    askCurrency: "USD",
    expectedRoiPercent: 9.8,
    expectedRoiDurationMonths: 84,
    riskLevel: "LOW",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "Phoenix, Arizona, USA",
    tags: ["renewable", "solar", "energy", "infrastructure", "esg"],
    documentUrls: [
      "https://docs.example.com/helio-grid/portfolio-summary.pdf",
      "https://docs.example.com/helio-grid/ppa-overview.pdf",
    ],
    closingInDays: 60,
    dealScore: 84,
    imageUrl: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200",
  },
  {
    title: "Northwind AI — Seed Round in Workflow Automation",
    companyName: "Northwind Labs",
    summary:
      "Seed-stage equity in a B2B platform automating document-heavy back-office workflows for mid-market finance teams.",
    details:
      "Northwind Labs builds an AI-assisted workflow platform that automates invoice processing, reconciliation, and approvals for finance teams at mid-market companies. The company has reached early commercial traction with 22 paying customers and annual recurring revenue growing month over month.\n\nThis seed round funds expansion of the engineering and go-to-market teams. The founders previously built and sold a fintech tooling company, and the round is led by an experienced enterprise SaaS fund. As an early-stage equity investment, outcomes are highly uncertain and a total loss of capital is possible.\n\nThe data room includes the pitch deck, financial model, cap table, and customer references. Projected growth figures are management estimates and should be treated as illustrative, not as promises of performance.",
    dealType: "Startup Equity",
    categories: ["Startup Equity", "Technology", "SaaS"],
    minInvestment: 5000,
    askAmount: 3000000,
    askCurrency: "USD",
    expectedRoiPercent: 0,
    expectedRoiDurationMonths: 72,
    riskLevel: "EXTREMELY_HIGH",
    dealStatus: "CLOSING_SOON",
    dealVerification: "APPROVED",
    locationName: "Austin, Texas, USA",
    tags: ["startup", "equity", "ai", "saas", "seed"],
    documentUrls: [
      "https://docs.example.com/northwind-ai/pitch-deck.pdf",
      "https://docs.example.com/northwind-ai/cap-table.pdf",
    ],
    closingInDays: 14,
    dealScore: 76,
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200",
  },
  {
    title: "Atlas Private Credit Fund III — Senior Secured Lending",
    companyName: "Atlas Capital Management",
    summary:
      "A diversified private credit fund originating senior secured loans to established lower-middle-market businesses.",
    details:
      "Atlas Private Credit Fund III provides senior secured, floating-rate loans to profitable lower-middle-market companies across defensive sectors such as healthcare services, business services, and specialty manufacturing. Loans are first-lien, covenant-protected, and typically backed by enterprise value coverage of two times or more.\n\nThe manager has deployed three prior vehicles with a disciplined underwriting process and an emphasis on capital preservation. Income is generated from contractual interest and origination fees, with target distributions paid quarterly. Floating-rate exposure provides a degree of protection in a rising-rate environment.\n\nThe fund's documents include the private placement memorandum, the limited partnership agreement, and the track record of prior funds. Projected yields are estimates based on the current pipeline and prevailing base rates; actual results depend on borrower performance.",
    dealType: "Private Credit",
    categories: ["Private Credit", "Fixed Income", "Income"],
    minInvestment: 50000,
    askAmount: 25000000,
    askCurrency: "USD",
    expectedRoiPercent: 10.5,
    expectedRoiDurationMonths: 48,
    riskLevel: "MEDIUM",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "New York, New York, USA",
    tags: ["private-credit", "lending", "income", "fixed-income"],
    documentUrls: [
      "https://docs.example.com/atlas-fund-iii/ppm.pdf",
      "https://docs.example.com/atlas-fund-iii/track-record.pdf",
    ],
    closingInDays: 90,
    dealScore: 82,
    imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200",
  },
  {
    title: "Evergreen Venture Fund II — Early-Stage Climate Tech",
    companyName: "Evergreen Ventures",
    summary:
      "A venture fund investing in seed and Series A climate technology startups across energy, materials, and food systems.",
    details:
      "Evergreen Venture Fund II targets 25 to 30 early-stage climate technology companies, building a diversified portfolio across grid software, advanced materials, carbon management, and sustainable food systems. The strategy spreads risk across many positions, anticipating that a small number of outsized winners will drive overall fund returns.\n\nThe partners bring operating and investing experience from prior climate and deep-tech funds, along with a network of corporate partners who can serve as pilot customers and acquirers. Venture investing is illiquid and high risk; many portfolio companies may fail, and capital is locked up for the life of the fund.\n\nFund materials include the strategy deck, the LPA, and case studies from the predecessor fund. Any projected multiples are illustrative scenarios, not commitments.",
    dealType: "Venture Fund",
    categories: ["Venture Fund", "Climate Tech", "Technology"],
    minInvestment: 25000,
    askAmount: 40000000,
    askCurrency: "USD",
    expectedRoiPercent: 0,
    expectedRoiDurationMonths: 120,
    riskLevel: "HIGH",
    dealStatus: "OPEN",
    dealVerification: "PENDING",
    locationName: "San Francisco, California, USA",
    tags: ["venture", "fund", "climate", "deep-tech"],
    documentUrls: [
      "https://docs.example.com/evergreen-fund-ii/strategy-deck.pdf",
      "https://docs.example.com/evergreen-fund-ii/lpa.pdf",
    ],
    closingInDays: 75,
    dealScore: 74,
    imageUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200",
  },
  {
    title: "Harbor & Vine — Boutique Hospitality Acquisition",
    companyName: "Harbor & Vine Hospitality",
    summary:
      "Acquisition and repositioning of a 48-room boutique hotel in an established coastal tourism market.",
    details:
      "Harbor & Vine Hospitality is acquiring a 48-room boutique hotel in a well-visited coastal town with consistent year-round occupancy. The business plan involves a light renovation of guest rooms and common areas, the addition of a food-and-beverage offering, and the introduction of dynamic revenue management to improve average daily rate.\n\nThe sponsor operates several boutique properties and has a repeatable playbook for repositioning under-managed hotels. Projected returns combine operating cash flow during the hold with a targeted sale at a stabilized valuation. Hospitality income is seasonal and sensitive to travel demand.\n\nThe data room contains historical operating statements, the renovation budget, the franchise and management agreements, and a market study. All forward-looking figures are estimates and depend on execution and market conditions.",
    dealType: "Hospitality",
    categories: ["Hospitality", "Real Estate"],
    minInvestment: 20000,
    askAmount: 5400000,
    askCurrency: "USD",
    expectedRoiPercent: 14.0,
    expectedRoiDurationMonths: 54,
    riskLevel: "MEDIUM_HIGH",
    dealStatus: "CLOSING_SOON",
    dealVerification: "APPROVED",
    locationName: "Charleston, South Carolina, USA",
    tags: ["hospitality", "hotel", "real-estate", "value-add"],
    documentUrls: [
      "https://docs.example.com/harbor-vine/business-plan.pdf",
      "https://docs.example.com/harbor-vine/operating-statements.pdf",
    ],
    closingInDays: 21,
    dealScore: 79,
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200",
  },
  {
    title: "Prairie Roots — Row-Crop Farmland Fund",
    companyName: "Prairie Roots Agriculture",
    summary:
      "A farmland fund acquiring productive row-crop acreage leased to experienced operators on cash-rent terms.",
    details:
      "Prairie Roots assembles a portfolio of productive row-crop farmland in established agricultural regions, leasing each parcel to vetted local operators under cash-rent agreements. The strategy aims to deliver steady rental income with the potential for long-term land value appreciation, historically a low-correlation, inflation-resilient asset class.\n\nThe team conducts soil quality analysis, water-rights review, and operator due diligence before each acquisition. Income is generated primarily from annual cash rent, with land appreciation contributing to total return upon eventual sale. Agricultural returns can be affected by commodity prices, weather, and input costs.\n\nThe data room includes appraisals, soil reports, lease agreements, and regional yield data. Projected appreciation is an estimate based on historical trends and is not assured.",
    dealType: "Farmland",
    categories: ["Farmland", "Agriculture", "Income"],
    minInvestment: 15000,
    askAmount: 9800000,
    askCurrency: "USD",
    expectedRoiPercent: 8.5,
    expectedRoiDurationMonths: 96,
    riskLevel: "LOW",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "Des Moines, Iowa, USA",
    tags: ["farmland", "agriculture", "income", "real-assets"],
    documentUrls: [
      "https://docs.example.com/prairie-roots/fund-overview.pdf",
      "https://docs.example.com/prairie-roots/appraisals.pdf",
    ],
    closingInDays: 120,
    dealScore: 81,
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200",
  },
  {
    title: "Cascade Web3 Infrastructure — Staking & Validator Network",
    companyName: "Cascade Digital",
    summary:
      "Equity exposure to a regulated digital-asset infrastructure operator running institutional staking and validator services.",
    details:
      "Cascade Digital operates institutional-grade validator nodes and staking infrastructure across several established proof-of-stake networks. Revenue is generated from staking rewards and service fees charged to institutional clients who delegate assets to Cascade's secure, audited infrastructure.\n\nThe company emphasizes operational security, with slashing protection, redundant infrastructure, and third-party security audits. Digital-asset markets are volatile and evolving; protocol changes, regulatory shifts, and token price movements can materially affect results. This investment is suitable only for those who understand and accept significant risk.\n\nThe data room includes the operating overview, security audit summaries, and financials. Projected yields reflect current network conditions and fee structures, which can change without notice.",
    dealType: "Crypto/Web3",
    categories: ["Crypto/Web3", "Technology", "Infrastructure"],
    minInvestment: 10000,
    askAmount: 4500000,
    askCurrency: "USD",
    expectedRoiPercent: 18.0,
    expectedRoiDurationMonths: 36,
    riskLevel: "EXTREMELY_HIGH",
    dealStatus: "OPEN",
    dealVerification: "PENDING",
    locationName: "Singapore",
    tags: ["crypto", "web3", "staking", "blockchain", "infrastructure"],
    documentUrls: [
      "https://docs.example.com/cascade-digital/overview.pdf",
      "https://docs.example.com/cascade-digital/security-audit.pdf",
    ],
    closingInDays: 30,
    dealScore: 68,
    imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200",
  },
  {
    title: "Heritage Catalogue — Music Royalty Acquisition",
    companyName: "Heritage Royalties",
    summary:
      "Acquisition of a diversified catalogue of music royalties generating recurring streaming and licensing income.",
    details:
      "Heritage Royalties is acquiring a diversified catalogue of music rights spanning multiple genres and decades, with revenue derived from streaming, synchronization licensing, and performance royalties. Catalogue income tends to be relatively stable and uncorrelated to public markets, as listeners continue to stream established songs regardless of economic cycles.\n\nThe team uses historical royalty statements to model durable cash flow and applies active licensing efforts to grow sync placements in film, television, and advertising. Income can fluctuate with streaming platform payout rates and changes in consumption patterns.\n\nThe data room includes royalty statements, the catalogue schedule, and the rights verification report. Projected yields are estimates derived from trailing royalty data and may differ from future collections.",
    dealType: "Royalties",
    categories: ["Royalties", "Media", "Income"],
    minInvestment: 5000,
    askAmount: 7200000,
    askCurrency: "USD",
    expectedRoiPercent: 9.0,
    expectedRoiDurationMonths: 120,
    riskLevel: "MEDIUM",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "Nashville, Tennessee, USA",
    tags: ["royalties", "music", "income", "media", "ip"],
    documentUrls: [
      "https://docs.example.com/heritage-royalties/catalogue-schedule.pdf",
      "https://docs.example.com/heritage-royalties/royalty-statements.pdf",
    ],
    closingInDays: 50,
    dealScore: 80,
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200",
  },
  {
    title: "Summit Auto Group — Small Business Acquisition",
    companyName: "Summit Operating Co.",
    summary:
      "Acquisition of two profitable independent auto-service centers with a plan to professionalize operations and expand.",
    details:
      "Summit Operating Co. is acquiring two established, profitable auto-service centers in a growing suburban market. Both businesses have loyal customer bases and long-tenured staff. The acquisition follows an entrepreneurship-through-acquisition model, installing a dedicated operator-CEO to professionalize systems, improve marketing, and add service bays.\n\nThe plan targets organic growth through better scheduling, fleet-service contracts, and modest price optimization, followed by potential tuck-in acquisitions of nearby shops. Returns are driven by improving operating profit and a targeted sale at a higher multiple after scaling. Small-business performance depends heavily on local conditions and management execution.\n\nThe data room includes historical financials, the quality-of-earnings report, and the operator's growth plan. Projections are management estimates, not promises of results.",
    dealType: "Small Business",
    categories: ["Small Business", "Buyout"],
    minInvestment: 10000,
    askAmount: 2100000,
    askCurrency: "USD",
    expectedRoiPercent: 16.5,
    expectedRoiDurationMonths: 60,
    riskLevel: "MEDIUM_HIGH",
    dealStatus: "OPEN",
    dealVerification: "PENDING",
    locationName: "Denver, Colorado, USA",
    tags: ["small-business", "acquisition", "search-fund", "buyout"],
    documentUrls: [
      "https://docs.example.com/summit-auto/financials.pdf",
      "https://docs.example.com/summit-auto/growth-plan.pdf",
    ],
    closingInDays: 40,
    dealScore: 72,
    imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200",
  },
  {
    title: "Vintage Vault — Fine Wine & Whisky Cask Portfolio",
    companyName: "Vintage Vault Collectibles",
    summary:
      "A curated portfolio of investment-grade wine and maturing whisky casks held in bonded, insured storage.",
    details:
      "Vintage Vault assembles a curated portfolio of investment-grade fine wine and maturing Scotch whisky casks, selected for provenance, scarcity, and demonstrated secondary-market demand. All assets are stored in bonded, climate-controlled, fully insured warehouses, with clear title and authentication documentation.\n\nWhisky casks can appreciate as the spirit matures and supply tightens, while blue-chip wines benefit from collector demand and dwindling availability of older vintages. Collectible markets are illiquid and prices can be volatile; valuations depend on connoisseur demand and broader luxury trends.\n\nThe data room includes the asset schedule, storage and insurance certificates, and independent valuation reports. Projected appreciation is an estimate based on historical indices and is not assured.",
    dealType: "Collectibles",
    categories: ["Collectibles", "Luxury", "Real Assets"],
    minInvestment: 7500,
    askAmount: 3300000,
    askCurrency: "GBP",
    expectedRoiPercent: 12.0,
    expectedRoiDurationMonths: 72,
    riskLevel: "MEDIUM_HIGH",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "Edinburgh, United Kingdom",
    tags: ["collectibles", "wine", "whisky", "luxury", "alternatives"],
    documentUrls: [
      "https://docs.example.com/vintage-vault/asset-schedule.pdf",
      "https://docs.example.com/vintage-vault/valuation-report.pdf",
    ],
    closingInDays: 65,
    dealScore: 77,
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200",
  },
  {
    title: "Meridian Cold Chain — Refrigerated Logistics Expansion",
    companyName: "Meridian Cold Chain",
    summary:
      "Growth capital for a refrigerated trucking and cold-storage operator expanding its fleet and warehouse footprint.",
    details:
      "Meridian Cold Chain is an established refrigerated logistics operator providing temperature-controlled trucking and cold-storage services to food and pharmaceutical clients. This growth round funds the addition of refrigerated trailers and a new cold-storage facility to meet contracted demand from existing customers.\n\nThe company has multi-year service agreements that underpin utilization of the new capacity, reducing ramp-up risk. Returns are generated from operating cash flow as new assets are deployed against contracted volumes. Logistics margins are sensitive to fuel costs, labor availability, and equipment utilization.\n\nThe data room contains customer contracts, the fleet expansion plan, historical financials, and the facility lease. Projected returns are estimates based on contracted volumes and current cost assumptions.",
    dealType: "Logistics",
    categories: ["Logistics", "Infrastructure", "Income"],
    minInvestment: 15000,
    askAmount: 6800000,
    askCurrency: "USD",
    expectedRoiPercent: 13.5,
    expectedRoiDurationMonths: 60,
    riskLevel: "MEDIUM",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "Atlanta, Georgia, USA",
    tags: ["logistics", "cold-chain", "transportation", "growth"],
    documentUrls: [
      "https://docs.example.com/meridian-cold-chain/expansion-plan.pdf",
      "https://docs.example.com/meridian-cold-chain/contracts.pdf",
    ],
    closingInDays: 55,
    dealScore: 83,
    imageUrl: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200",
  },
  {
    title: "Aurora Multifamily — Suburban Value-Add Apartments",
    companyName: "Aurora Residential",
    summary:
      "Acquisition and renovation of a 180-unit garden-style apartment community in a growing suburban submarket.",
    details:
      "Aurora Residential is acquiring a 180-unit garden-style apartment community in a supply-constrained, job-growth suburban submarket. The value-add plan involves interior renovations, amenity upgrades, and improved property management to capture a rent premium relative to in-place leases.\n\nThe sponsor has executed similar renovation programs across the region and underwrites conservative rent growth assumptions. Returns combine operating cash flow during the renovation and stabilization period with a targeted refinance or sale. Multifamily performance depends on occupancy, rent growth, and interest-rate conditions.\n\nThe data room includes the rent roll, renovation budget, comparable rent analysis, and historical operating statements. All projections are estimates and subject to market conditions and execution.",
    dealType: "Real Estate",
    categories: ["Real Estate", "Multifamily", "Value-Add"],
    minInvestment: 25000,
    askAmount: 12500000,
    askCurrency: "USD",
    expectedRoiPercent: 15.0,
    expectedRoiDurationMonths: 60,
    riskLevel: "MEDIUM",
    dealStatus: "FUNDED",
    dealVerification: "APPROVED",
    locationName: "Raleigh, North Carolina, USA",
    tags: ["real-estate", "multifamily", "value-add", "apartments"],
    documentUrls: [
      "https://docs.example.com/aurora-multifamily/offering-memorandum.pdf",
      "https://docs.example.com/aurora-multifamily/rent-comps.pdf",
    ],
    closingInDays: 10,
    dealScore: 86,
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200",
  },
  {
    title: "BrightPath SaaS — Series A in Education Technology",
    companyName: "BrightPath Learning",
    summary:
      "Series A equity in a fast-growing education technology platform serving K-12 districts with measurable outcomes.",
    details:
      "BrightPath Learning provides a curriculum and assessment platform adopted by K-12 school districts, with documented improvements in student outcomes and strong renewal rates. The company has grown annual recurring revenue substantially and is expanding its district pipeline ahead of this Series A.\n\nProceeds fund sales expansion, content development, and integrations with district systems. EdTech sales cycles can be long and budget-dependent, and early-stage equity carries the risk of partial or total loss. The round is co-led by two specialist education funds.\n\nThe data room includes the deck, the financial model, district case studies, and the cap table. Projected growth reflects management's plan and pipeline; actual results may vary significantly.",
    dealType: "Startup Equity",
    categories: ["Startup Equity", "Technology", "EdTech"],
    minInvestment: 10000,
    askAmount: 8000000,
    askCurrency: "USD",
    expectedRoiPercent: 0,
    expectedRoiDurationMonths: 84,
    riskLevel: "HIGH",
    dealStatus: "CLOSING_SOON",
    dealVerification: "APPROVED",
    locationName: "Boston, Massachusetts, USA",
    tags: ["startup", "equity", "edtech", "saas", "series-a"],
    documentUrls: [
      "https://docs.example.com/brightpath/deck.pdf",
      "https://docs.example.com/brightpath/financial-model.pdf",
    ],
    closingInDays: 18,
    dealScore: 78,
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200",
  },
  {
    title: "Coastal Storage — Self-Storage Development",
    companyName: "Coastal Storage Partners",
    summary:
      "Ground-up development of a climate-controlled self-storage facility in an underserved, high-growth coastal market.",
    details:
      "Coastal Storage Partners is developing a modern, climate-controlled self-storage facility in a high-growth coastal market with limited existing supply and strong household formation. Self-storage has historically demonstrated resilience across economic cycles due to sticky tenant demand and low operating costs.\n\nThe sponsor controls the entitled site and has secured a construction budget and lease-up plan. Returns are generated through development margin and stabilized operating income, with a targeted sale or refinance once occupancy stabilizes. Development carries construction, lease-up, and market-timing risks.\n\nThe data room includes the development pro forma, site plans, the market feasibility study, and the construction budget. All figures are estimates and depend on construction timing, costs, and lease-up performance.",
    dealType: "Real Estate",
    categories: ["Real Estate", "Self-Storage", "Development"],
    minInvestment: 20000,
    askAmount: 4900000,
    askCurrency: "USD",
    expectedRoiPercent: 17.0,
    expectedRoiDurationMonths: 48,
    riskLevel: "MEDIUM_HIGH",
    dealStatus: "OPEN",
    dealVerification: "PENDING",
    locationName: "Tampa, Florida, USA",
    tags: ["real-estate", "self-storage", "development", "value-add"],
    documentUrls: [
      "https://docs.example.com/coastal-storage/pro-forma.pdf",
      "https://docs.example.com/coastal-storage/feasibility-study.pdf",
    ],
    closingInDays: 70,
    dealScore: 75,
    imageUrl: "https://images.unsplash.com/photo-1597694491841-9c3a3c5c43d9?w=1200",
  },
  {
    title: "Sterling Gold Stream — Precious Metals Royalty",
    companyName: "Sterling Metals Royalty",
    summary:
      "A precious-metals streaming arrangement providing exposure to gold production from a permitted, low-cost mine.",
    details:
      "Sterling Metals Royalty provides upfront capital to a permitted, low-cost gold producer in exchange for the right to purchase a fixed percentage of future production at a predetermined price. This streaming structure offers exposure to gold output and prices while avoiding direct operating costs and capital overruns at the mine level.\n\nGold has historically served as a portfolio diversifier and inflation hedge. Streaming returns depend on the mine achieving production targets and on prevailing gold prices, both of which can vary. The counterparty operator has an established production history at the asset.\n\nThe data room includes the streaming agreement, the technical report, reserve estimates, and the operator's production history. Projected returns are estimates based on the production plan and current metal prices; actual results may differ.",
    dealType: "Royalties",
    categories: ["Royalties", "Commodities", "Precious Metals"],
    minInvestment: 25000,
    askAmount: 15000000,
    askCurrency: "USD",
    expectedRoiPercent: 11.0,
    expectedRoiDurationMonths: 84,
    riskLevel: "MEDIUM_HIGH",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "Toronto, Canada",
    tags: ["royalties", "gold", "commodities", "precious-metals", "streaming"],
    documentUrls: [
      "https://docs.example.com/sterling-gold/streaming-agreement.pdf",
      "https://docs.example.com/sterling-gold/technical-report.pdf",
    ],
    closingInDays: 85,
    dealScore: 73,
    imageUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200",
  },
  {
    title: "Lumen Data Centers — Edge Computing Infrastructure",
    companyName: "Lumen Infrastructure",
    summary:
      "Infrastructure equity in a portfolio of edge data centers serving regional cloud and connectivity demand.",
    details:
      "Lumen Infrastructure develops and operates edge data centers positioned close to population centers to serve growing demand for low-latency computing, content delivery, and cloud on-ramps. Facilities are anchored by contracted capacity from creditworthy enterprise and carrier tenants on long-term agreements.\n\nData center infrastructure benefits from structural tailwinds including cloud adoption, streaming, and AI workloads. Returns are driven by contracted lease revenue and the long-lived nature of the assets. Risks include power availability, technology shifts, and tenant concentration.\n\nThe data room includes tenant contracts, the development pipeline, power and connectivity agreements, and financials. Projected yields are estimates based on contracted capacity and the build-out schedule.",
    dealType: "Infrastructure",
    categories: ["Infrastructure", "Technology", "Income"],
    minInvestment: 50000,
    askAmount: 30000000,
    askCurrency: "USD",
    expectedRoiPercent: 12.5,
    expectedRoiDurationMonths: 96,
    riskLevel: "MEDIUM",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "Dallas, Texas, USA",
    tags: ["infrastructure", "data-center", "edge", "technology", "income"],
    documentUrls: [
      "https://docs.example.com/lumen-data/pipeline.pdf",
      "https://docs.example.com/lumen-data/tenant-contracts.pdf",
    ],
    closingInDays: 100,
    dealScore: 85,
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200",
  },
  {
    title: "Olive & Stone — Mediterranean Olive Grove Partnership",
    companyName: "Olive & Stone Agriculture",
    summary:
      "A partnership owning mature olive groves and a modern mill producing premium extra-virgin olive oil for export.",
    details:
      "Olive & Stone owns mature, high-density olive groves alongside a modern milling and bottling facility, producing premium extra-virgin olive oil for domestic and export markets. The vertically integrated model captures margin from grove to bottle and serves growing global demand for quality olive oil.\n\nMature groves provide established, predictable yields, while the in-house mill ensures quality control and freshness. Returns blend annual operating income from oil sales with potential land appreciation. Agricultural output is subject to weather, pests, and commodity price fluctuations.\n\nThe data room includes grove and mill details, historical production and sales, export agreements, and an independent agronomic assessment. Projected returns are estimates based on historical yields and current pricing.",
    dealType: "Farmland",
    categories: ["Farmland", "Agriculture", "Income"],
    minInvestment: 10000,
    askAmount: 5600000,
    askCurrency: "EUR",
    expectedRoiPercent: 10.0,
    expectedRoiDurationMonths: 84,
    riskLevel: "MEDIUM",
    dealStatus: "OPEN",
    dealVerification: "PENDING",
    locationName: "Andalusia, Spain",
    tags: ["farmland", "agriculture", "olive-oil", "income", "export"],
    documentUrls: [
      "https://docs.example.com/olive-stone/overview.pdf",
      "https://docs.example.com/olive-stone/agronomic-report.pdf",
    ],
    closingInDays: 95,
    dealScore: 71,
    imageUrl: "https://images.unsplash.com/photo-1445264718234-a623be589d37?w=1200",
  },
  {
    title: "Quantum Mobility — Series B in EV Charging Networks",
    companyName: "Quantum Mobility",
    summary:
      "Series B equity in a fast-charging network operator deploying stations along high-traffic corridors.",
    details:
      "Quantum Mobility designs, builds, and operates fast-charging stations along high-traffic highway corridors and at commercial destinations. The company has a growing installed base, site-host partnerships with national retailers, and recurring revenue from charging sessions and network services.\n\nThis Series B funds station deployment and software development as electric-vehicle adoption accelerates. The sector benefits from policy support and infrastructure incentives, though it remains capital intensive and competitive. Early-growth equity carries meaningful risk, including the potential for significant loss.\n\nThe data room includes the deployment plan, unit economics, site-host agreements, and financials. Projected returns reflect management's deployment and utilization assumptions and are not assured.",
    dealType: "Startup Equity",
    categories: ["Startup Equity", "Clean Energy", "Infrastructure"],
    minInvestment: 15000,
    askAmount: 18000000,
    askCurrency: "USD",
    expectedRoiPercent: 0,
    expectedRoiDurationMonths: 84,
    riskLevel: "HIGH",
    dealStatus: "OPEN",
    dealVerification: "PENDING",
    locationName: "Los Angeles, California, USA",
    tags: ["startup", "equity", "ev", "charging", "clean-energy", "series-b"],
    documentUrls: [
      "https://docs.example.com/quantum-mobility/deck.pdf",
      "https://docs.example.com/quantum-mobility/unit-economics.pdf",
    ],
    closingInDays: 35,
    dealScore: 76,
    imageUrl: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200",
  },
  {
    title: "Keystone Trade Finance — Short-Duration Receivables",
    companyName: "Keystone Trade Capital",
    summary:
      "A short-duration trade finance program funding receivables from established exporters with credit insurance.",
    details:
      "Keystone Trade Capital funds short-duration receivables for established exporters, advancing capital against confirmed invoices to investment-grade buyers. The program emphasizes short tenors, diversification across many transactions, and credit insurance to mitigate buyer default risk.\n\nThe self-liquidating nature of trade receivables means capital is recycled rapidly, supporting steady income generation with limited duration risk. Returns depend on transaction volume, base rates, and the credit performance of underlying buyers. Trade finance involves counterparty and operational risks despite mitigants.\n\nThe data room includes the program overview, the credit insurance policy summary, historical performance, and the servicing agreement. Projected yields are estimates based on the current pipeline and prevailing rates.",
    dealType: "Private Credit",
    categories: ["Private Credit", "Trade Finance", "Income"],
    minInvestment: 25000,
    askAmount: 20000000,
    askCurrency: "USD",
    expectedRoiPercent: 8.0,
    expectedRoiDurationMonths: 24,
    riskLevel: "LOW",
    dealStatus: "OPEN",
    dealVerification: "APPROVED",
    locationName: "London, United Kingdom",
    tags: ["private-credit", "trade-finance", "receivables", "income"],
    documentUrls: [
      "https://docs.example.com/keystone-trade/program-overview.pdf",
      "https://docs.example.com/keystone-trade/performance.pdf",
    ],
    closingInDays: 80,
    dealScore: 82,
    imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200",
  },
];

async function main() {
  console.log("🌱 Seeding opportunities...");

  // Find a creator: prefer system bot, fall back to any existing user.
  let creator = await prisma.user.findFirst({ where: { email: "system@vertica.app" }, select: { id: true } });
  if (!creator) creator = await prisma.user.findFirst({ select: { id: true } });
  const createdByUserId = creator?.id ?? null;
  if (createdByUserId) console.log(`✓  Assigning opportunities to creator ${createdByUserId}`);
  else console.log("⚠  No existing users found — creating opportunities without a creator.");

  let created = 0;
  let skipped = 0;

  for (const o of OPPORTUNITIES) {
    const existing = await prisma.opportunity.findFirst({ where: { title: o.title }, select: { id: true } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.opportunity.create({
      data: {
        title: o.title,
        companyName: o.companyName,
        summary: o.summary,
        details: o.details,
        dealType: o.dealType,
        categories: o.categories,
        minInvestment: o.minInvestment,
        askAmount: o.askAmount,
        askCurrency: o.askCurrency,
        expectedRoiPercent: o.expectedRoiPercent || null,
        expectedRoiDurationMonths: o.expectedRoiDurationMonths,
        riskLevel: o.riskLevel,
        dealStatus: o.dealStatus,
        dealVerification: o.dealVerification,
        locationName: o.locationName,
        tags: o.tags,
        documentUrls: o.documentUrls,
        closingDate: daysFromNow(o.closingInDays),
        dealScore: o.dealScore,
        imageUrl: o.imageUrl,
        imageUrls: [o.imageUrl],
        createdByUserId,
        publishedAt: new Date(),
        fetchedAt: new Date(),
      },
    });
    created++;
    console.log(`✅ ${o.title}`);
  }

  const total = await prisma.opportunity.count();
  console.log(`\n🎉 Done. Created ${created}, skipped ${skipped} (already existed).`);
  console.log(`📊 Total opportunities in database: ${total}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
