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
    const action = String(body?.action ?? "");

    if (action === "clear_interests") {
      await prisma.interest.deleteMany({ where: { userId } });
      return NextResponse.json({ ok: true });
    }
    if (action === "clear_saves") {
      await prisma.forumSave.deleteMany({ where: { userId } });
      await prisma.opportunityAction.deleteMany({ where: { userId, state: "SAVED" } });
      return NextResponse.json({ ok: true });
    }
    if (action === "clear_history") {
      await prisma.forumReaction.deleteMany({ where: { userId } });
      await prisma.forumComment.deleteMany({ where: { userId } });
      await prisma.forumRepost.deleteMany({ where: { userId } });
      await prisma.opportunityAction.deleteMany({ where: { userId } });
      return NextResponse.json({ ok: true });
    }
    if (action === "clear_financial") {
      await prisma.moneySnapshot.deleteMany({
        where: { moneyManagement: { userId } },
      });
      await prisma.moneyManagement.deleteMany({ where: { userId } });
      return NextResponse.json({ ok: true });
    }
    if (action === "clear_data") {
      await prisma.journalEntry.deleteMany({ where: { ownerId: userId } });
      await prisma.tagFollow.deleteMany({ where: { userId } });
      await prisma.report.deleteMany({ where: { reporterId: userId } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("Failed to clear data", e);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
