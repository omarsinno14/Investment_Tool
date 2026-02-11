import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";

async function ensureAccess(slug: string, userId: string) {
  const prisma = getPrismaClient();
  if (!prisma) return { error: NextResponse.json({ error: "Database unavailable" }, { status: 500 }) };
  const hub = await prisma.hub.findUnique({ where: { slug }, include: { memberships: { where: { userId } } } });
  if (!hub) return { error: NextResponse.json({ error: "Hub not found" }, { status: 404 }) };
  const membership = hub.memberships[0] ?? null;
  if (hub.isPrivate && !membership) return { error: NextResponse.json({ error: "Invite required" }, { status: 403 }) };
  return { prisma, hub, membership };
}

export async function GET(_: Request, context: { params: Promise<{ slug: string; postId: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, postId } = await context.params;
  const access = await ensureAccess(slug, userId);
  if ("error" in access) return access.error;

  const post = await access.prisma.hubPost.findFirst({
    where: { id: postId, hubId: access.hub.id, deletedAt: null },
    include: {
      author: { select: { id: true, email: true, profile: { select: { username: true, imageUrl: true, name: true } } } },
      opportunity: { select: { id: true, title: true, summary: true, source: true } },
      reactions: { select: { userId: true, type: true } },
      comments: {
        include: {
          user: { select: { id: true, email: true, profile: { select: { username: true, name: true, imageUrl: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  return NextResponse.json({ post, viewerId: userId, viewerRole: access.membership?.role ?? null });
}
