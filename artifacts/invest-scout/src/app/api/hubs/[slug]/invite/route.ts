import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";

export async function POST(_: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { slug } = await context.params;

    const hub = await prisma.hub.findUnique({ where: { slug } });
    if (!hub) return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    if (hub.ownerUserId !== userId) return NextResponse.json({ error: "Only owner can rotate invite" }, { status: 403 });

    const updated = await prisma.hub.update({
      where: { id: hub.id },
      data: { inviteToken: randomBytes(12).toString("hex") },
      select: { slug: true, inviteToken: true },
    });

    return NextResponse.json({ inviteUrl: `/hubs/${updated.slug}?invite=${updated.inviteToken}` });
  } catch (e) {
    console.error("Failed to rotate invite", e);
    return NextResponse.json({ error: "Failed to rotate invite" }, { status: 500 });
  }
}
