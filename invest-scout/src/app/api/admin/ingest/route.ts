import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchRss, googleNewsRss } from "@/lib/rss";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.ADMIN_INGEST_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build queries from global interests pool (MVP):
  // We take top distinct user interests to generate queries.
  const interests = await prisma.userInterest.findMany({
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

  let inserted = 0;

  for (const q of queries) {
    const url = googleNewsRss(q);
    const items = await fetchRss(url);

    for (const it of items) {
      if (!it.link || !it.title) continue;

      const publishedAt = it.isoDate ? new Date(it.isoDate) : it.pubDate ? new Date(it.pubDate) : null;

      try {
        await prisma.opportunity.create({
          data: {
            title: it.title,
            url: it.link,
            summary: it.contentSnippet ?? null,
            publishedAt,
            source: "Google News RSS",
            keywords: q.split(" ").slice(0, 10),
          },
        });
        inserted += 1;
      } catch {
        // ignore duplicates (unique on url)
      }
    }
  }

  return NextResponse.json({ ok: true, inserted });
}
