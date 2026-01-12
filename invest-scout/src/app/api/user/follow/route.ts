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
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });

    const existingRequest = await prisma.followRequest.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });

    if (existing) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      });
      return NextResponse.json({ following: false, followRequestStatus: null });
    }

    if (existingRequest) {
      await prisma.followRequest.delete({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      });
      return NextResponse.json({ following: false, followRequestStatus: null });
    }

    const targetProfile = await prisma.profile.findUnique({
      where: { userId: targetId },
      select: { requiresFollowApproval: true },
    });

    if (targetProfile?.requiresFollowApproval) {
      const request = await prisma.followRequest.create({
        data: {
          followerId: userId,
          followingId: targetId,
        },
      });
      await prisma.notification.create({
        data: {
          userId: targetId,
          type: "FOLLOW_REQUEST",
          data: { requestId: request.id, fromUserId: userId },
        },
      });
      return NextResponse.json({ following: false, followRequestStatus: request.status });
    }

    await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: targetId,
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetId,
        type: "FOLLOW_ACCEPTED",
        data: { fromUserId: userId },
      },
    });

    return NextResponse.json({ following: true, followRequestStatus: null });
  } catch (e) {
    console.error("Failed to update follow", e);
    return NextResponse.json({ error: "Failed to update follow" }, { status: 500 });
  }
}
