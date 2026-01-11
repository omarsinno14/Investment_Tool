import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

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

    return NextResponse.json({ posts, viewerId: userId });
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
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
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
