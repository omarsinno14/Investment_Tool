import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await context.params;

    const hub = await prisma.hub.findUnique({ where: { slug } });
    if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });

    let canJoin = !hub.isPrivate;
    if (hub.isPrivate) {
      const body = await req.json().catch(() => null);
      canJoin = body?.inviteToken && String(body.inviteToken) === hub.inviteToken;
    }
    if (!canJoin) return NextResponse.json({ error: "Invite required" }, { status: 403 });

    await prisma.hubMembership.upsert({
      where: { hubId_userId: { hubId: hub.id, userId } },
      update: {},
      create: { hubId: hub.id, userId, role: "member" },
    });

    return NextResponse.json({ joined: true });
  } catch (e) {
    console.error("Failed to join hub", e);
    return NextResponse.json({ error: "Failed to join hub" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await context.params;

    const hub = await prisma.hub.findUnique({ where: { slug } });
    if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    if (hub.ownerUserId === userId) return NextResponse.json({ error: "Owner cannot leave. Transfer ownership first." }, { status: 400 });

    await prisma.hubMembership.deleteMany({ where: { hubId: hub.id, userId } });
    return NextResponse.json({ left: true });
  } catch (e) {
    console.error("Failed to leave hub", e);
    return NextResponse.json({ error: "Failed to leave hub" }, { status: 500 });
  }
}
