import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET(_req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const comments = await prisma.forumComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { email: true, profile: { select: { name: true, username: true } } } },
      },
    });

    return NextResponse.json({ comments });
  } catch (e) {
    console.error("Failed to load forum comments", e);
    return NextResponse.json({ error: "Failed to load forum comments" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body?.body) return NextResponse.json({ error: "Comment is required" }, { status: 400 });

    const comment = await prisma.forumComment.create({
      data: {
        postId: id,
        userId,
        body: String(body.body).trim(),
      },
    });

    return NextResponse.json({ comment });
  } catch (e) {
    console.error("Failed to create forum comment", e);
    return NextResponse.json({ error: "Failed to create forum comment" }, { status: 500 });
  }
}
