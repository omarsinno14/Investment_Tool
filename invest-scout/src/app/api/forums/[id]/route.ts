import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

function toString(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function GET(_req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const post = await prisma.forumPost.findUnique({
      where: { id },
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
    if (!post || (post.archivedAt && post.userId !== userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ post, viewerId: userId });
  } catch (e) {
    console.error("Failed to load forum post", e);
    return NextResponse.json({ error: "Failed to load forum post" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const title = body.title !== undefined ? toString(body.title) : undefined;
    const description = body.body !== undefined ? toString(body.body) : undefined;
    if (title !== undefined && !title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (description !== undefined && !description) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    const tags =
      body.tags !== undefined
        ? Array.isArray(body.tags)
          ? body.tags.map((t: string) => String(t).trim()).filter(Boolean)
          : toString(body.tags)
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
        : undefined;

    const archived = typeof body.archived === "boolean" ? body.archived : undefined;

    const updated = await prisma.forumPost.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { body: description } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: toString(body.imageUrl) || null } : {}),
        ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
      },
    });

    return NextResponse.json({ post: updated });
  } catch (e) {
    console.error("Failed to update forum post", e);
    return NextResponse.json({ error: "Failed to update forum post" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.forumPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete forum post", e);
    return NextResponse.json({ error: "Failed to delete forum post" }, { status: 500 });
  }
}
