import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";

const ALLOWED = ["LIKE"];

export async function POST(req: Request, context: { params: Promise<{ slug: string; postId: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const { slug, postId } = await context.params;
  const hub = await prisma.hub.findUnique({ where: { slug }, include: { memberships: { where: { userId } } } });
  if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  if (hub.memberships.length === 0) return NextResponse.json({ error: "Join hub to react" }, { status: 403 });

  const post = await prisma.hubPost.findFirst({ where: { id: postId, hubId: hub.id, deletedAt: null } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const payload = await req.json().catch(() => null);
  const type = String(payload?.type ?? "LIKE").toUpperCase();
  if (!ALLOWED.includes(type)) return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });

  const existing = await prisma.hubReaction.findUnique({ where: { postId_userId_type: { postId: post.id, userId, type } } });
  if (existing) {
    await prisma.hubReaction.delete({ where: { postId_userId_type: { postId: post.id, userId, type } } });
    return NextResponse.json({ reacted: false });
  }

  await prisma.hubReaction.create({ data: { hubId: hub.id, postId: post.id, userId, type } });
  return NextResponse.json({ reacted: true });
}
