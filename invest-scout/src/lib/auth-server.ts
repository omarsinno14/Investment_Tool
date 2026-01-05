import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth"; // <-- make sure this path matches your authOptions file

export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);

  // NextAuth usually guarantees email, not id
  const email = session?.user?.email;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}
