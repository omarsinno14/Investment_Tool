import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function POST(req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const type = body?.type;
    if (!type) return NextResponse.json({ error: "Missing reaction type" }, { status: 400 });
    const allowed = ["LIKE", "INSIGHTFUL", "CURIOUS"];
    if (!allowed.includes(type)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const existing = await prisma.forumReaction.findUnique({
      where: { postId_userId_type: { postId: id, userId, type } },
    });

    if (existing) {
      await prisma.forumReaction.delete({
        where: { postId_userId_type: { postId: id, userId, type } },
      });
      return NextResponse.json({ reacted: false });
    }

    await prisma.forumReaction.create({
      data: {
        postId: id,
        userId,
        type,
      },
    });
    return NextResponse.json({ reacted: true });
  } catch (e) {
    console.error("Failed to update forum reaction", e);
    return NextResponse.json({ error: "Failed to update forum reaction" }, { status: 500 });
  }
}
