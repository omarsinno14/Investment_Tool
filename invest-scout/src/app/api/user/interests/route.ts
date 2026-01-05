import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const interests = await prisma.interest.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { type: true, value: true, parent: true },
  });

  return NextResponse.json({ interests });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const interests = Array.isArray(body?.interests) ? body.interests : null;
  if (!interests) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  // Replace the list in one transaction (simple + reliable)
  await prisma.$transaction([
    prisma.interest.deleteMany({ where: { userId } }),
    prisma.interest.createMany({
      data: interests.map((i: any) => ({
        userId,
        type: i.type,
        value: String(i.value ?? "").trim(),
        parent: i.parent ? String(i.parent) : null,
      })).filter((x: any) => x.value.length > 0),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
