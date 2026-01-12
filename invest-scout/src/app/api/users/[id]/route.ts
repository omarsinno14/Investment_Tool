import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET(_req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const viewerId = await requireUserId();
    if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        interests: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isFollowing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: id } },
    });

    const profile = { ...user.profile };
    let email = user.email;
    if (!isFollowing) {
      if (profile?.hideAgeFromNonFollowers) profile.age = null;
      if (profile?.hideContactFromNonFollowers) {
        profile.phone = null;
        email = "";
      }
      if (profile?.hidePhotoFromNonFollowers) {
        profile.imageUrl = null;
      }
    }

    const showPosts = Boolean(isFollowing || !profile?.hidePostsFromNonFollowers);

    const opportunities = showPosts
      ? await prisma.opportunity.findMany({
          where: { createdByUserId: id, archivedAt: null },
          orderBy: { publishedAt: "desc" },
          take: 50,
        })
      : [];

    const forumPosts = showPosts
      ? await prisma.forumPost.findMany({
          where: { userId: id, archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];

    const followerCount = await prisma.follow.count({ where: { followingId: id } });
    const followingCount = await prisma.follow.count({ where: { followerId: id } });

    const viewerFollowing = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });

    const targetFollowing = await prisma.follow.findMany({
      where: { followerId: id },
      select: { followingId: true },
    });

    const viewerSet = new Set(viewerFollowing.map((f) => f.followingId));
    const mutualIds = targetFollowing.map((f) => f.followingId).filter((followId) => viewerSet.has(followId));

    const mutualFollowers = mutualIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mutualIds } },
          select: {
            id: true,
            email: true,
            profile: { select: { name: true, username: true, imageUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return NextResponse.json({
      user: {
        id: user.id,
        email,
        profile,
        interests: user.interests,
      },
      isFollowing: Boolean(isFollowing),
      followerCount,
      followingCount,
      mutualFollowers,
      opportunities,
      forumPosts,
    });
  } catch (e) {
    console.error("Failed to load user profile", e);
    return NextResponse.json({ error: "Failed to load user profile" }, { status: 500 });
  }
}
