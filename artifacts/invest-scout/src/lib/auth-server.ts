// src/lib/auth-server.ts
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;

  const prisma = getPrismaClient();
  if (!prisma) return null;

  return prisma.user.findUnique({
    where: { email },
    include: { profile: { select: { username: true } } },
  });
}

export async function requireUserId(): Promise<string | null> {
  const user = await requireSessionUser();
  return user?.id ?? null;
}
