/**
 * Demo seed — populates Vertica with realistic, compliance-safe sample data so the
 * app looks fully operational for testing: people (with profile + cover photos),
 * ~50 investment opportunities, community hubs, forum posts, hub discussions,
 * comments, reactions, follows, saves/interest, and a few conversations.
 *
 * Run with: cd artifacts/api-server && npx tsx prisma/seedDemo.ts
 *
 * Idempotent: demo users are upserted by email (@vertica.demo); opportunities and
 * posts are skipped if a row with the same title already exists; the social graph
 * is only generated once (guarded by an existing-demo-content check).
 *
 * Compliance: no "guaranteed" language (all returns are projected/target/estimated),
 * no money movement, no emojis in stored content.
 *
 * Every demo account shares the password: Demo!2345
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo!2345";

// ---------- helpers ----------
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randInt(7, 22), randInt(0, 59), 0, 0);
  return d;
}
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
function avatar(n: number): string {
  return `https://i.pravatar.cc/400?img=${n}`;
}

const COVERS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600",
  "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=1600",
  "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1600",
  "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600",
  "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1600",
  "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1600",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1600",
];

type Tier = "FREE" | "PLUS" | "ELITE" | "BUSINESS";
type Risk =
  | "EXTREMELY_LOW" | "LOW" | "MEDIUM" | "MEDIUM_HIGH" | "HIGH" | "EXTREMELY_HIGH";

interface DemoUser {
  first: string;
  last: string;
  username: string;
  occupation: string;
  country: string;
  city: string;
  bio: string;
  expertise: string[];
  tier: Tier;
  risk: Risk;
  netWorth: number;
  avatarN: number;
  identityVerified?: boolean;
}

const DEMO_USERS: DemoUser[] = [
  { first: "Eleanor", last: "Whitfield", username: "eleanor_w", occupation: "Private Equity Partner", country: "United Kingdom", city: "London", bio: "Two decades in lower-middle-market buyouts. I look for durable cash flows and disciplined operators.", expertise: ["Private Equity", "Buyouts", "Operations"], tier: "ELITE", risk: "MEDIUM", netWorth: 14500000, avatarN: 5, identityVerified: true },
  { first: "Marcus", last: "Delacroix", username: "marcus_d", occupation: "Real Estate Developer", country: "United States", city: "Miami", bio: "Multifamily and industrial value-add across the Sun Belt. Bricks, mortar, and patient capital.", expertise: ["Real Estate", "Multifamily", "Industrial"], tier: "BUSINESS", risk: "MEDIUM_HIGH", netWorth: 28000000, avatarN: 12, identityVerified: true },
  { first: "Priya", last: "Raghunathan", username: "priya_r", occupation: "Venture Capital Principal", country: "Singapore", city: "Singapore", bio: "Early-stage climate and deep-tech. I back founders solving hard physical problems.", expertise: ["Venture Capital", "Climate Tech", "Deep Tech"], tier: "ELITE", risk: "HIGH", netWorth: 6200000, avatarN: 9, identityVerified: true },
  { first: "Tobias", last: "Lindqvist", username: "tobias_l", occupation: "Renewable Energy Investor", country: "Sweden", city: "Stockholm", bio: "Solar, wind, and storage. Contracted cash flows over speculative upside, every time.", expertise: ["Renewable Energy", "Infrastructure", "ESG"], tier: "PLUS", risk: "LOW", netWorth: 3400000, avatarN: 14 },
  { first: "Amara", last: "Okonkwo", username: "amara_o", occupation: "Emerging Markets Strategist", country: "Nigeria", city: "Lagos", bio: "Pan-African deal flow and frontier-market diligence. Long-term builder, not a tourist.", expertise: ["Emerging Markets", "Private Credit", "Agriculture"], tier: "BUSINESS", risk: "MEDIUM_HIGH", netWorth: 4100000, avatarN: 20, identityVerified: true },
  { first: "Hiroshi", last: "Tanaka", username: "hiroshi_t", occupation: "Family Office CIO", country: "Japan", city: "Tokyo", bio: "Multi-asset allocation for a single-family office. Capital preservation first, compounding second.", expertise: ["Asset Allocation", "Fixed Income", "Real Assets"], tier: "ELITE", risk: "LOW", netWorth: 52000000, avatarN: 11, identityVerified: true },
  { first: "Sofia", last: "Marchetti", username: "sofia_m", occupation: "Hospitality Operator", country: "Italy", city: "Milan", bio: "Boutique hotels and F&B concepts. I turn under-managed properties into destinations.", expertise: ["Hospitality", "Real Estate", "Operations"], tier: "PLUS", risk: "MEDIUM_HIGH", netWorth: 2900000, avatarN: 16 },
  { first: "Daniel", last: "Okafor", username: "daniel_o", occupation: "Fintech Founder", country: "United States", city: "Austin", bio: "Building back-office automation for finance teams. Former operator, now also an angel.", expertise: ["Startups", "SaaS", "Fintech"], tier: "BUSINESS", risk: "EXTREMELY_HIGH", netWorth: 8800000, avatarN: 33, identityVerified: true },
  { first: "Ingrid", last: "Berg", username: "ingrid_b", occupation: "Farmland Fund Manager", country: "Denmark", city: "Copenhagen", bio: "Row-crop and permanent-crop farmland. Real assets that feed real demand.", expertise: ["Farmland", "Agriculture", "Real Assets"], tier: "PLUS", risk: "LOW", netWorth: 5600000, avatarN: 24 },
  { first: "Rafael", last: "Mendoza", username: "rafael_m", occupation: "Private Credit Underwriter", country: "Spain", city: "Madrid", bio: "Senior secured lending to profitable SMEs. I read covenants for fun.", expertise: ["Private Credit", "Fixed Income", "Underwriting"], tier: "ELITE", risk: "MEDIUM", netWorth: 4700000, avatarN: 51, identityVerified: true },
  { first: "Chloe", last: "Bennett", username: "chloe_b", occupation: "Retail Investor", country: "Canada", city: "Toronto", bio: "Learning the ropes of alternative investing. Curious, cautious, and asking a lot of questions.", expertise: ["Index Funds", "Learning"], tier: "FREE", risk: "MEDIUM", netWorth: 180000, avatarN: 47 },
  { first: "Omar", last: "Haddad", username: "omar_h", occupation: "Logistics Entrepreneur", country: "United Arab Emirates", city: "Dubai", bio: "Cold chain and last-mile across MENA. Infrastructure is unglamorous and that is the point.", expertise: ["Logistics", "Infrastructure", "Supply Chain"], tier: "BUSINESS", risk: "MEDIUM", netWorth: 9300000, avatarN: 53, identityVerified: true },
  { first: "Lena", last: "Kovac", username: "lena_k", occupation: "Art & Collectibles Advisor", country: "Austria", city: "Vienna", bio: "Blue-chip art, fine wine, and rare watches. Provenance is everything.", expertise: ["Collectibles", "Luxury", "Alternatives"], tier: "PLUS", risk: "MEDIUM_HIGH", netWorth: 3100000, avatarN: 29 },
  { first: "Nathan", last: "Cole", username: "nathan_c", occupation: "Search Fund Operator", country: "United States", city: "Denver", bio: "Acquired and now running a profitable services business. Entrepreneurship through acquisition.", expertise: ["Small Business", "Buyouts", "Operations"], tier: "PLUS", risk: "MEDIUM_HIGH", netWorth: 1900000, avatarN: 60 },
  { first: "Yara", last: "Nasser", username: "yara_n", occupation: "Impact Investor", country: "Jordan", city: "Amman", bio: "Capital with a conscience: water, energy access, and inclusive finance.", expertise: ["Impact", "ESG", "Emerging Markets"], tier: "ELITE", risk: "MEDIUM", netWorth: 7400000, avatarN: 44, identityVerified: true },
  { first: "Felix", last: "Brandt", username: "felix_b", occupation: "Crypto Infrastructure Builder", country: "Germany", city: "Berlin", bio: "Validator operations and digital-asset infrastructure. Security-first, hype-averse.", expertise: ["Crypto", "Web3", "Infrastructure"], tier: "PLUS", risk: "EXTREMELY_HIGH", netWorth: 2200000, avatarN: 56 },
  { first: "Grace", last: "Adeyemi", username: "grace_a", occupation: "Healthcare Investor", country: "United Kingdom", city: "Manchester", bio: "Healthcare services and med-tech. Defensive demand, durable margins.", expertise: ["Healthcare", "Private Equity", "Med-Tech"], tier: "ELITE", risk: "MEDIUM", netWorth: 6800000, avatarN: 45, identityVerified: true },
  { first: "Victor", last: "Petrov", username: "victor_p", occupation: "Commodities Trader", country: "Switzerland", city: "Geneva", bio: "Physical commodities and trade finance. Short tenors, diversified counterparties.", expertise: ["Commodities", "Trade Finance", "Private Credit"], tier: "BUSINESS", risk: "MEDIUM_HIGH", netWorth: 11200000, avatarN: 8, identityVerified: true },
  { first: "Isabella", last: "Santos", username: "isabella_s", occupation: "Proptech Founder", country: "Brazil", city: "Sao Paulo", bio: "Digitizing real estate transactions in Latin America. Building for the next billion.", expertise: ["Startups", "Proptech", "Real Estate"], tier: "PLUS", risk: "HIGH", netWorth: 1400000, avatarN: 32 },
  { first: "William", last: "Asante", username: "william_a", occupation: "Infrastructure Fund Partner", country: "Ghana", city: "Accra", bio: "Roads, power, and digital infrastructure across West Africa. Patient, contracted capital.", expertise: ["Infrastructure", "Emerging Markets", "Energy"], tier: "ELITE", risk: "MEDIUM", netWorth: 9900000, avatarN: 59, identityVerified: true },
  { first: "Mia", last: "Larsen", username: "mia_l", occupation: "Music Royalty Investor", country: "Norway", city: "Oslo", bio: "Catalogue acquisitions and sync licensing. Cash flows that hum along regardless of markets.", expertise: ["Royalties", "Media", "Alternatives"], tier: "PLUS", risk: "MEDIUM", netWorth: 2600000, avatarN: 26 },
  { first: "Arjun", last: "Mehta", username: "arjun_m", occupation: "Growth Equity Investor", country: "India", city: "Mumbai", bio: "Profitable, capital-efficient software and consumer brands. Growth at a sensible price.", expertise: ["Growth Equity", "SaaS", "Consumer"], tier: "ELITE", risk: "HIGH", netWorth: 8100000, avatarN: 36, identityVerified: true },
  { first: "Hannah", last: "Green", username: "hannah_g", occupation: "Sustainability Analyst", country: "Australia", city: "Sydney", bio: "Screening deals for real-world impact and durable economics. Greenwashing detector.", expertise: ["ESG", "Renewable Energy", "Research"], tier: "FREE", risk: "MEDIUM", netWorth: 320000, avatarN: 49 },
  { first: "Diego", last: "Fernandez", username: "diego_f", occupation: "Hotel Group Owner", country: "Mexico", city: "Mexico City", bio: "Resort and boutique hospitality across coastal markets. Hospitality is a people business.", expertise: ["Hospitality", "Real Estate", "Operations"], tier: "BUSINESS", risk: "MEDIUM_HIGH", netWorth: 15600000, avatarN: 52, identityVerified: true },
  { first: "Aisha", last: "Rahman", username: "aisha_r", occupation: "Microfinance Director", country: "Bangladesh", city: "Dhaka", bio: "Inclusive finance at scale. Small loans, big multiplier on livelihoods.", expertise: ["Impact", "Private Credit", "Emerging Markets"], tier: "PLUS", risk: "MEDIUM", netWorth: 980000, avatarN: 38 },
  { first: "Lucas", last: "Moreau", username: "lucas_m", occupation: "Wine & Spirits Investor", country: "France", city: "Bordeaux", bio: "Fine wine and maturing whisky casks held in bonded storage. Patience in a glass.", expertise: ["Collectibles", "Luxury", "Real Assets"], tier: "PLUS", risk: "MEDIUM_HIGH", netWorth: 4300000, avatarN: 50 },
  { first: "Olivia", last: "Carter", username: "olivia_c", occupation: "Angel Investor", country: "United States", city: "San Francisco", bio: "Pre-seed and seed software. I write small checks and roll up my sleeves.", expertise: ["Startups", "SaaS", "Angel"], tier: "ELITE", risk: "EXTREMELY_HIGH", netWorth: 12800000, avatarN: 31, identityVerified: true },
  { first: "Karim", last: "El-Sayed", username: "karim_e", occupation: "Industrial Investor", country: "Egypt", city: "Cairo", bio: "Manufacturing and logistics in North Africa. Building the backbone of regional trade.", expertise: ["Industrial", "Logistics", "Emerging Markets"], tier: "BUSINESS", risk: "MEDIUM", netWorth: 7700000, avatarN: 18, identityVerified: true },
  { first: "Emma", last: "Nilsson", username: "emma_n", occupation: "Student Investor", country: "Finland", city: "Helsinki", bio: "Finance student building a small portfolio and learning from this community.", expertise: ["Learning", "Index Funds"], tier: "FREE", risk: "MEDIUM_HIGH", netWorth: 45000, avatarN: 41 },
  { first: "Samuel", last: "Kim", username: "samuel_k", occupation: "Secondaries Investor", country: "South Korea", city: "Seoul", bio: "Buying LP stakes and direct secondaries at a discount. Liquidity is an edge.", expertise: ["Private Equity", "Secondaries", "Fund Investing"], tier: "ELITE", risk: "MEDIUM", netWorth: 10400000, avatarN: 4, identityVerified: true },
];

// ---------- opportunity generator ----------
type DealStatus = "OPEN" | "CLOSING_SOON" | "FUNDED";

interface SectorTemplate {
  dealType: string;
  categories: string[];
  descriptors: string[];
  summary: (brand: string, loc: string) => string;
  details: (brand: string, loc: string) => string;
  tags: string[];
  risk: Risk;
  roi: [number, number];
  months: number[];
  minInv: number[];
  ask: [number, number];
  images: string[];
}

const DISCLAIMER =
  "All forward-looking figures are estimates based on current information and may vary with market conditions; capital is at risk and returns are not assured.";

const SECTORS: SectorTemplate[] = [
  {
    dealType: "Real Estate",
    categories: ["Real Estate", "Income"],
    descriptors: ["Stabilized Multifamily Income", "Suburban Value-Add Apartments", "Mixed-Use Repositioning", "Workforce Housing Portfolio"],
    summary: (b, l) => `${b} is acquiring a stabilized residential community in ${l}, offering projected cash distributions from in-place leases with a measured value-add plan.`,
    details: (b, l) => `${b} is acquiring a well-located residential asset in ${l} with strong occupancy and below-market rents. The business plan combines light interior renovations, amenity upgrades, and professional management to capture a modest rent premium over the hold period.\n\nReturns are driven primarily by in-place cash flow with a targeted refinance or sale at stabilization. The data room includes the rent roll, renovation budget, comparable rent analysis, and historical operating statements.\n\n${DISCLAIMER}`,
    tags: ["real-estate", "multifamily", "income", "value-add"],
    risk: "MEDIUM",
    roi: [9, 15],
    months: [48, 60, 72],
    minInv: [10000, 15000, 25000],
    ask: [3000000, 18000000],
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200", "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200", "https://images.unsplash.com/photo-1486304873000-235643847519?w=1200"],
  },
  {
    dealType: "Renewable Energy",
    categories: ["Renewable Energy", "Infrastructure", "Income"],
    descriptors: ["Distributed Solar Portfolio", "Battery Storage Project", "Onshore Wind Repowering", "Community Solar Expansion"],
    summary: (b, l) => `${b} offers exposure to operating clean-energy assets in ${l} backed by long-term power purchase agreements with creditworthy offtakers.`,
    details: (b, l) => `${b} operates a portfolio of clean-energy assets in ${l}, selling electricity under multi-year power purchase agreements with investment-grade offtakers. The assets are energized and generating, removing construction risk from the investment.\n\nProjected returns blend contracted, inflation-linked cash distributions with the residual value of the assets at the end of the hold. The data room includes the PPAs, engineering reports, production data, and independent yield assessments. Production estimates are based on historical resource data and are subject to weather variability.\n\n${DISCLAIMER}`,
    tags: ["renewable", "energy", "infrastructure", "esg"],
    risk: "LOW",
    roi: [8, 12],
    months: [72, 84, 96],
    minInv: [10000, 15000, 20000],
    ask: [4000000, 22000000],
    images: ["https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200", "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200", "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200"],
  },
  {
    dealType: "Private Credit",
    categories: ["Private Credit", "Fixed Income", "Income"],
    descriptors: ["Senior Secured Lending Fund", "Asset-Backed Lending Program", "Specialty Finance Facility", "Bridge Lending Strategy"],
    summary: (b, l) => `${b} originates senior secured, floating-rate loans to established borrowers, targeting quarterly income with a focus on capital preservation.`,
    details: (b, l) => `${b}, based in ${l}, provides senior secured, floating-rate loans to profitable borrowers across defensive sectors. Loans are first-lien, covenant-protected, and typically backed by meaningful enterprise-value or asset coverage.\n\nIncome is generated from contractual interest and origination fees, with target distributions paid quarterly. Floating-rate exposure offers a degree of protection in a rising-rate environment. The data room includes the private placement memorandum, the partnership agreement, and the manager track record.\n\n${DISCLAIMER}`,
    tags: ["private-credit", "lending", "income", "fixed-income"],
    risk: "MEDIUM",
    roi: [8, 12],
    months: [36, 48, 60],
    minInv: [25000, 50000],
    ask: [10000000, 40000000],
    images: ["https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200", "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200", "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200"],
  },
  {
    dealType: "Startup Equity",
    categories: ["Startup Equity", "Technology", "SaaS"],
    descriptors: ["Seed Round in B2B Software", "Series A in Vertical SaaS", "Pre-Seed in Developer Tools", "Seed Round in Fintech Infrastructure"],
    summary: (b, l) => `${b} is raising equity to scale a B2B software platform with early commercial traction. Early-stage equity carries high risk, including possible total loss of capital.`,
    details: (b, l) => `${b}, headquartered in ${l}, builds a B2B software platform addressing a clear operational pain point for its customers. The company has reached early commercial traction with paying customers and recurring revenue growing month over month.\n\nThis round funds expansion of the engineering and go-to-market teams. As an early-stage equity investment, outcomes are highly uncertain and a total loss of capital is possible. The data room includes the pitch deck, financial model, cap table, and customer references.\n\n${DISCLAIMER}`,
    tags: ["startup", "equity", "saas", "technology"],
    risk: "EXTREMELY_HIGH",
    roi: [0, 0],
    months: [60, 72, 84],
    minInv: [5000, 10000],
    ask: [1500000, 6000000],
    images: ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200", "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200", "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200"],
  },
  {
    dealType: "Logistics",
    categories: ["Logistics", "Infrastructure", "Income"],
    descriptors: ["Cold-Chain Expansion", "Last-Mile Warehouse Income", "Regional Distribution Hub", "Refrigerated Fleet Growth"],
    summary: (b, l) => `${b} provides growth capital for temperature-controlled logistics in ${l}, underpinned by multi-year customer contracts.`,
    details: (b, l) => `${b} is an established logistics operator in ${l} serving food and pharmaceutical clients. This round funds additional capacity to meet contracted demand from existing customers, reducing ramp-up risk.\n\nReturns are generated from operating cash flow as new assets are deployed against contracted volumes. Margins are sensitive to fuel costs, labor availability, and equipment utilization. The data room contains customer contracts, the expansion plan, historical financials, and facility leases.\n\n${DISCLAIMER}`,
    tags: ["logistics", "infrastructure", "supply-chain", "income"],
    risk: "MEDIUM",
    roi: [11, 16],
    months: [48, 60],
    minInv: [15000, 25000],
    ask: [4000000, 16000000],
    images: ["https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200", "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200", "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200"],
  },
  {
    dealType: "Farmland",
    categories: ["Farmland", "Agriculture", "Income"],
    descriptors: ["Row-Crop Farmland Fund", "Permanent-Crop Orchard Portfolio", "Cash-Rent Farmland Strategy"],
    summary: (b, l) => `${b} acquires productive farmland in ${l} leased to experienced operators, targeting steady rental income with long-term land appreciation potential.`,
    details: (b, l) => `${b} assembles productive farmland in ${l}, leasing each parcel to vetted local operators under cash-rent agreements. The strategy aims to deliver steady rental income with the potential for long-term land value appreciation, historically a low-correlation, inflation-resilient asset class.\n\nThe team conducts soil quality analysis, water-rights review, and operator diligence before each acquisition. Returns depend on commodity prices, weather, and input costs. The data room includes appraisals, soil reports, lease agreements, and regional yield data.\n\n${DISCLAIMER}`,
    tags: ["farmland", "agriculture", "income", "real-assets"],
    risk: "LOW",
    roi: [7, 11],
    months: [84, 96, 120],
    minInv: [10000, 15000],
    ask: [5000000, 14000000],
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200", "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200", "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200"],
  },
  {
    dealType: "Hospitality",
    categories: ["Hospitality", "Real Estate"],
    descriptors: ["Boutique Hotel Acquisition", "Resort Repositioning", "Extended-Stay Conversion"],
    summary: (b, l) => `${b} is acquiring and repositioning a boutique hospitality asset in ${l}, a destination market with consistent visitor demand.`,
    details: (b, l) => `${b} is acquiring a boutique hotel in ${l}, a market with steady year-round occupancy. The business plan involves a light renovation, an enhanced food-and-beverage offering, and dynamic revenue management to improve average daily rate.\n\nProjected returns combine operating cash flow during the hold with a targeted sale at a stabilized valuation. Hospitality income is seasonal and sensitive to travel demand. The data room contains historical operating statements, the renovation budget, and a market study.\n\n${DISCLAIMER}`,
    tags: ["hospitality", "hotel", "real-estate", "value-add"],
    risk: "MEDIUM_HIGH",
    roi: [12, 18],
    months: [48, 54, 60],
    minInv: [15000, 20000, 25000],
    ask: [3000000, 12000000],
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200", "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200", "https://images.unsplash.com/photo-1455587734955-081b22074882?w=1200"],
  },
  {
    dealType: "Small Business",
    categories: ["Small Business", "Buyout"],
    descriptors: ["Services Business Acquisition", "Specialty Retail Buyout", "Franchise Roll-Up"],
    summary: (b, l) => `${b} is acquiring a profitable established business in ${l} with a plan to professionalize operations and grow.`,
    details: (b, l) => `${b} is acquiring an established, profitable business in ${l} with a loyal customer base and tenured staff. The plan installs a dedicated operator to professionalize systems, improve marketing, and pursue measured expansion.\n\nReturns are driven by improving operating profit and a targeted sale at a higher multiple after scaling. Small-business performance depends heavily on local conditions and management execution. The data room includes historical financials, a quality-of-earnings report, and the growth plan.\n\n${DISCLAIMER}`,
    tags: ["small-business", "acquisition", "buyout", "search-fund"],
    risk: "MEDIUM_HIGH",
    roi: [14, 20],
    months: [48, 60],
    minInv: [10000, 15000],
    ask: [1500000, 5000000],
    images: ["https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200", "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=1200", "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200"],
  },
  {
    dealType: "Collectibles",
    categories: ["Collectibles", "Luxury", "Real Assets"],
    descriptors: ["Fine Wine & Whisky Cask Portfolio", "Blue-Chip Art Collection", "Rare Watch Portfolio"],
    summary: (b, l) => `${b} curates a portfolio of investment-grade collectibles held in bonded, insured storage, selected for provenance and demonstrated demand.`,
    details: (b, l) => `${b}, operating out of ${l}, assembles a curated portfolio of investment-grade collectibles selected for provenance, scarcity, and demonstrated secondary-market demand. All assets are held in bonded, climate-controlled, fully insured storage with clear title and authentication documentation.\n\nCollectible markets are illiquid and prices can be volatile; valuations depend on connoisseur demand and broader luxury trends. The data room includes the asset schedule, storage and insurance certificates, and independent valuation reports.\n\n${DISCLAIMER}`,
    tags: ["collectibles", "luxury", "alternatives", "real-assets"],
    risk: "MEDIUM_HIGH",
    roi: [9, 14],
    months: [60, 72, 84],
    minInv: [5000, 7500, 10000],
    ask: [2000000, 8000000],
    images: ["https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200", "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200", "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1200"],
  },
  {
    dealType: "Venture Fund",
    categories: ["Venture Fund", "Technology"],
    descriptors: ["Early-Stage Climate Fund", "Seed-Stage Software Fund", "Frontier-Tech Venture Fund"],
    summary: (b, l) => `${b} is a venture fund building a diversified portfolio of early-stage companies. Venture investing is illiquid and high risk.`,
    details: (b, l) => `${b}, managed from ${l}, targets a diversified portfolio of early-stage companies, anticipating that a small number of outsized winners will drive overall fund returns.\n\nThe partners bring operating and investing experience along with a network of corporate partners who can serve as pilot customers and acquirers. Venture investing is illiquid and high risk; many portfolio companies may fail, and capital is locked up for the life of the fund. Fund materials include the strategy deck, the partnership agreement, and prior-fund case studies.\n\n${DISCLAIMER}`,
    tags: ["venture", "fund", "technology", "early-stage"],
    risk: "HIGH",
    roi: [0, 0],
    months: [96, 120],
    minInv: [25000, 50000],
    ask: [15000000, 50000000],
    images: ["https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200", "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200", "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200"],
  },
  {
    dealType: "Infrastructure",
    categories: ["Infrastructure", "Income"],
    descriptors: ["Digital Infrastructure Income", "Toll-Road Concession Stake", "Water Treatment Facility"],
    summary: (b, l) => `${b} offers exposure to essential infrastructure in ${l} with long-duration, contracted or regulated revenue.`,
    details: (b, l) => `${b} owns essential infrastructure in ${l} generating long-duration revenue under contracted or regulated frameworks. Demand for these assets tends to be stable across economic cycles.\n\nProjected returns are driven by contracted cash flow with inflation linkage where available. Infrastructure assets can be affected by regulation, utilization, and maintenance costs. The data room includes concession or service agreements, engineering assessments, and historical financials.\n\n${DISCLAIMER}`,
    tags: ["infrastructure", "income", "real-assets", "essential"],
    risk: "LOW",
    roi: [8, 13],
    months: [84, 96, 120],
    minInv: [15000, 25000],
    ask: [8000000, 35000000],
    images: ["https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200", "https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=1200", "https://images.unsplash.com/photo-1473042904451-00171c69419d?w=1200"],
  },
  {
    dealType: "Royalties",
    categories: ["Royalties", "Media", "Income"],
    descriptors: ["Music Royalty Acquisition", "Film Library Royalties", "Pharma Royalty Stream"],
    summary: (b, l) => `${b} is acquiring a diversified royalty stream generating recurring income that is largely uncorrelated to public markets.`,
    details: (b, l) => `${b}, based in ${l}, is acquiring a diversified portfolio of royalty rights with revenue derived from recurring usage and licensing. Royalty income tends to be relatively stable and uncorrelated to public markets.\n\nThe team uses historical statements to model durable cash flow and pursues active licensing to grow income. Income can fluctuate with platform payout rates and changes in consumption patterns. The data room includes royalty statements, the rights schedule, and a verification report.\n\n${DISCLAIMER}`,
    tags: ["royalties", "media", "income", "ip"],
    risk: "MEDIUM",
    roi: [8, 12],
    months: [96, 120],
    minInv: [5000, 10000],
    ask: [4000000, 14000000],
    images: ["https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200", "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200", "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200"],
  },
];

const BRANDS = [
  "Aldridge", "Brookmere", "Castlewood", "Drayton", "Everline", "Fairhaven",
  "Granby", "Halcyon", "Ironwood", "Juniper", "Kestrel", "Larkspur",
  "Marlowe", "Northgate", "Oakhurst", "Pemberton", "Quill", "Redstone",
  "Sandalwood", "Thornfield", "Underhill", "Vanbrook", "Westmere", "Yardley",
  "Ashford", "Belmont", "Crestline", "Dunmore", "Elmwood", "Fenwick",
  "Glenmoor", "Harbory", "Inglewood", "Kingsley", "Lochlan", "Merivale",
];
const SUFFIXES = ["Capital", "Partners", "Holdings", "Group", "Ventures", "Advisors", "Asset Co.", "Management"];
const LOCATIONS = [
  "Austin, Texas, USA", "Denver, Colorado, USA", "Nashville, Tennessee, USA",
  "London, United Kingdom", "Manchester, United Kingdom", "Berlin, Germany",
  "Lisbon, Portugal", "Madrid, Spain", "Singapore", "Tokyo, Japan",
  "Sydney, Australia", "Toronto, Canada", "Dubai, United Arab Emirates",
  "Lagos, Nigeria", "Nairobi, Kenya", "Accra, Ghana", "Sao Paulo, Brazil",
  "Mexico City, Mexico", "Mumbai, India", "Seoul, South Korea",
  "Amsterdam, Netherlands", "Stockholm, Sweden", "Copenhagen, Denmark",
];

interface GenOpp {
  title: string;
  companyName: string;
  summary: string;
  details: string;
  dealType: string;
  categories: string[];
  minInvestment: number;
  askAmount: number;
  expectedRoiPercent: number;
  expectedRoiDurationMonths: number;
  riskLevel: Risk;
  dealStatus: DealStatus;
  locationName: string;
  tags: string[];
  closingInDays: number;
  dealScore: number;
  imageUrl: string;
}

function generateOpportunities(count: number): GenOpp[] {
  const out: GenOpp[] = [];
  const statuses: DealStatus[] = ["OPEN", "OPEN", "OPEN", "CLOSING_SOON", "FUNDED"];
  // Fully deterministic so titles are stable across runs; combined with the
  // skip-by-title check in main(), this makes opportunity seeding idempotent.
  for (let i = 0; i < count; i++) {
    const sector = SECTORS[i % SECTORS.length];
    const brandWord = BRANDS[i % BRANDS.length];
    const company = `${brandWord} ${SUFFIXES[i % SUFFIXES.length]}`;
    const loc = LOCATIONS[(i * 7) % LOCATIONS.length];
    const descriptor = sector.descriptors[i % sector.descriptors.length];
    const title = `${brandWord} ${sector.dealType === "Real Estate" ? "Estates" : sector.dealType === "Startup Equity" ? "Labs" : "Project"} — ${descriptor}`;
    const roiSpan = sector.roi[1] - sector.roi[0];
    const roi = sector.roi[1] === 0 ? 0 : sector.roi[0] + (i % (roiSpan + 1)) + (i % 2 === 0 ? 0 : 0.5);
    const askLo = sector.ask[0] / 100000;
    const askHi = sector.ask[1] / 100000;
    const askAmount = (askLo + ((i * 13) % (askHi - askLo + 1))) * 100000;
    out.push({
      title,
      companyName: company,
      summary: sector.summary(company, loc),
      details: sector.details(company, loc),
      dealType: sector.dealType,
      categories: sector.categories,
      minInvestment: sector.minInv[i % sector.minInv.length],
      askAmount,
      expectedRoiPercent: roi,
      expectedRoiDurationMonths: sector.months[i % sector.months.length],
      riskLevel: sector.risk,
      dealStatus: statuses[i % statuses.length],
      locationName: loc,
      tags: sector.tags,
      closingInDays: 12 + ((i * 11) % 109),
      dealScore: 64 + ((i * 17) % 29),
      imageUrl: sector.images[i % sector.images.length],
    });
  }
  return out;
}

// ---------- content pools for social graph ----------
const FORUM_POSTS = [
  { title: "How are you sizing private credit allocations right now?", body: "With floating rates where they are, I have been leaning into senior secured private credit for the income. Curious how others are balancing yield against duration and default risk in the current environment. Are you capping any single manager at a fixed percentage of the sleeve?", tags: ["private-credit", "income", "strategy"] },
  { title: "Multifamily value-add: still worth it after the rate moves?", body: "I underwrite a lot of suburban garden-style deals. Cap rates have widened and financing is tighter, but rent growth in supply-constrained submarkets is holding. Are you still finding deals that pencil, or has the math broken for now?", tags: ["real-estate", "multifamily", "value-add"] },
  { title: "Lessons from my first search-fund acquisition", body: "Closed on a services business last year. Biggest surprise was how much value sat in simply fixing scheduling and follow-up. Happy to share what I learned about quality-of-earnings and operator transitions if anyone is going down this path.", tags: ["small-business", "buyout", "operations"] },
  { title: "Solar PPAs: what offtaker credit quality do you require?", body: "Looking at a distributed solar portfolio with a mix of municipal and corporate offtakers. How strict are you on counterparty credit before you get comfortable with a 15-20 year contracted revenue stream?", tags: ["renewable", "solar", "infrastructure"] },
  { title: "Farmland as an inflation hedge: real or overstated?", body: "The pitch is always low correlation and inflation resilience. In practice my cash-rent yields have been steady but unspectacular, with most of the return theoretical until I sell the land. Anyone holding long enough to comment on realized appreciation?", tags: ["farmland", "agriculture", "real-assets"] },
  { title: "Due diligence checklist for early-stage equity", body: "Before I write a seed check I want: cap table, financial model, customer references, and a clear use of proceeds. What else is non-negotiable for you? I have been burned by skipping reference calls before.", tags: ["startups", "venture", "diligence"] },
  { title: "Hospitality deals: how do you handle seasonality?", body: "Boutique hotels can throw off great cash in peak season and very little off-peak. How do you stress-test occupancy and ADR assumptions so a soft shoulder season does not blow up the model?", tags: ["hospitality", "real-estate", "operations"] },
  { title: "Music royalties as a bond alternative", body: "Catalogue income has been remarkably steady for me, almost bond-like, but payout rates from streaming platforms do shift. Anyone else using royalties as a fixed-income substitute, and how do you think about catalogue selection?", tags: ["royalties", "media", "income"] },
  { title: "How much of your portfolio is illiquid?", body: "Between private credit, real estate, and a couple of fund commitments, I am pushing past half my net worth in illiquid positions. Where do you draw the line so you are not forced to sell at a bad time?", tags: ["allocation", "liquidity", "strategy"] },
  { title: "Reading covenants: the part everyone skips", body: "In private credit the covenants are where the protection actually lives. Maintenance vs incurrence, cushion levels, cure rights. What do you look at first when you open a credit agreement?", tags: ["private-credit", "underwriting", "diligence"] },
  { title: "Cold-chain logistics: underrated infrastructure play?", body: "Refrigerated warehousing and trucking is unglamorous but demand is sticky and contracts are long. Margins are exposed to fuel and labor though. Anyone investing here and watching utilization closely?", tags: ["logistics", "infrastructure", "income"] },
  { title: "First-timer: how do I even start with alternatives?", body: "I have index funds and not much else. Alternatives sound interesting but the minimums and lockups are intimidating. Where would you point a beginner who wants to learn before committing capital?", tags: ["learning", "beginner"] },
  { title: "Collectibles: storage and insurance gotchas", body: "Bonded storage and proper insurance are non-negotiable for wine and watches, but the costs eat into returns more than people expect. How do you factor carry costs into your underwriting?", tags: ["collectibles", "luxury", "alternatives"] },
  { title: "Emerging-market deal flow: managing currency risk", body: "Some of the most interesting growth is in frontier markets, but FX can wipe out a good local return. Do you hedge, demand a higher hurdle, or just size positions smaller?", tags: ["emerging-markets", "currency", "strategy"] },
  { title: "What dealScore range do you actually act on?", body: "I notice the platform surfaces a deal score. Curious where the community draws the line. Do you ignore anything below a certain threshold, or treat it as one input among many?", tags: ["platform", "diligence", "strategy"] },
];

const HUB_DISCUSSIONS = [
  { title: "Welcome thread: introduce yourself", body: "New to this hub? Tell us what you invest in, what you are learning, and what you are hoping to find here. Always good to know who is in the room." },
  { title: "Deal of the week: what caught your eye?", body: "Share one opportunity you found interesting this week and why. Not advice, just what stood out in your diligence." },
  { title: "Mistakes that taught you the most", body: "We all have a deal that went sideways. What went wrong, and what would you do differently with the benefit of hindsight?" },
  { title: "Tools and resources you swear by", body: "Spreadsheets, data rooms, valuation frameworks, newsletters. What is in your toolkit for evaluating deals quickly?" },
  { title: "How do you verify an operator's track record?", body: "References, prior fund performance, site visits. What gives you real conviction that a sponsor can execute the plan they are pitching?" },
  { title: "Income vs growth: where are you leaning this year?", body: "Given where rates and valuations sit, are you tilting toward contracted income or taking more growth risk? Curious how the room is positioned." },
];

const COMMENTS = [
  "Great question. I cap any single manager at around ten percent of the sleeve and require a full cycle track record before I commit.",
  "This matches my experience. The income has been steady but I treat any appreciation as a bonus, not part of the base case.",
  "Thanks for sharing. The operator transition is exactly where most of these deals live or die.",
  "I require investment-grade offtakers for at least the majority of the revenue before I get comfortable with the long contract length.",
  "Counterpoint: I think the risk is underpriced here. Watch the covenants and the cushion levels closely.",
  "Appreciate the detail. Reference calls have saved me more than once, never skipping them again.",
  "We stress occupancy down to a soft shoulder season and make sure the deal still covers debt service before we move.",
  "Solid framework. I would add water rights to the farmland checklist, it is easy to overlook and hard to fix later.",
  "This is helpful for someone just starting out. Beginning with smaller, more liquid positions makes a lot of sense.",
  "Carry costs are the silent killer on collectibles. I underwrite them explicitly and it changes the picture.",
  "Currency is the part I worry about most in frontier markets. I size smaller and demand a higher hurdle rate.",
  "I treat the score as one input among several. The data room and the operator still matter far more to me.",
  "Strong post. The maintenance versus incurrence distinction is exactly where I focus first when I open a credit agreement.",
  "Utilization is everything in logistics. If the new capacity is contracted, a lot of the ramp risk goes away.",
  "Well put. Patient capital and disciplined underwriting beat chasing the highest headline return almost every time.",
];

const REACTIONS = ["like", "insightful", "agree", "celebrate"];

async function main() {
  console.log("Seeding demo data...");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // 1) Users + profiles ------------------------------------------------------
  const userIds: { id: string; tier: Tier }[] = [];
  let createdUsers = 0;
  for (const u of DEMO_USERS) {
    const email = `${u.username}@vertica.demo`;
    const usernameLower = u.username.toLowerCase();
    const age = randInt(28, 62);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    const profileData = {
      name: `${u.first} ${u.last}`,
      username: u.username,
      usernameLower,
      imageUrl: avatar(u.avatarN),
      coverPhotoUrl: pick(COVERS),
      bio: u.bio,
      occupation: u.occupation,
      country: u.country,
      city: u.city,
      age,
      dateOfBirth: dob,
      netWorth: u.netWorth,
      investAmount: Math.round(u.netWorth * 0.1),
      riskTolerance: u.risk,
      expertiseTags: u.expertise,
      verifiedExpertiseTags: u.identityVerified ? u.expertise.slice(0, 1) : [],
      reputation: randInt(10, 480),
      emailVerified: true,
      identityVerified: !!u.identityVerified,
      currency: "USD",
      subscriptionTier: u.tier,
      subscriptionStatus: (u.tier === "FREE" ? "NONE" : "ACTIVE") as
        | "NONE" | "ACTIVE",
      subscriptionRenewsAt: u.tier === "FREE" ? null : daysFromNow(randInt(10, 320)),
    };
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      await prisma.profile.update({ where: { userId: existing.id }, data: profileData });
      userIds.push({ id: existing.id, tier: u.tier });
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "USER",
          createdAt: daysAgo(randInt(40, 400)),
          profile: { create: profileData },
        },
        select: { id: true },
      });
      userIds.push({ id: created.id, tier: u.tier });
      createdUsers++;
    }
  }
  console.log(`Users: ${createdUsers} created, ${DEMO_USERS.length - createdUsers} updated.`);

  const allUserIds = userIds.map((u) => u.id);
  // Posters of opportunities: business + elite users (those allowed to post)
  const posterIds = userIds.filter((u) => u.tier === "BUSINESS" || u.tier === "ELITE").map((u) => u.id);

  // 2) Hubs (ensure topical hubs exist) -------------------------------------
  const sysBot = await prisma.user.findFirst({ where: { email: "system@vertica.app" }, select: { id: true } });
  const hubOwnerId = sysBot?.id ?? allUserIds[0];
  const TOPICAL_HUBS = [
    { name: "Vertica", slug: "vertica", description: "The official Vertica community. Discuss the platform, share feedback, and connect with fellow investors and founders." },
    { name: "Deals", slug: "deals", description: "Community-posted investment opportunities, deal flow, and due diligence discussions." },
    { name: "Real Estate", slug: "real-estate", description: "Real estate investment, REITs, property deals, and market analysis." },
    { name: "Private Equity", slug: "private-equity", description: "PE deal flow, fund performance, and buyout market discussions." },
    { name: "Venture Capital", slug: "venture-capital", description: "Startup funding rounds, VC thesis sharing, and emerging company discussions." },
    { name: "Renewable Energy", slug: "renewable-energy", description: "Solar, wind, storage, and the economics of the energy transition." },
    { name: "Private Credit", slug: "private-credit", description: "Senior secured lending, direct lending, and fixed-income alternatives." },
  ];
  const hubIds: string[] = [];
  for (const h of TOPICAL_HUBS) {
    let hub = await prisma.hub.findFirst({ where: { slug: h.slug }, select: { id: true } });
    if (!hub) {
      hub = await prisma.hub.create({
        data: {
          name: h.name, slug: h.slug, description: h.description, ownerUserId: hubOwnerId,
          imageUrl: pick(COVERS), coverImageUrl: pick(COVERS),
          memberships: { create: { userId: hubOwnerId, role: "OWNER" } },
        },
        select: { id: true },
      });
    }
    hubIds.push(hub.id);
  }
  console.log(`Hubs ready: ${hubIds.length}.`);

  // Hub memberships (each user joins a few hubs)
  for (const uid of allUserIds) {
    for (const hid of pickN(hubIds, randInt(2, 4))) {
      await prisma.hubMembership.upsert({
        where: { hubId_userId: { hubId: hid, userId: uid } },
        create: { hubId: hid, userId: uid, role: "member", joinedAt: daysAgo(randInt(1, 120)) },
        update: {},
      });
    }
  }

  // 3) Opportunities ---------------------------------------------------------
  const generated = generateOpportunities(30);
  let createdOpps = 0, skippedOpps = 0;
  const oppIds: string[] = [];
  for (let oi = 0; oi < generated.length; oi++) {
    const o = generated[oi];
    const existing = await prisma.opportunity.findFirst({ where: { title: o.title }, select: { id: true } });
    if (existing) { skippedOpps++; oppIds.push(existing.id); continue; }
    const createdBy = posterIds.length ? posterIds[oi % posterIds.length] : allUserIds[0];
    const created = await prisma.opportunity.create({
      data: {
        title: o.title,
        companyName: o.companyName,
        summary: o.summary,
        details: o.details,
        dealType: o.dealType,
        categories: o.categories,
        minInvestment: o.minInvestment,
        askAmount: o.askAmount,
        askCurrency: "USD",
        expectedRoiPercent: o.expectedRoiPercent || null,
        expectedRoiDurationMonths: o.expectedRoiDurationMonths,
        riskLevel: o.riskLevel,
        dealStatus: o.dealStatus,
        dealVerification: oi % 10 < 7 ? "APPROVED" : "PENDING",
        locationName: o.locationName,
        tags: o.tags,
        closingDate: daysFromNow(o.closingInDays),
        dealScore: o.dealScore,
        imageUrl: o.imageUrl,
        imageUrls: [o.imageUrl],
        createdByUserId: createdBy,
        publishedAt: daysAgo(randInt(1, 90)),
        fetchedAt: daysAgo(randInt(1, 90)),
      },
      select: { id: true },
    });
    oppIds.push(created.id);
    createdOpps++;
  }
  console.log(`Opportunities: ${createdOpps} created, ${skippedOpps} skipped. Pool size: ${oppIds.length}.`);

  // Guard the social graph so re-runs do not duplicate comments/reactions.
  const existingDemoForum = await prisma.forumPost.count({ where: { userId: { in: allUserIds } } });
  if (existingDemoForum > 0) {
    console.log("Social graph already seeded for demo users; skipping posts/comments/follows/messages.");
    const totalOpps = await prisma.opportunity.count();
    console.log(`Done. Total opportunities in database: ${totalOpps}.`);
    return;
  }

  // 4) Follows ---------------------------------------------------------------
  let follows = 0;
  for (const follower of allUserIds) {
    for (const target of pickN(allUserIds.filter((id) => id !== follower), randInt(3, 9))) {
      try {
        await prisma.follow.create({ data: { followerId: follower, followingId: target, createdAt: daysAgo(randInt(1, 200)) } });
        follows++;
      } catch { /* unique violation, ignore */ }
    }
  }
  console.log(`Follows: ${follows}.`);

  // 5) Forum posts + comments + reactions -----------------------------------
  let forumComments = 0, forumReactions = 0;
  for (const fp of FORUM_POSTS) {
    const author = pick(allUserIds);
    const post = await prisma.forumPost.create({
      data: {
        userId: author,
        title: fp.title,
        body: fp.body,
        tags: fp.tags,
        createdAt: daysAgo(randInt(1, 60)),
      },
      select: { id: true },
    });
    // comments
    for (const commenter of pickN(allUserIds.filter((id) => id !== author), randInt(2, 6))) {
      await prisma.forumComment.create({
        data: { postId: post.id, userId: commenter, body: pick(COMMENTS), createdAt: daysAgo(randInt(0, 30)) },
      });
      forumComments++;
    }
    // reactions
    for (const reactor of pickN(allUserIds, randInt(3, 12))) {
      try {
        await prisma.forumReaction.create({ data: { postId: post.id, userId: reactor, type: pick(REACTIONS), createdAt: daysAgo(randInt(0, 30)) } });
        forumReactions++;
      } catch { /* unique violation */ }
    }
  }
  console.log(`Forum: ${FORUM_POSTS.length} posts, ${forumComments} comments, ${forumReactions} reactions.`);

  // 6) Hub posts (discussions) + comments + reactions -----------------------
  let hubPosts = 0, hubComments = 0, hubReactions = 0;
  for (const hid of hubIds) {
    for (const disc of pickN(HUB_DISCUSSIONS, randInt(2, 4))) {
      const author = pick(allUserIds);
      const post = await prisma.hubPost.create({
        data: {
          hubId: hid, authorUserId: author, title: disc.title, body: disc.body,
          type: "DISCUSSION", createdAt: daysAgo(randInt(1, 50)),
        },
        select: { id: true },
      });
      hubPosts++;
      for (const commenter of pickN(allUserIds.filter((id) => id !== author), randInt(1, 5))) {
        await prisma.hubComment.create({ data: { hubId: hid, postId: post.id, userId: commenter, body: pick(COMMENTS), createdAt: daysAgo(randInt(0, 20)) } });
        hubComments++;
      }
      for (const reactor of pickN(allUserIds, randInt(2, 8))) {
        try {
          await prisma.hubReaction.create({ data: { hubId: hid, postId: post.id, userId: reactor, type: pick(REACTIONS), createdAt: daysAgo(randInt(0, 20)) } });
          hubReactions++;
        } catch { /* unique violation */ }
      }
    }
  }
  console.log(`Hubs: ${hubPosts} discussions, ${hubComments} comments, ${hubReactions} reactions.`);

  // 7) Opportunity comments + actions (saves / interest / invested) ---------
  let oppComments = 0, oppActions = 0;
  const states = ["SAVED", "SAVED", "VERY_INTERESTED", "INVESTED"] as const;
  for (const oid of oppIds) {
    for (const commenter of pickN(allUserIds, randInt(0, 4))) {
      await prisma.opportunityComment.create({ data: { opportunityId: oid, userId: commenter, body: pick(COMMENTS), createdAt: daysAgo(randInt(0, 40)) } });
      oppComments++;
    }
    for (const actor of pickN(allUserIds, randInt(2, 10))) {
      try {
        await prisma.opportunityAction.create({
          data: {
            userId: actor, opportunityId: oid, state: pick(states as unknown as string[]) as any,
            createdAt: daysAgo(randInt(0, 60)),
          },
        });
        oppActions++;
      } catch { /* unique violation */ }
    }
  }
  console.log(`Opportunities engagement: ${oppComments} comments, ${oppActions} actions.`);

  // 8) Conversations + messages ---------------------------------------------
  let convos = 0, messages = 0;
  const MSG = [
    "Saw your note on the logistics deal. Would love to compare diligence notes if you are open to it.",
    "Thanks for the thoughtful comment in the private credit thread. How are you sizing positions these days?",
    "Are you looking at the new solar portfolio? Curious what you make of the offtaker mix.",
    "Appreciated your post on search funds. Mind if I ask a couple of questions about the operator transition?",
    "Happy to share the comparable rent analysis I mentioned. Let me know where to send it.",
    "Good to connect here. I focus mostly on real assets, looks like we have some overlap.",
  ];
  for (let i = 0; i < 18; i++) {
    const a = pick(allUserIds);
    const b = pick(allUserIds.filter((id) => id !== a));
    const convo = await prisma.conversation.create({
      data: {
        createdAt: daysAgo(randInt(1, 40)),
        participants: { create: [{ userId: a }, { userId: b }] },
      },
      select: { id: true },
    });
    convos++;
    const turns = randInt(2, 5);
    let last = new Date(daysAgo(randInt(1, 30)));
    for (let t = 0; t < turns; t++) {
      const from = t % 2 === 0 ? a : b;
      const to = from === a ? b : a;
      last = new Date(last.getTime() + randInt(2, 600) * 60000);
      await prisma.message.create({
        data: { fromUserId: from, toUserId: to, conversationId: convo.id, body: pick(MSG), createdAt: last },
      });
      messages++;
    }
    await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: last } });
  }
  console.log(`Conversations: ${convos} threads, ${messages} messages.`);

  const totalOpps = await prisma.opportunity.count();
  console.log(`\nDone. Demo password for all accounts: ${DEMO_PASSWORD}`);
  console.log(`Total opportunities in database: ${totalOpps}.`);
}

main()
  .catch((e) => { console.error("Demo seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
