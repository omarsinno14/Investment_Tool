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
    if (!body?.targetType || !body?.targetId || !body?.reason) {
      return NextResponse.json({ error: "Missing report data" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        targetType: body.targetType,
        targetId: String(body.targetId),
        reason: String(body.reason).trim(),
      },
    });

    return NextResponse.json({ report });
  } catch (e) {
    console.error("Failed to submit report", e);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
