import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";
import { resolveMentionedUsers } from "@/lib/mentions";

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await context.params;
    const tab = new URL(req.url).searchParams.get("tab") || "all";

    const hub = await prisma.hub.findUnique({ where: { slug }, include: { memberships: { where: { userId } } } });
    if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    if (hub.isPrivate && hub.memberships.length === 0) return NextResponse.json({ error: "Invite required" }, { status: 403 });

    const typeFilter = tab === "opportunities" ? "OPPORTUNITY_IMPORT" : tab === "news" ? "NEWS_IMPORT" : undefined;
    const posts = await prisma.hubPost.findMany({
      where: { hubId: hub.id, deletedAt: null, ...(typeFilter ? { type: typeFilter as any } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, email: true, profile: { select: { username: true, imageUrl: true, name: true } } } },
        opportunity: { select: { id: true, title: true, summary: true, source: true } },
      },
      take: 80,
    });

    return NextResponse.json({ posts });
  } catch (e) {
    console.error("Failed to load hub posts", e);
    return NextResponse.json({ error: "Failed to load hub posts" }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await context.params;

    const hub = await prisma.hub.findUnique({ where: { slug }, include: { memberships: { where: { userId } } } });
    if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    if (hub.memberships.length === 0) return NextResponse.json({ error: "Join hub to post" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    const content = String(body?.body ?? "").trim();
    const type = String(body?.type ?? "DISCUSSION").toUpperCase();
    if (!title || !content) return NextResponse.json({ error: "Title and body are required" }, { status: 400 });

    const created = await prisma.hubPost.create({
      data: {
        hubId: hub.id,
        authorUserId: userId,
        title,
        body: content,
        type: type as any,
        opportunityId: body?.opportunityId || null,
        newsHeadline: body?.newsHeadline || null,
        newsUrl: body?.newsUrl || null,
        newsSource: body?.newsSource || null,
      },
    });

    const mentions = await resolveMentionedUsers(prisma, `${title} ${content}`);
    if (mentions.length) {
      await prisma.contentMention.createMany({
        data: mentions.map((mentionedUserId) => ({ hubPostId: created.id, mentionedUserId })),
        skipDuplicates: true,
      });
      await prisma.notification.createMany({
        data: mentions.filter((id) => id !== userId).map((id) => ({
          userId: id,
          type: "HUB_MENTION",
          data: { fromUserId: userId, hubPostId: created.id, hubSlug: hub.slug, title: created.title },
        })),
      });
    }

    return NextResponse.json({ post: created });
  } catch (e) {
    console.error("Failed to create hub post", e);
    return NextResponse.json({ error: "Failed to create hub post" }, { status: 500 });
  }
}
