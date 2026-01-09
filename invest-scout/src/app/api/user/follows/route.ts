import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: { select: { id: true, email: true, profile: { select: { username: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: { select: { id: true, email: true, profile: { select: { username: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      following: following.map((f) => f.following),
      followers: followers.map((f) => f.follower),
    });
  } catch (e) {
    console.error("Failed to load follows", e);
    return NextResponse.json({ error: "Failed to load follows" }, { status: 500 });
  }
}
