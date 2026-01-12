import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const fromUserIds = notifications
      .map((note) => (note.data as any)?.fromUserId)
      .filter((id) => typeof id === "string") as string[];

    const [blocked, blockedBy] = await Promise.all([
      prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
      prisma.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
    ]);
    const blockedIds = new Set([
      ...blocked.map((item) => item.blockedId),
      ...blockedBy.map((item) => item.blockerId),
    ]);

    const filtered = notifications.filter((note) => {
      const fromUserId = (note.data as any)?.fromUserId;
      return !(fromUserId && blockedIds.has(String(fromUserId)));
    });

    const uniqueFromIds = Array.from(new Set(fromUserIds.filter((id) => !blockedIds.has(id))));
    const [fromUsers, following, pendingRequests] = await Promise.all([
      uniqueFromIds.length
        ? prisma.user.findMany({
            where: { id: { in: uniqueFromIds } },
            select: {
              id: true,
              email: true,
              profile: { select: { name: true, username: true, imageUrl: true } },
            },
          })
        : Promise.resolve([]),
      uniqueFromIds.length
        ? prisma.follow.findMany({
            where: { followerId: userId, followingId: { in: uniqueFromIds } },
            select: { followingId: true },
          })
        : Promise.resolve([]),
      uniqueFromIds.length
        ? prisma.followRequest.findMany({
            where: { followerId: userId, followingId: { in: uniqueFromIds }, status: "PENDING" },
            select: { followingId: true, status: true },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(fromUsers.map((user) => [user.id, user]));
    const followingSet = new Set(following.map((item) => item.followingId));
    const requestMap = new Map(pendingRequests.map((item) => [item.followingId, item.status]));

    const enriched = filtered.map((note) => {
      const fromUserId = (note.data as any)?.fromUserId as string | undefined;
      return {
        ...note,
        fromUser: fromUserId ? userMap.get(fromUserId) ?? null : null,
        isFollowingFromUser: fromUserId ? followingSet.has(fromUserId) : false,
        followRequestStatus: fromUserId ? requestMap.get(fromUserId) ?? null : null,
      };
    });

    return NextResponse.json({ notifications: enriched });
  } catch (e) {
    console.error("Failed to load notifications", e);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.notificationId) {
      return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({ where: { id: String(body.notificationId) } });
    if (!notification || notification.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ status: "read" });
  } catch (e) {
    console.error("Failed to update notification", e);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
