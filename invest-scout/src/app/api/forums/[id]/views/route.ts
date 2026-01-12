import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

function bucketAge(age?: number | null) {
  if (age == null) return "Unknown";
  if (age < 18) return "<18";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  return "55+";
}

export async function GET(_req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post || post.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const views = await prisma.forumView.findMany({
      where: { postId: id },
      include: { viewer: { include: { profile: true, moneyManagement: true } } },
      orderBy: { createdAt: "asc" },
    });

    const timeline = new Map<string, number>();
    const demographics = {
      age: new Map<string, number>(),
      country: new Map<string, number>(),
    };

    for (const view of views) {
      const dateKey = new Date(view.createdAt).toISOString().slice(0, 10);
      timeline.set(dateKey, (timeline.get(dateKey) ?? 0) + 1);

      const ageBucket = bucketAge(view.viewer?.profile?.age ?? null);
      demographics.age.set(ageBucket, (demographics.age.get(ageBucket) ?? 0) + 1);

      const country = view.viewer?.moneyManagement?.locationCountry || "Unknown";
      demographics.country.set(country, (demographics.country.get(country) ?? 0) + 1);
    }

    const timelineSeries = Array.from(timeline.entries()).map(([date, count]) => ({ date, count }));
    const ageSeries = Array.from(demographics.age.entries()).map(([label, count]) => ({ label, count }));
    const countrySeries = Array.from(demographics.country.entries()).map(([label, count]) => ({ label, count }));

    return NextResponse.json({
      totalViews: views.length,
      timeline: timelineSeries,
      demographics: { age: ageSeries, country: countrySeries },
    });
  } catch (e) {
    console.error("Failed to load forum views", e);
    return NextResponse.json({ error: "Failed to load forum views" }, { status: 500 });
  }
}
