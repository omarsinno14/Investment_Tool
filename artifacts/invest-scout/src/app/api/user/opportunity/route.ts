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
    const opportunityId = body?.opportunityId;
    const state = body?.state;
    const investedAmt = body?.investedAmt;

    if (!opportunityId || !state) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Normalize INVESTED amount
    const amt =
      state === "INVESTED"
        ? Number.isFinite(Number(investedAmt)) && Number(investedAmt) >= 0
          ? Number(investedAmt)
          : 0
        : null;

    const action = await prisma.opportunityAction.upsert({
      where: { userId_opportunityId: { userId, opportunityId } },
      create: { userId, opportunityId, state, investedAmt: amt ?? undefined },
      update: { state, investedAmt: amt ?? undefined },
    });

    return NextResponse.json({ action });
  } catch (e) {
    console.error("Failed to record action", e);
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}
