import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { extractImageUrl, fetchOgImage, fetchRss } from "@/lib/rss";
import { loadNewsSources, normalizeCountry, pickSourcesForCountries } from "@/lib/news-sources";
import { getCutoffDate, isFresh, loadInterestKeywordMap, matchArticleToInterests, normalizeText } from "@/lib/news-matcher";
import { REAL_ESTATE_ASSET_CLASSES, REAL_ESTATE_COUNTRIES_AND_CITIES, REAL_ESTATE_STRATEGIES, REAL_ESTATE_SUBTOPICS } from "@/lib/real-estate";

function parsePublishedAt(item: { isoDate?: string; pubDate?: string }) {
  const raw = item.isoDate ?? item.pubDate ?? null;
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function pickTags(title: string, summary: string | null, sourceTags: string[]) {
  const hay = `${title} ${summary ?? ""} ${sourceTags.join(" ")}`.toLowerCase();
  const countryTags = Object.keys(REAL_ESTATE_COUNTRIES_AND_CITIES).filter((country) => hay.includes(country.toLowerCase()));
  const cityTags = Object.values(REAL_ESTATE_COUNTRIES_AND_CITIES).flat().filter((city) => hay.includes(city.toLowerCase()));
  const assetTags = REAL_ESTATE_ASSET_CLASSES.filter((asset) => hay.includes(asset.toLowerCase()));
  const strategyTags = REAL_ESTATE_STRATEGIES.filter((strategy) => hay.includes(strategy.toLowerCase()));
  const keywordTags = REAL_ESTATE_SUBTOPICS.filter((k) => hay.includes(k.toLowerCase()));
  return { countryTags, cityTags, assetTags, strategyTags, keywordTags };
}

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.ADMIN_INGEST_TOKEN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const [sources, keywordMap, interests] = await Promise.all([
    loadNewsSources(),
    loadInterestKeywordMap(),
    prisma.interest.findMany({ select: { value: true, parent: true, type: true }, take: 2000 }),
  ]);

  const interestTerms = Array.from(new Set(interests.flatMap((i) => [i.value, i.parent].filter(Boolean) as string[]))).slice(0, 80);
  const countryRows = await prisma.moneyManagement.findMany({ select: { locationCountry: true } });
  const defaultCountries = (process.env.NEWS_DEFAULT_COUNTRIES ?? "").split(",").map((v) => normalizeCountry(v)).filter(Boolean) as string[];
  const countryTags = Array.from(new Set([...countryRows.map((row) => normalizeCountry(row.locationCountry)), ...defaultCountries].filter(Boolean)));

  const selectedSources = pickSourcesForCountries(sources, ["GLOBAL", ...countryTags]).slice(0, Number(process.env.NEWS_MAX_SOURCES || 30));
  const cutoff = getCutoffDate();

  let inserted = 0;
  let skipped = 0;

  for (const source of selectedSources) {
    let items: Awaited<ReturnType<typeof fetchRss>> = [];
    try { items = await fetchRss(source.url); } catch { continue; }

    for (const it of items) {
      if (!it.link || !it.title) continue;
      const publishedAt = parsePublishedAt(it);
      if (!isFresh(publishedAt, new Date())) { skipped += 1; continue; }
      if (!normalizeText(it.title)) continue;

      const existing = await prisma.opportunity.findFirst({ where: { createdByUserId: null, OR: [{ url: it.link }, { title: it.title }] }, select: { id: true } });
      if (existing) continue;

      const interestMatches = matchArticleToInterests({ title: it.title, summary: it.contentSnippet ?? null }, interestTerms, keywordMap);
      const imageUrl = extractImageUrl(it) ?? (it.link ? await fetchOgImage(it.link) : null);
      const tags = pickTags(it.title, it.contentSnippet ?? null, source.tags ?? []);

      try {
        await prisma.opportunity.create({
          data: {
            title: it.title,
            url: it.link,
            summary: it.contentSnippet ?? null,
            imageUrl,
            publishedAt,
            source: source.name,
            tags: source.tags ?? [],
            keywords: interestMatches,
            categories: source.tags ?? [],
            countryTags: Array.from(new Set([...(source.countries ?? []).filter((tag) => tag.toUpperCase() !== "GLOBAL"), ...tags.countryTags])),
            cityTags: tags.cityTags,
            assetTags: tags.assetTags,
            strategyTags: tags.strategyTags,
            keywordTags: tags.keywordTags,
            fetchedAt: new Date(),
          },
        });
        inserted += 1;
      } catch {}
    }
  }

  await prisma.opportunity.deleteMany({ where: { createdByUserId: null, publishedAt: { lt: cutoff } } });
  return NextResponse.json({ ok: true, inserted, skipped });
}
