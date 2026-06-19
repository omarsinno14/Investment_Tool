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

export const ASSET_CLASSES: string[] = [...REAL_ESTATE_ASSET_CLASSES];
export const STRATEGIES: string[] = [...REAL_ESTATE_STRATEGIES];
export const REITS: string[] = [...REAL_ESTATE_REITS];
export const SUBTOPICS: string[] = [...REAL_ESTATE_SUBTOPICS];
export const COUNTRIES: string[] = [...REAL_ESTATE_COUNTRIES];
export const CITIES_BY_COUNTRY: Record<string, string[]> = REAL_ESTATE_COUNTRIES_AND_CITIES;


// Backward-compatible aliases used by opportunities UI
export const SECTORS: string[] = [...ASSET_CLASSES];
export const INDUSTRIES_BY_SECTOR: Record<string, string[]> = Object.fromEntries(
  ASSET_CLASSES.map((asset) => [asset, [...SUBTOPICS]])
);
