import { prisma } from "./db.js";

/**
 * Interest matching shared by deals, news and forum threads.
 *
 * Interest labels ("Farmland & Agriculture", "Venture Capital", "Toronto") rarely
 * equal content tags ("farmland", "early-stage", "Toronto, Canada"), so each
 * interest expands to a set of phrases (its own words, its specific single words
 * and a few domain synonyms) that are looked up in the item's normalized text.
 */

export type InterestInput = { type: string; value: string };

export type MatchResult = { score: number; matched: string[] };

type Rule = { label: string; type: string; phrases: string[]; weight: number };

// Words too generic to signal interest on their own.
const STOP = new Set([
  "and", "the", "of", "for", "in", "a", "an", "to",
  "fund", "funds", "investing", "investment", "investments", "deal", "deals",
  "financing", "finance", "capital", "private", "business", "small", "equity",
  "market", "markets", "strategy", "strategies", "management", "analysis",
  "public", "non", "traded", "rental", "term", "short", "net", "triple",
]);

const SYNONYMS: Record<string, string[]> = {
  "private equity": ["buyout", "search fund", "acquisition", "lbo"],
  "venture capital": ["venture", "startup", "early stage", "seed", "series a"],
  "angel investing": ["startup", "early stage", "seed", "angel"],
  "private credit": ["private credit", "direct lending", "lending", "loan"],
  "bonds": ["fixed income", "bond", "treasury"],
  "dividend investing": ["dividend", "income"],
  "infrastructure funds": ["infrastructure"],
  "farmland agriculture": ["farmland", "agriculture", "agri"],
  "music royalties": ["royalties", "royalty", "music"],
  "film media financing": ["media", "film"],
  "carbon credits": ["carbon", "esg", "climate"],
  "residential": ["residential", "multifamily", "apartment", "housing"],
  "multifamily": ["multifamily", "apartment"],
  "commercial": ["commercial", "office", "retail"],
  "industrial": ["industrial", "logistics", "warehouse"],
  "hospitality": ["hospitality", "hotel"],
  "healthcare": ["healthcare", "medical", "senior living", "clinic"],
  "reits": ["reit"],
  "value add": ["value add"],
  "small business equity": ["small business"],
  "business acquisitions": ["acquisition", "search fund", "buyout"],
  "saas app acquisitions": ["saas", "software"],
  "fine art": ["art"],
  "luxury watches": ["watch", "luxury"],
  "classic cars": ["classic car", "collectible"],
  "fine wine": ["wine"],
  "rare whisky": ["whisky", "whiskey"],
  "market analysis": ["market outlook", "market update", "market report"],
  "buy and hold": ["buy and hold", "long term hold", "stabilized", "core plus"],
  "fix and flip": ["fix and flip", "flip"],
  "due diligence": ["due diligence", "diligence"],
  "short term rental": ["short term rental", "airbnb", "vacation rental"],
  "renewable energy": ["renewable", "solar", "wind", "energy"],
};

const PLACE_ALIASES: Record<string, string[]> = {
  "united states": ["usa", "u s", "america"],
  "united kingdom": ["uk", "britain", "england"],
  "uae": ["united arab emirates", "dubai", "abu dhabi"],
  "south korea": ["korea"],
};

export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

function singular(word: string) {
  return word.length > 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

function buildRules(interests: InterestInput[]): Rule[] {
  return interests.map(({ type, value }) => {
    const phrase = normalize(value).trim();
    const isPlace = type === "COUNTRY" || type === "CITY";
    const phrases = new Set<string>([phrase]);
    if (isPlace) {
      for (const alias of PLACE_ALIASES[phrase] ?? []) phrases.add(alias);
    } else {
      for (const syn of SYNONYMS[phrase] ?? []) phrases.add(normalize(syn).trim());
      // Split into single words only for one-word labels or lists like
      // "Farmland & Agriculture"; words of a phrase ("Buy and Hold") are too vague alone.
      const isList = /[&,/]/.test(value);
      const words = phrase.split(" ");
      if (isList || words.length === 1) {
        for (const word of words) {
          if (word.length > 2 && !STOP.has(word)) phrases.add(singular(word));
        }
      }
    }
    // Cities are the most specific signal, then topics, then countries.
    const weight = type === "CITY" ? 3 : isPlace ? 1.5 : 2;
    return { label: value, type, phrases: [...phrases].filter(Boolean), weight };
  });
}

/** Build a matcher for one member's interests. Returns null when they have none. */
export function createInterestMatcher(interests: InterestInput[]) {
  if (interests.length === 0) return null;
  const rules = buildRules(interests);
  return (...fields: Array<string | string[] | null | undefined>): MatchResult => {
    const haystack = normalize(fields.flat().filter(Boolean).join(" "));
    // Also index singular forms so "royalties" matches "royalty" phrases and vice versa.
    const singularHaystack = normalize(haystack.trim().split(" ").map(singular).join(" "));
    let score = 0;
    const matched: string[] = [];
    for (const rule of rules) {
      const hit = rule.phrases.some((p) => haystack.includes(` ${p} `) || singularHaystack.includes(` ${singular(p)} `));
      if (hit) {
        score += rule.weight;
        matched.push(rule.label);
      }
    }
    return { score, matched };
  };
}

export async function loadInterestMatcher(userId: string) {
  const interests = await prisma.interest.findMany({ where: { userId }, select: { type: true, value: true } });
  return createInterestMatcher(interests);
}

/** Text fields of an opportunity that describe what and where it is. */
export function opportunityFields(o: {
  title?: string | null;
  summary?: string | null;
  tags?: string[];
  categories?: string[];
  countryTags?: string[];
  cityTags?: string[];
  assetTags?: string[];
  strategyTags?: string[];
  keywordTags?: string[];
  locationName?: string | null;
}) {
  return [
    o.title,
    o.summary,
    o.tags,
    o.categories,
    o.countryTags,
    o.cityTags,
    o.assetTags,
    o.strategyTags,
    o.keywordTags,
    o.locationName,
  ];
}
