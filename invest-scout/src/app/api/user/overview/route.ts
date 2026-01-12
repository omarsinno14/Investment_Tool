import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, interests: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const profile = { ...user.profile };
    const isPublicPreview = view === "public";

    if (isPublicPreview) {
      if (profile?.hideAgeFromNonFollowers) profile.age = null;
      if (profile?.hideContactFromNonFollowers) {
        profile.phone = null;
        user.email = "";
      }
      if (profile?.hidePhotoFromNonFollowers) {
        profile.imageUrl = null;
        profile.coverPhotoUrl = null;
      }
    }

    const showPosts = !isPublicPreview || !profile?.hidePostsFromNonFollowers;

    const opportunities = showPosts
      ? await prisma.opportunity.findMany({
          where: { createdByUserId: userId, archivedAt: null },
          orderBy: { publishedAt: "desc" },
          take: 50,
        })
      : [];

    const forumPosts = showPosts
      ? await prisma.forumPost.findMany({
          where: { userId, archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        profile,
        interests: user.interests,
      },
      opportunities,
      forumPosts,
      publicPreview: isPublicPreview,
    });
  } catch (e) {
    console.error("Failed to load overview", e);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
