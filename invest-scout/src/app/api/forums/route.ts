import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { sanitizeProfanity } from "@/lib/profanity";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const posts = await prisma.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { archivedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name: true,
                username: true,
                imageUrl: true,
                emailVerified: true,
                phoneVerified: true,
                identityVerified: true,
              },
            },
          },
        },
        comments: true,
        reactions: true,
        saves: true,
        reposts: true,
      },
    });

    const viewerFollowing = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingSet = new Set(viewerFollowing.map((f) => f.followingId));

    const sanitized = posts.map((post) => {
      if (post.userId === userId) return post;
      if (!followingSet.has(post.userId)) {
        return {
          ...post,
          user: {
            ...post.user,
            email: "",
            profile: {
              ...post.user.profile,
              name: null,
              username: null,
              imageUrl: null,
            },
          },
        };
      }
      return post;
    });

    return NextResponse.json({ posts: sanitized, viewerId: userId });
  } catch (e) {
    console.error("Failed to load forum posts", e);
    return NextResponse.json({ error: "Failed to load forum posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const title = sanitizeProfanity(String(formData.get("title") ?? "").trim());
    const body = sanitizeProfanity(String(formData.get("body") ?? "").trim());
    const tagString = String(formData.get("tags") ?? "").trim();

    if (!title || !body) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    const tags = tagString
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "forums", userId);
    await fs.mkdir(uploadDir, { recursive: true });
    let imageUrl: string | null = null;
    const file = formData.get("image");
    if (file instanceof File && file.type.startsWith("image/")) {
      const ext = path.extname(file.name).replace(".", "") || file.type.split("/")[1] || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, filename), buffer);
      imageUrl = `/uploads/forums/${userId}/${filename}`;
    }

    const post = await prisma.forumPost.create({
      data: {
        userId,
        title,
        body,
        tags,
        imageUrl,
      },
    });

    return NextResponse.json({ post });
  } catch (e) {
    console.error("Failed to create forum post", e);
    return NextResponse.json({ error: "Failed to create forum post" }, { status: 500 });
  }
}
