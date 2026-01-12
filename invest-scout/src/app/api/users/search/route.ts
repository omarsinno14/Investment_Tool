import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const viewerId = await requireUserId();
    if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("q") ?? "").trim();
    if (!raw) return NextResponse.json({ users: [] });

    const [blocked, blockedBy] = await Promise.all([
      prisma.block.findMany({ where: { blockerId: viewerId }, select: { blockedId: true } }),
      prisma.block.findMany({ where: { blockedId: viewerId }, select: { blockerId: true } }),
    ]);
    const blockedIds = blocked.map((item) => item.blockedId);
    const blockedByIds = blockedBy.map((item) => item.blockerId);

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: raw, mode: "insensitive" } },
              { profile: { username: { contains: raw, mode: "insensitive" } } },
            ],
          },
          { id: { notIn: [...blockedIds, ...blockedByIds, viewerId] } },
        ],
      },
      select: {
        id: true,
        email: true,
        profile: { select: { name: true, username: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const userIds = users.map((user) => user.id);
    const [follows, requests] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: viewerId, followingId: { in: userIds } },
        select: { followingId: true },
      }),
      prisma.followRequest.findMany({
        where: { followerId: viewerId, followingId: { in: userIds }, status: "PENDING" },
        select: { followingId: true, status: true },
      }),
    ]);

    const followingSet = new Set(follows.map((item) => item.followingId));
    const requestMap = new Map(requests.map((item) => [item.followingId, item.status]));

    const enriched = users.map((user) => ({
      ...user,
      isFollowing: followingSet.has(user.id),
      followRequestStatus: requestMap.get(user.id) ?? null,
    }));

    return NextResponse.json({ users: enriched });
  } catch (e) {
    console.error("Failed to search users", e);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
