import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-server";
import { isSuperAdmin } from "@/lib/rbac";

export async function GET() {
  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" || !isSuperAdmin(user.profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requests = await prisma.adminSignupRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" || !isSuperAdmin(user.profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const requestId = String(body?.requestId ?? "").trim();
  const action = String(body?.action ?? "").trim().toUpperCase();
  if (!requestId || !["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const request = await prisma.adminSignupRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (action === "REJECT") {
    await prisma.adminSignupRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", decidedAt: new Date(), decidedByUserId: user.id },
    });
    return NextResponse.json({ ok: true });
  }

  const usernameLower = request.username.toLowerCase();
  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: request.email } });
    if (!existing) {
      await tx.user.create({
        data: {
          email: request.email,
          passwordHash: request.passwordHash,
          role: "ADMIN",
          profile: {
            create: {
              username: request.username,
              usernameLower,
              name: request.username,
            },
          },
        },
      });
    }

    await tx.adminSignupRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", decidedAt: new Date(), decidedByUserId: user.id },
    });
  });

  return NextResponse.json({ ok: true });
}
