import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function POST(req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const inviteId = params.id;
    if (!inviteId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "");
    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const invite = await prisma.journalInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.toUserId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "accept") {
      await prisma.journalInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      });
      await prisma.journalCollaborator.upsert({
        where: { entryId_userId: { entryId: invite.entryId, userId } },
        update: {},
        create: { entryId: invite.entryId, userId },
      });
      await prisma.notification.create({
        data: {
          userId: invite.fromUserId,
          type: "JOURNAL_INVITE_ACCEPTED",
          data: { entryId: invite.entryId, fromUserId: userId },
        },
      });
      return NextResponse.json({ status: "ACCEPTED" });
    }

    await prisma.journalInvite.update({
      where: { id: invite.id },
      data: { status: "DECLINED" },
    });
    return NextResponse.json({ status: "DECLINED" });
  } catch (e) {
    console.error("Failed to update invite", e);
    return NextResponse.json({ error: "Failed to update invite" }, { status: 500 });
  }
}
