import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrismaClient } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().regex(PASSWORD_REGEX),
  confirmPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const username = parsed.data.username.trim();

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.adminSignupRequest.upsert({
    where: { email },
    create: { email, username, passwordHash, status: "PENDING" },
    update: { username, passwordHash, status: "PENDING", decidedAt: null, decidedByUserId: null },
  });

  console.log(`ADMIN SIGNUP REQUEST RECEIVED: ${email}`);
  return NextResponse.json({ ok: true });
}
