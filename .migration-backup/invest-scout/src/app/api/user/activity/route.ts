import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const reactions = await prisma.forumReaction.findMany({
      where: { userId },
      include: { post: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const comments = await prisma.forumComment.findMany({
      where: { userId },
      include: { post: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const saves = await prisma.forumSave.findMany({
      where: { userId },
      include: { post: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ reactions, comments, saves });
  } catch (e) {
    console.error("Failed to load activity", e);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
