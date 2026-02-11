import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { extractImageUrl, fetchOgImage, fetchRss } from "@/lib/rss";
import { loadNewsSources, normalizeCountry, pickSourcesForCountries } from "@/lib/news-sources";
import { getCutoffDate, isFresh, loadInterestKeywordMap, matchArticleToInterests, normalizeText } from "@/lib/news-matcher";

function parsePublishedAt(item: { isoDate?: string; pubDate?: string }) {
  const raw = item.isoDate ?? item.pubDate ?? null;
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.ADMIN_INGEST_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const [sources, keywordMap, interests] = await Promise.all([
    loadNewsSources(),
    loadInterestKeywordMap(),
    prisma.interest.findMany({
      select: { value: true, parent: true, type: true },
      take: 2000,
    }),
  ]);

  const interestTerms = Array.from(
    new Set(
      interests
        .flatMap((i) => [i.value, i.parent].filter(Boolean) as string[])
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).slice(0, 80);

  const countryRows = await prisma.moneyManagement.findMany({
    select: { locationCountry: true },
  });
  const defaultCountries = (process.env.NEWS_DEFAULT_COUNTRIES ?? "")
    .split(",")
    .map((value) => normalizeCountry(value))
    .filter(Boolean) as string[];
  const countryTags = Array.from(
    new Set(
      [...countryRows.map((row) => normalizeCountry(row.locationCountry)), ...defaultCountries].filter(Boolean)
    )
  );

  const pickCountries = ["GLOBAL", ...countryTags];
  const pickCountriesClean = pickCountries.filter((c): c is string => Boolean(c));
  const picked = pickSourcesForCountries(sources, pickCountriesClean);
  const maxSources = Number(process.env.NEWS_MAX_SOURCES || 30);
  const selectedSources = picked.slice(0, maxSources);
  const cutoff = getCutoffDate();

  let inserted = 0;
  let skipped = 0;

  for (const source of selectedSources) {
    let items: Awaited<ReturnType<typeof fetchRss>> = [];
    try {
      items = await fetchRss(source.url);
    } catch {
      continue;
    }

    for (const it of items) {
      if (!it.link || !it.title) continue;
      const publishedAt = parsePublishedAt(it);
      if (!isFresh(publishedAt, new Date())) {
        skipped += 1;
        continue;
      }
      const normalizedTitle = normalizeText(it.title);
      if (!normalizedTitle) continue;

      const existing = await prisma.opportunity.findFirst({
        where: {
          createdByUserId: null,
          OR: [{ url: it.link }, { title: it.title }],
        },
        select: { id: true },
      });
      if (existing) continue;

      const interestMatches = matchArticleToInterests(
        { title: it.title, summary: it.contentSnippet ?? null },
        interestTerms,
        keywordMap
      );
      const imageUrl = extractImageUrl(it) ?? (it.link ? await fetchOgImage(it.link) : null);

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
            countryTags: (source.countries ?? []).filter((tag) => tag.toUpperCase() !== "GLOBAL"),
            fetchedAt: new Date(),
          },
        });
        inserted += 1;
      } catch {
        // ignore duplicates
      }
    }
  }

  await prisma.opportunity.deleteMany({
    where: {
      createdByUserId: null,
      publishedAt: { lt: cutoff },
    },
  });

  return NextResponse.json({ ok: true, inserted, skipped });
}
