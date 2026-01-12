import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (e) {
    console.error("Failed to load notifications", e);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.notificationId) {
      return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({ where: { id: String(body.notificationId) } });
    if (!notification || notification.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ status: "read" });
  } catch (e) {
    console.error("Failed to update notification", e);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
