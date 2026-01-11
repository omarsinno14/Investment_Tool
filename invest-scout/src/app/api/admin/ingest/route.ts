import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { buildNewsSources, extractImageUrl, fetchOgImage, fetchRss } from "@/lib/rss";

function normalize(str: string) {
  return str.toLowerCase();
}

function shouldKeep(item: { title?: string; contentSnippet?: string }, terms: string[]) {
  if (!terms.length) return true;
  const hay = normalize(`${item.title ?? ""} ${item.contentSnippet ?? ""}`);
  return terms.some((t) => t.length >= 2 && hay.includes(normalize(t)));
}

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.ADMIN_INGEST_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  // Build queries from global interests pool (MVP):
  // We take top distinct user interests to generate queries.
  const interests = await prisma.interest.findMany({
    select: { value: true, parent: true, type: true },
    take: 2000,
  });

  const values = Array.from(
    new Set(
      interests
        .flatMap((i) => [i.value, i.parent].filter(Boolean) as string[])
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).slice(0, 40);

  const queries = values.map((v) => `${v} investment opportunity OR funding OR acquisition OR IPO`);
  const terms = values.map((v) => v.toLowerCase());

  let inserted = 0;

  for (const q of queries) {
    const sources = buildNewsSources(q);

    for (const source of sources) {
      const items = await fetchRss(source.url);

      for (const it of items) {
        if (!it.link || !it.title) continue;
        if (!shouldKeep(it, terms)) continue;

        const publishedAt = it.isoDate ? new Date(it.isoDate) : it.pubDate ? new Date(it.pubDate) : null;
        const imageUrl = extractImageUrl(it) ?? (it.link ? await fetchOgImage(it.link) : null);

        try {
          await prisma.opportunity.create({
            data: {
              title: it.title,
              url: it.link,
              type: "HEADLINE",
              summary: it.contentSnippet ?? null,
              imageUrl,
              publishedAt,
              source: source.name,
              keywords: q.split(" ").slice(0, 10),
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
}
