import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await context.params;

    const hub = await prisma.hub.findUnique({
      where: { slug },
      include: {
        memberships: { include: { user: { select: { id: true, profile: { select: { username: true, imageUrl: true } } } } } },
        _count: { select: { memberships: true, posts: true } },
      },
    });

    if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    const membership = hub.memberships.find((m) => m.userId === userId);
    if (hub.isPrivate && !membership) {
      return NextResponse.json({ error: "Private hub" }, { status: 403 });
    }

    return NextResponse.json({ hub, viewerRole: membership?.role ?? null, isMember: Boolean(membership) });
  } catch (e) {
    console.error("Failed to load hub", e);
    return NextResponse.json({ error: "Failed to load hub" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Only admins can manage forums" }, { status: 403 });
    const { slug } = await context.params;
    const hub = await prisma.hub.findUnique({ where: { slug } });
    if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    if (hub.ownerUserId !== userId) return NextResponse.json({ error: "Only owner can manage hub" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const updated = await prisma.hub.update({
      where: { id: hub.id },
      data: {
        name: body?.name ? String(body.name).trim() : undefined,
        description: body?.description !== undefined ? String(body.description).trim() : undefined,
        isPrivate: body?.isPrivate !== undefined ? Boolean(body.isPrivate) : undefined,
        imageUrl: body?.imageUrl !== undefined ? String(body.imageUrl).trim() || null : undefined,
        coverImageUrl: body?.coverImageUrl !== undefined ? String(body.coverImageUrl).trim() || null : undefined,
      },
    });
    return NextResponse.json({ hub: updated });
  } catch (e) {
    console.error("Failed to update hub", e);
    return NextResponse.json({ error: "Failed to update hub" }, { status: 500 });
  }
}
