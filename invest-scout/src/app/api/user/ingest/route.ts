import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { buildNewsSources, fetchRss } from "@/lib/rss";

type InterestRecord = { type: string; value: string; parent?: string | null };

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function buildQueries(interests: InterestRecord[]) {
  const countries = dedupe(
    interests.filter((i) => i.type === "COUNTRY").map((i) => i.value)
  );
  const terms = dedupe(
    interests
      .filter((i) => i.type !== "COUNTRY")
      .flatMap((i) => [i.value, i.parent].filter(Boolean) as string[])
  );

  const baseTerms = terms.length ? terms : countries;
  const queries: string[] = [];

  for (const t of baseTerms) {
    if (countries.length) {
      for (const c of countries) {
        queries.push(`${t} ${c} investment opportunity OR funding OR acquisition OR IPO`);
      }
    } else {
      queries.push(`${t} investment opportunity OR funding OR acquisition OR IPO`);
    }
  }

  if (!queries.length) return [];
  return queries.slice(0, 24);
}

function normalize(value: string) {
  return value.toLowerCase();
}

function shouldKeep(
  item: { title?: string; contentSnippet?: string },
  terms: string[],
  countries: string[]
) {
  const hay = normalize(`${item.title ?? ""} ${item.contentSnippet ?? ""}`);
  const matchesTerm = terms.length === 0 || terms.some((t) => t.length >= 2 && hay.includes(normalize(t)));
  const matchesCountry =
    countries.length === 0 || countries.some((c) => c.length >= 2 && hay.includes(normalize(c)));
  return matchesTerm && matchesCountry;
}

export async function POST() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interests = await prisma.interest.findMany({
      where: { userId },
      select: { type: true, value: true, parent: true },
    });

    const typedInterests = interests as InterestRecord[];
    const queries = buildQueries(typedInterests);
    if (!queries.length) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const terms = dedupe(
      typedInterests
        .filter((i) => i.type !== "COUNTRY")
        .flatMap((i) => [i.value, i.parent].filter(Boolean) as string[])
    );
    const countries = dedupe(typedInterests.filter((i) => i.type === "COUNTRY").map((i) => i.value));

    let inserted = 0;

    for (const q of queries) {
      const sources = buildNewsSources(q);

      for (const source of sources) {
        const items = await fetchRss(source.url);

        for (const it of items) {
          if (!it.link || !it.title) continue;
          if (!shouldKeep(it, terms, countries)) continue;

          const publishedAt = it.isoDate ? new Date(it.isoDate) : it.pubDate ? new Date(it.pubDate) : null;
          const keywords = q.split(" ").slice(0, 12);

          try {
            await prisma.opportunity.create({
              data: {
                title: it.title,
                url: it.link,
                summary: it.contentSnippet ?? null,
                publishedAt,
                source: source.name,
                keywords,
              },
            });
            inserted += 1;
          } catch {
            // ignore duplicates (unique on url)
          }
        }
      }
    }

    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    console.error("Failed to ingest user opportunities", e);
    return NextResponse.json({ error: "Failed to ingest opportunities" }, { status: 500 });
  }
}
