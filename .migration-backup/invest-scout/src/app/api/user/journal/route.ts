import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { hashPassword } from "@/lib/password";

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const date = searchParams.get("date");

    const entries = await prisma.journalEntry.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId } } },
        ],
        ...(date ? { entryDate: new Date(date) } : {}),
      },
      orderBy: { entryDate: "desc" },
      include: { collaborators: { select: { userId: true } } },
    });

    const filtered = q
      ? entries.filter((entry) => {
          const hay = `${entry.title ?? ""} ${entry.body ?? ""}`.toLowerCase();
          return hay.includes(q);
        })
      : entries;

    return NextResponse.json({
      entries: filtered.map((entry) => ({
        id: entry.id,
        title: entry.title,
        entryDate: entry.entryDate,
        isOwner: entry.ownerId === userId,
        isLocked: Boolean(entry.passwordHash),
        collaboratorCount: entry.collaborators.length,
      })),
    });
  } catch (e) {
    console.error("Failed to load journal entries", e);
    return NextResponse.json({ error: "Failed to load journal entries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.body) return NextResponse.json({ error: "Body is required" }, { status: 400 });

    const passwordHash = body.password ? await hashPassword(String(body.password)) : null;
    const entryDate = body.entryDate ? new Date(body.entryDate) : new Date();

    const entry = await prisma.journalEntry.create({
      data: {
        ownerId: userId,
        title: body.title ? String(body.title).trim() : null,
        body: String(body.body),
        entryDate,
        imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : [],
        chartData: body.chartData ?? null,
        passwordHash,
      },
    });

    return NextResponse.json({ entry });
  } catch (e) {
    console.error("Failed to create journal entry", e);
    return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
  }
}
