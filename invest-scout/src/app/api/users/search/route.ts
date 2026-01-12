import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const viewerId = await requireUserId();
    if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("q") ?? "").trim();
    if (!raw) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: raw, mode: "insensitive" } },
          { profile: { username: { contains: raw, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        email: true,
        profile: { select: { name: true, username: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    return NextResponse.json({ users });
  } catch (e) {
    console.error("Failed to search users", e);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
