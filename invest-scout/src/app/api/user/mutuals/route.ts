import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

function normalize(value: string) {
  return value.trim();
}

async function resolveRecipient(prisma: ReturnType<typeof getPrismaClient>, identifier: string) {
  const cleaned = normalize(identifier);
  if (!cleaned) return null;

  if (cleaned.includes("@")) {
    return prisma?.user.findUnique({ where: { email: cleaned.toLowerCase() } });
  }

  const digits = cleaned.replace(/[^\d+]/g, "");
  if (digits.length >= 7) {
    return prisma?.user.findFirst({ where: { profile: { phone: digits } } });
  }

  return prisma?.user.findFirst({ where: { profile: { username: cleaned } } });
}

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier") ?? "";
    const target = await resolveRecipient(prisma, identifier);
    if (!target) return NextResponse.json({ mutual: false, reason: "not_found" });

    if (target.id === userId) {
      return NextResponse.json({ mutual: false, reason: "self" });
    }

    const follows = await prisma.follow.findMany({
      where: {
        OR: [
          { followerId: userId, followingId: target.id },
          { followerId: target.id, followingId: userId },
        ],
      },
    });

    const hasOutgoing = follows.some((f) => f.followerId === userId);
    const hasIncoming = follows.some((f) => f.followerId === target.id);

    return NextResponse.json({ mutual: hasOutgoing && hasIncoming, targetId: target.id });
  } catch (e) {
    console.error("Failed to check mutual follow", e);
    return NextResponse.json({ error: "Failed to check mutual follow" }, { status: 500 });
  }
}
