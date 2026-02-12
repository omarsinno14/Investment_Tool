// src/lib/auth-server.ts
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/db";
import { authOptions } from "@/lib/auth";

/**
 * Clears common NextAuth cookies to recover from stale/invalid encrypted session tokens
 * (typical cause of JWT_SESSION_ERROR: "decryption operation failed").
 */
function clearNextAuthCookies() {
  const c = cookies();

  // Names vary depending on https / host / NextAuth version
  const names = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
  ];

  for (const name of names) {
    try {
      c.set(name, "", { path: "/", maxAge: 0 });
    } catch {
      // ignore - cookies() can throw in some edge scenarios
    }
  }
}

/**
 * Safe session getter:
 * - If cookie decrypt fails, we treat as logged out and clear cookies.
 */
async function getSessionSafe() {
  try {
    return await getServerSession(authOptions);
  } catch (err) {
    console.warn(
      "[auth] getServerSession failed (likely stale/invalid cookie). Clearing cookies and treating as logged out.",
      err
    );
    clearNextAuthCookies();
    return null;
  }
}

export async function requireSessionUser() {
  const session = await getSessionSafe();

  const email = session?.user?.email;
  if (!email) return null;

  const prisma = getPrismaClient();
  if (!prisma) return null;

  try {
    return await prisma.user.findUnique({
      where: { email },
      include: { profile: { select: { username: true } } },
    });
  } catch (err) {
    console.error("[auth] Prisma user lookup failed:", err);
    return null;
  }
}

export async function requireUserId(): Promise<string | null> {
  const user = await requireSessionUser();
  return user?.id ?? null;
}
