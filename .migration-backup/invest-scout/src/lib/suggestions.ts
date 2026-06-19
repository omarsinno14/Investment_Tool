function norm(s: string) {
  return s.toLowerCase().trim();
}

function uniq(list: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    const k = norm(x);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function scoreSuggestion(q: string, s: string) {
  const Q = norm(q);
  const S = norm(s);

  // simple scoring: prefer suggestions that contain the query early, and word-start matches
  const idx = S.indexOf(Q);
  let score = 0;

  if (idx === 0) score += 100;
  if (idx > 0) score += Math.max(20 - idx, 0);

  // word boundary boosts
  const words = S.split(/\s+/);
  for (const w of words) {
    if (w.startsWith(Q)) score += 40;
  }

  // length penalty (too long looks spammy)
  score -= Math.max(S.length - 36, 0) * 0.2;

  return score;
}

const GENERIC_INTENTS = [
  "investment opportunity",
  "funding round",
  "venture capital",
  "private equity",
  "mergers and acquisitions",
  "IPO",
  "earnings",
  "valuation",
  "regulation",
  "tender",
  "government contract",
  "partnership",
  "strategic investment",
];

const FINANCE_MACRO = [
  "interest rates",
  "bond yields",
  "inflation",
  "FX rates",
  "central bank",
];

const REAL_ESTATE_INTENTS = [
  "off-plan",
  "mortgage rates",
  "rental yields",
  "REIT",
  "commercial real estate",
  "residential real estate",
  "property developer",
];

const DUBAI_SPECIAL = [
  "Dubai off-plan",
  "Dubai real estate developer",
  "Dubai rental yields",
  "Dubai mortgage rates",
  "Dubai REIT",
  "Dubai property launch",
];

const AI_SPECIAL = [
  "AI data centers",
  "GPU supply chain",
  "AI chips",
  "AI regulation",
  "AI startup funding",
];

export function buildSmartSuggestions(args: {
  query: string;
  selectedCountries: string[];
  selectedSectors: string[];
  selectedIndustries: string[];
}) {
  const q = args.query.trim();
  if (q.length < 2) return [];

  const Q = norm(q);

  const countries = args.selectedCountries;
  const sectors = args.selectedSectors;
  const industries = args.selectedIndustries;

  const base: string[] = [];

  // 1) Direct expansions of what they typed
  base.push(q);
  for (const intent of GENERIC_INTENTS) base.push(`${q} ${intent}`);

  // 2) If query contains common themes, suggest stronger ones
  if (Q.includes("dubai") || Q === "dubai") base.push(...DUBAI_SPECIAL);
  if (Q.includes("real estate") || Q.includes("property") || Q.includes("off-plan")) {
    for (const intent of REAL_ESTATE_INTENTS) base.push(`${q} ${intent}`);
  }
  if (Q.includes("ai") || Q.includes("artificial") || Q.includes("machine")) base.push(...AI_SPECIAL);
  if (Q.includes("rates") || Q.includes("bonds") || Q.includes("inflation") || Q.includes("fx")) {
    base.push(...FINANCE_MACRO.map((x) => `${q} ${x}`));
  }

  // 3) Country combos (highest ROI for your matching + ingestion)
  for (const c of countries.slice(0, 12)) {
    base.push(`${c} ${q}`);
    base.push(`${c} ${q} investment`);
    base.push(`${c} ${q} funding`);
    base.push(`${c} ${q} acquisition`);
  }

  // 4) Sector + Industry combos
  for (const s of sectors.slice(0, 8)) {
    base.push(`${s} ${q}`);
    base.push(`${q} ${s}`);
  }
  for (const ind of industries.slice(0, 12)) {
    base.push(`${ind} ${q}`);
    base.push(`${q} ${ind}`);
  }

  // 5) If user typed a country name (approx) then add sector/industry within that country
  const likelyCountry = countries.find((c) => norm(c) === Q || norm(c).includes(Q));
  if (likelyCountry) {
    for (const s of sectors.slice(0, 8)) base.push(`${likelyCountry} ${s}`);
    for (const ind of industries.slice(0, 12)) base.push(`${likelyCountry} ${ind}`);
  }

  const candidates = uniq(base);

  // rank by score against query
  const ranked = candidates
    .map((s) => ({ s, sc: scoreSuggestion(q, s) }))
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.s);

  // keep it tight
  return ranked.slice(0, 12);
}
