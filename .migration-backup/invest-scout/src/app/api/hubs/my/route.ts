import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const memberships = await prisma.hubMembership.findMany({
      where: { userId },
      include: {
        hub: {
          include: { _count: { select: { memberships: true, posts: true } } },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return NextResponse.json({ hubs: memberships.map((m) => ({ ...m.hub, role: m.role })) });
  } catch (e) {
    console.error("Failed to load my hubs", e);
    return NextResponse.json({ error: "Failed to load my hubs" }, { status: 500 });
  }
}
