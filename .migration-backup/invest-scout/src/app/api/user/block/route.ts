import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const targetId = String(body.userId);
    if (targetId === userId) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    const existing = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
    });

    if (existing) {
      await prisma.block.delete({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      });
      return NextResponse.json({ blocked: false });
    }

    await prisma.block.create({
      data: { blockerId: userId, blockedId: targetId },
    });

    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: targetId },
          { followerId: targetId, followingId: userId },
        ],
      },
    });

    await prisma.followRequest.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: targetId },
          { followerId: targetId, followingId: userId },
        ],
      },
    });

    return NextResponse.json({ blocked: true });
  } catch (e) {
    console.error("Failed to update block", e);
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}
