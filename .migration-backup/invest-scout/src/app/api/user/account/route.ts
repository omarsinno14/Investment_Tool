import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (body?.action !== "deactivate") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to deactivate account", e);
    return NextResponse.json({ error: "Failed to deactivate account" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete account", e);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
