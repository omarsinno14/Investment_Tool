export const REAL_ESTATE_ASSET_CLASSES = [
  "Residential",
  "Commercial",
  "Industrial",
  "Retail",
  "Hospitality",
  "Land",
  "Mixed-use",
] as const;

export const REAL_ESTATE_STRATEGIES = [
  "Buy-to-let",
  "Flip",
  "Development",
  "Value-add",
  "Core/Core+",
  "Opportunistic",
] as const;

export const REAL_ESTATE_REITS = ["REITs", "Equity REIT", "Mortgage REIT"] as const;

export const REAL_ESTATE_SUBTOPICS = [
  "Property management",
  "Short-term rentals",
  "Long-term rentals",
  "Mortgage/financing",
  "Legal/tax",
  "Construction costs",
  "Yield/Cap rate",
  "Vacancy",
  "Appreciation",
  "Rental comps",
] as const;

export const REAL_ESTATE_COUNTRIES_AND_CITIES: Record<string, string[]> = {
  UAE: ["Dubai", "Abu Dhabi", "Sharjah"],
  Lebanon: ["Beirut", "Jounieh", "Tripoli"],
  Greece: ["Athens", "Thessaloniki", "Santorini"],
  Syria: ["Damascus", "Aleppo", "Latakia"],
  Qatar: ["Doha", "Lusail", "Al Wakrah"],
  Oman: ["Muscat", "Salalah", "Sohar"],
  Egypt: ["Cairo", "Alexandria", "New Cairo"],
  Turkey: ["Istanbul", "Ankara", "Izmir"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Dammam"],
};

export const REAL_ESTATE_COUNTRIES = Object.keys(REAL_ESTATE_COUNTRIES_AND_CITIES);

export function cityToCountry(city: string): string | null {
  const lower = city.toLowerCase();
  for (const [country, cities] of Object.entries(REAL_ESTATE_COUNTRIES_AND_CITIES)) {
    if (cities.some((c) => c.toLowerCase() === lower)) return country;
  }
  return null;
}
