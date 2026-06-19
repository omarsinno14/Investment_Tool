import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";

export async function POST(req: Request, context: { params: Promise<{ slug: string; postId: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { slug, postId } = await context.params;
  const hub = await prisma.hub.findUnique({ where: { slug }, include: { memberships: { where: { userId } } } });
  if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  if (hub.memberships.length === 0) return NextResponse.json({ error: "Join hub to comment" }, { status: 403 });

  const post = await prisma.hubPost.findFirst({ where: { id: postId, hubId: hub.id, deletedAt: null } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const content = String(body?.body ?? "").trim();
  if (!content) return NextResponse.json({ error: "Comment is required" }, { status: 400 });

  const comment = await prisma.hubComment.create({
    data: { hubId: hub.id, postId: post.id, userId, body: content },
    include: {
      user: { select: { id: true, email: true, profile: { select: { username: true, name: true, imageUrl: true } } } },
    },
  });

  return NextResponse.json({ comment });
}
