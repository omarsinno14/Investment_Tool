import {
  REAL_ESTATE_ASSET_CLASSES,
  REAL_ESTATE_COUNTRIES,
  REAL_ESTATE_COUNTRIES_AND_CITIES,
  REAL_ESTATE_REITS,
  REAL_ESTATE_STRATEGIES,
  REAL_ESTATE_SUBTOPICS,
} from "@/lib/real-estate";

export const INTEREST_TYPES = {
  ASSET_CLASS: "ASSET_CLASS",
  STRATEGY: "STRATEGY",
  REIT: "REIT",
  COUNTRY: "COUNTRY",
  CITY: "CITY",
  SUBTOPIC: "SUBTOPIC",
  CUSTOM: "CUSTOM",
} as const;

// ── Traditional Markets ──────────────────────────────────────────────────────
export const TRADITIONAL_MARKETS: string[] = [
  "Stocks",
  "ETFs",
  "Index Funds",
  "Mutual Funds",
  "Bonds",
  "Treasury Bills",
  "Dividend Investing",
  "Money Market Funds",
  "Options & Derivatives",
];

// ── Alternative Investments ──────────────────────────────────────────────────
export const ALTERNATIVE_INVESTMENTS: string[] = [
  "Private Equity",
  "Venture Capital",
  "Angel Investing",
  "Private Credit",
  "Hedge Funds",
  "Revenue-Share Deals",
  "Litigation Finance",
  "Music Royalties",
  "Film & Media Financing",
  "Franchise Investments",
  "Infrastructure Funds",
  "Farmland & Agriculture",
  "Timber Funds",
  "Carbon Credits",
  "Private Placements",
];

// ── Business Deals ───────────────────────────────────────────────────────────
export const BUSINESS_DEALS: string[] = [
  "Small Business Equity",
  "Business Acquisitions",
  "Silent Partnership",
  "Franchise Funding",
  "Equipment Financing",
  "Invoice Factoring",
  "E-commerce Brand Acquisition",
  "SaaS & App Acquisitions",
  "Inventory Financing",
  "Merchant Cash Advances",
];

// ── Collectibles & Luxury ────────────────────────────────────────────────────
export const COLLECTIBLES: string[] = [
  "Fine Art",
  "Classic Cars",
  "Rare Whisky",
  "Fine Wine",
  "Luxury Jewelry",
  "Designer Handbags",
  "Sports Cards",
  "Rare Coins",
  "Vintage Furniture",
  "Luxury Watches",
  "Rare Books",
  "Sneakers",
];

// ── Digital & Crypto ─────────────────────────────────────────────────────────
export const DIGITAL_ASSETS: string[] = [
  "Bitcoin",
  "Ethereum",
  "Crypto ETFs",
  "Tokenized Assets",
  "Domain Names",
  "Digital Businesses",
  "Content & Media Assets",
  "Stablecoin Yield",
];

// ── Commodities & Hard Assets ────────────────────────────────────────────────
export const COMMODITIES: string[] = [
  "Gold",
  "Silver",
  "Platinum",
  "Oil & Gas",
  "Uranium",
  "Copper",
  "Agricultural Commodities",
  "Energy Royalties",
  "Water Rights",
];

// ── Real Estate ──────────────────────────────────────────────────────────────
export const ASSET_CLASSES: string[] = [
  ...REAL_ESTATE_ASSET_CLASSES,
  ...TRADITIONAL_MARKETS,
  ...ALTERNATIVE_INVESTMENTS,
  ...BUSINESS_DEALS,
  ...COLLECTIBLES,
  ...DIGITAL_ASSETS,
  ...COMMODITIES,
];

export const STRATEGIES: string[] = [...REAL_ESTATE_STRATEGIES];
export const REITS: string[] = [...REAL_ESTATE_REITS];
export const SUBTOPICS: string[] = [...REAL_ESTATE_SUBTOPICS];
export const COUNTRIES: string[] = [...REAL_ESTATE_COUNTRIES];
export const CITIES_BY_COUNTRY: Record<string, string[]> = REAL_ESTATE_COUNTRIES_AND_CITIES;

// ── Grouped view for the interests picker ────────────────────────────────────
export const INTEREST_GROUPS: { label: string; items: string[] }[] = [
  { label: "Traditional Markets", items: TRADITIONAL_MARKETS },
  { label: "Alternative Investments", items: ALTERNATIVE_INVESTMENTS },
  { label: "Real Estate", items: REAL_ESTATE_ASSET_CLASSES },
  { label: "Business Deals", items: BUSINESS_DEALS },
  { label: "Digital & Crypto", items: DIGITAL_ASSETS },
  { label: "Commodities", items: COMMODITIES },
  { label: "Collectibles & Luxury", items: COLLECTIBLES },
];

// Backward-compatible aliases used by opportunities UI
export const SECTORS: string[] = [...ASSET_CLASSES];
export const INDUSTRIES_BY_SECTOR: Record<string, string[]> = Object.fromEntries(
  ASSET_CLASSES.map((asset) => [asset, [...SUBTOPICS]])
);
