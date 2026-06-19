import path from "path";
import { readFile } from "fs/promises";

export type NewsSource = {
  name: string;
  url: string;
  countries: string[];
  tags?: string[];
  reliability?: number;
};

export async function loadNewsSources(): Promise<NewsSource[]> {
  const customPath = process.env.NEWS_SOURCES_PATH;
  const filePath = customPath
    ? path.resolve(process.cwd(), customPath)
    : path.resolve(process.cwd(), "config", "news-sources.json");
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as NewsSource[];
  return parsed.filter((source) => Boolean(source?.name && source?.url));
}

export function normalizeCountry(value?: string | null) {
  if (!value) return null;
  return value.trim().toUpperCase();
}

export function pickSourcesForCountries(sources: NewsSource[], countries: string[]) {
  const normalized = countries.map((country) => country.toUpperCase());
  return sources.filter((source) =>
    source.countries.some((tag) => normalized.includes(tag.toUpperCase()) || tag.toUpperCase() === "GLOBAL")
  );
}
