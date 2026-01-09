import { NextResponse } from "next/server";
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
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true, username: true, imageUrl: true, emailVerified: true, phoneVerified: true } },
          },
        },
        comments: true,
        reactions: true,
        saves: true,
        reposts: true,
      },
    });

    return NextResponse.json({ posts });
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

    const body = await req.json().catch(() => null);
    if (!body?.title || !body?.body) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    const post = await prisma.forumPost.create({
      data: {
        userId,
        title: String(body.title).trim(),
        body: String(body.body).trim(),
      },
    });

    return NextResponse.json({ post });
  } catch (e) {
    console.error("Failed to create forum post", e);
    return NextResponse.json({ error: "Failed to create forum post" }, { status: 500 });
  }
}
