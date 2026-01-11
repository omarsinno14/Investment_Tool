import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function DELETE(_req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (message.fromUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.message.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete message", e);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
