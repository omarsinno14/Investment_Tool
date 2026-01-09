import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { fetchRss, googleNewsRss } from "@/lib/rss";

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
  return queries.slice(0, 12);
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

    const queries = buildQueries(interests as InterestRecord[]);
    if (!queries.length) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    let inserted = 0;

    for (const q of queries) {
      const url = googleNewsRss(q);
      const items = await fetchRss(url);

      for (const it of items) {
        if (!it.link || !it.title) continue;

        const publishedAt = it.isoDate ? new Date(it.isoDate) : it.pubDate ? new Date(it.pubDate) : null;
        const keywords = q.split(" ").slice(0, 12);

        try {
          await prisma.opportunity.create({
            data: {
              title: it.title,
              url: it.link,
              summary: it.contentSnippet ?? null,
              publishedAt,
              source: "Google News RSS",
              keywords,
            },
          });
          inserted += 1;
        } catch {
          // ignore duplicates (unique on url)
        }
      }
    }

    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    console.error("Failed to ingest user opportunities", e);
    return NextResponse.json({ error: "Failed to ingest opportunities" }, { status: 500 });
  }
}
