/**
 * adminGuard.ts — shared auth helpers for route handlers.
 */
import type { Request, Response } from "express";
import { prisma } from "./db.js";

/** Returns the session user id or sends 401 and returns null. */
export function requireAuth(req: Request, res: Response): string | null {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId as string;
}

/**
 * Ensures the session user exists and has the ADMIN role.
 * Sends 401/403 and returns null on failure.
 */
export async function requireAdmin(req: Request, res: Response): Promise<string | null> {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId as string },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return userId as string;
}
