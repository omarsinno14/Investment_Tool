import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const profile = await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      name: body.name ?? null,
      age: typeof body.age === "number" ? body.age : null,
      familySituation: body.familySituation ?? null,
      netWorth: typeof body.netWorth === "number" ? body.netWorth : null,
      riskTolerance: body.riskTolerance ?? "MEDIUM",
      investAmount: typeof body.investAmount === "number" ? body.investAmount : null,
    },
    update: {
      name: body.name ?? null,
      age: typeof body.age === "number" ? body.age : null,
      familySituation: body.familySituation ?? null,
      netWorth: typeof body.netWorth === "number" ? body.netWorth : null,
      riskTolerance: body.riskTolerance ?? "MEDIUM",
      investAmount: typeof body.investAmount === "number" ? body.investAmount : null,
    },
  });

  return NextResponse.json({ profile });
}
