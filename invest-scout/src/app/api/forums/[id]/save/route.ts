import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function POST(_req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const existing = await prisma.forumSave.findUnique({
      where: { postId_userId: { postId: id, userId } },
    });

    if (existing) {
      await prisma.forumSave.delete({
        where: { postId_userId: { postId: id, userId } },
      });
      return NextResponse.json({ saved: false });
    }

    await prisma.forumSave.create({
      data: { postId: id, userId },
    });

    return NextResponse.json({ saved: true });
  } catch (e) {
    console.error("Failed to update forum save", e);
    return NextResponse.json({ error: "Failed to update forum save" }, { status: 500 });
  }
}
