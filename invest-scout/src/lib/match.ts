export function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function extractKeywordsFromInterests(interests: Array<{ type: string; value: string; parent?: string | null }>) {
  const kws = new Set<string>();
  for (const i of interests) {
    kws.add(i.value);
    if (i.parent) kws.add(i.parent);
  }
  return Array.from(kws).map(normalize);
}

export function matchesKeywords(text: string, keywords: string[]) {
  const t = normalize(text);
  return keywords.some((k) => k && t.includes(k));
}
