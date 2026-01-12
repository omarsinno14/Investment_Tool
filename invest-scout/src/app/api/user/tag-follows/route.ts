import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") ?? "FORUM";

    const follows = await prisma.tagFollow.findMany({
      where: { userId, source: source as any },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ follows });
  } catch (e) {
    console.error("Failed to load tag follows", e);
    return NextResponse.json({ error: "Failed to load tag follows" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const tag = String(body?.tag ?? "").trim();
    const source = String(body?.source ?? "FORUM").toUpperCase();
    const action = String(body?.action ?? "add");

    if (!tag) return NextResponse.json({ error: "Tag required" }, { status: 400 });

    if (action === "remove") {
      await prisma.tagFollow.deleteMany({ where: { userId, tag, source: source as any } });
      return NextResponse.json({ ok: true });
    }

    const follow = await prisma.tagFollow.upsert({
      where: { userId_tag_source: { userId, tag, source: source as any } },
      create: { userId, tag, source: source as any },
      update: {},
    });

    return NextResponse.json({ follow });
  } catch (e) {
    console.error("Failed to update tag follows", e);
    return NextResponse.json({ error: "Failed to update tag follows" }, { status: 500 });
  }
}
