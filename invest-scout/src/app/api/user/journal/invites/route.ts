import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.entryId || !body?.identifier) {
      return NextResponse.json({ error: "Missing entryId or identifier" }, { status: 400 });
    }

    const entry = await prisma.journalEntry.findUnique({ where: { id: String(body.entryId) } });
    if (!entry || entry.ownerId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const identifier = normalizeIdentifier(String(body.identifier));
    const target = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { profile: { username: identifier } },
        ],
      },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.id === userId) return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

    const invite = await prisma.journalInvite.create({
      data: {
        entryId: entry.id,
        fromUserId: userId,
        toUserId: target.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: target.id,
        type: "JOURNAL_INVITE",
        data: { entryId: entry.id, fromUserId: userId, inviteId: invite.id },
      },
    });

    return NextResponse.json({ invite });
  } catch (e) {
    console.error("Failed to send journal invite", e);
    return NextResponse.json({ error: "Failed to send journal invite" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invites = await prisma.journalInvite.findMany({
      where: { toUserId: userId, status: "PENDING" },
      include: {
        entry: { select: { id: true, title: true, entryDate: true } },
        fromUser: { select: { id: true, email: true, profile: { select: { name: true, username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invites });
  } catch (e) {
    console.error("Failed to load journal invites", e);
    return NextResponse.json({ error: "Failed to load journal invites" }, { status: 500 });
  }
}
