import path from "path";
import { readFile } from "fs/promises";

export type InterestKeywordMap = Record<string, string[]>;

export async function loadInterestKeywordMap(): Promise<InterestKeywordMap> {
  const customPath = process.env.NEWS_INTEREST_KEYWORDS_PATH;
  const filePath = customPath
    ? path.resolve(process.cwd(), customPath)
    : path.resolve(process.cwd(), "config", "interest-keywords.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as InterestKeywordMap;
}

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function getCutoffDate(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 6);
  return cutoff;
}

export function isFresh(date: Date | null | undefined, now = new Date()) {
  if (!date || Number.isNaN(date.getTime())) return false;
  return date >= getCutoffDate(now);
}

export function matchArticleToInterests(
  input: { title?: string | null; summary?: string | null; content?: string | null },
  interests: string[],
  keywordMap: InterestKeywordMap
) {
  const text = normalizeText(`${input.title ?? ""} ${input.summary ?? ""} ${input.content ?? ""}`);
  const matches = new Set<string>();

  for (const interest of interests) {
    const key = normalizeText(interest);
    if (!key) continue;
    const keywords = keywordMap[key] ?? [key];
    for (const keyword of keywords) {
      const needle = normalizeText(keyword);
      if (needle && text.includes(needle)) {
        matches.add(key);
      }
    }
  }

  return Array.from(matches);
}
