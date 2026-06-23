/**
 * passwordReset.ts — forgot / reset password flow (Phase 11/15).
 *
 * Tokens are random 32-byte values; only their SHA-256 hash is stored. The
 * forgot endpoint never reveals whether an email exists (no user enumeration).
 */
import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { hashPassword } from "../lib/password.js";
import { logger } from "../lib/logger.js";
import { sendEmail } from "../lib/email.js";
import { passwordResetEmail } from "../lib/emailTemplates.js";
import { accountLimiter } from "../lib/rateLimit.js";

const router = Router();

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

router.post("/auth/forgot-password", accountLimiter, async (req, res) => {
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  // Always respond the same way to avoid leaking which emails exist.
  const generic = { ok: true };
  if (!email) return res.json(generic);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, deactivatedAt: true, bannedAt: true },
    });
    if (user && !user.deactivatedAt && !user.bannedAt) {
      const raw = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });
      const tpl = passwordResetEmail(raw);
      await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    }
  } catch (e) {
    logger.error({ err: e }, "forgot-password error");
  }
  return res.json(generic);
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().regex(PASSWORD_REGEX),
});

router.post("/auth/reset-password", accountLimiter, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid token and strong password are required" });
  }
  try {
    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true } } },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: "This reset link is invalid or has expired" });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          // Invalidate other sessions on next session check.
          sessionEpoch: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Burn any other outstanding tokens for this user.
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "reset-password error");
    return res.status(500).json({ error: "Could not reset password" });
  }
});

export default router;
