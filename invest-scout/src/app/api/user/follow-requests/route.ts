import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const incoming = await prisma.followRequest.findMany({
      where: { followingId: userId, status: "PENDING" },
      include: {
        follower: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const outgoing = await prisma.followRequest.findMany({
      where: { followerId: userId, status: "PENDING" },
      include: {
        following: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ incoming, outgoing });
  } catch (e) {
    console.error("Failed to load follow requests", e);
    return NextResponse.json({ error: "Failed to load follow requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.requestId || !body?.action) {
      return NextResponse.json({ error: "Missing requestId or action" }, { status: 400 });
    }

    const request = await prisma.followRequest.findUnique({ where: { id: String(body.requestId) } });
    if (!request || request.followingId !== userId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const action = String(body.action);
    if (action === "accept") {
      await prisma.followRequest.update({
        where: { id: request.id },
        data: { status: "ACCEPTED" },
      });
      await prisma.follow.create({
        data: {
          followerId: request.followerId,
          followingId: request.followingId,
        },
      });
      await prisma.notification.create({
        data: {
          userId: request.followerId,
          type: "FOLLOW_ACCEPTED",
          data: { fromUserId: userId },
        },
      });
      return NextResponse.json({ status: "ACCEPTED" });
    }

    await prisma.followRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED" },
    });
    return NextResponse.json({ status: "DECLINED" });
  } catch (e) {
    console.error("Failed to update follow request", e);
    return NextResponse.json({ error: "Failed to update follow request" }, { status: 500 });
  }
}
