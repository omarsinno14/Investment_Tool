import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const existing = await prisma.forumRepost.findUnique({
      where: { postId_userId: { postId: id, userId } },
    });

    if (existing) {
      await prisma.forumRepost.delete({
        where: { postId_userId: { postId: id, userId } },
      });
      return NextResponse.json({ reposted: false });
    }

    await prisma.forumRepost.create({
      data: { postId: id, userId },
    });

    return NextResponse.json({ reposted: true });
  } catch (e) {
    console.error("Failed to update forum repost", e);
    return NextResponse.json({ error: "Failed to update forum repost" }, { status: 500 });
  }
}
