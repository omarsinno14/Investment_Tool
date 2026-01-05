import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const interests = await prisma.interest.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { type: true, value: true, parent: true },
    });

    return NextResponse.json({ interests });
  } catch (e) {
    console.error("Failed to load interests", e);
    return NextResponse.json({ error: "Failed to load interests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const interests = Array.isArray(body?.interests) ? body.interests : null;
    if (!interests) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const allowedTypes = new Set(["SECTOR", "INDUSTRY", "COUNTRY", "CUSTOM"]);
    const deduped: { type: string; value: string; parent: string | null }[] = [];
    const seen = new Set<string>();

    for (const i of interests) {
      const type = String(i?.type ?? "").toUpperCase();
      if (!allowedTypes.has(type)) continue;

      const rawValue = String(i?.value ?? "").trim();
      if (!rawValue) continue;

      const value = rawValue.slice(0, 120); // avoid oversized values
      const parent = i?.parent ? String(i.parent).slice(0, 120) : null;
      const key = `${type}:${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      deduped.push({ type, value, parent });
    }

    if (!deduped.length) {
      await prisma.interest.deleteMany({ where: { userId } });
      return NextResponse.json({ ok: true, interests: [] });
    }

    // Replace the list in one transaction (simple + reliable)
    await prisma.$transaction([
      prisma.interest.deleteMany({ where: { userId } }),
      prisma.interest.createMany({ data: deduped.map((i) => ({ ...i, userId })) }),
    ]);

    return NextResponse.json({ ok: true, interests: deduped });
  } catch (e) {
    console.error("Failed to save interests", e);
    return NextResponse.json({ error: "Failed to save interests" }, { status: 500 });
  }
}
