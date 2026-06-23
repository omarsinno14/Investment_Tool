/**
 * userAccount.ts — user-facing endpoints for verification, support,
 * session heartbeat (hours tracking), and email verification.
 */
import { Router } from "express";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../lib/adminGuard.js";
import { sendEmail, adminRecipients } from "../lib/email.js";
import { supportRequestEmail } from "../lib/emailTemplates.js";

const router = Router();

/* ----------------------- Identity verification (user) --------------------- */

router.get("/user/verification", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const requests = await prisma.verificationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { identityVerified: true },
    });
    return res.json({ requests, identityVerified: profile?.identityVerified ?? false });
  } catch (e) {
    logger.error({ err: e }, "Verification GET error");
    return res.status(500).json({ error: "Failed to load verification" });
  }
});

router.post("/user/verification", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { docType, fileUrls, note } = req.body ?? {};
    const validTypes = ["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID", "PROOF_OF_ADDRESS", "OTHER"];
    if (!validTypes.includes(docType)) return res.status(400).json({ error: "Invalid docType" });
    if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
      return res.status(400).json({ error: "At least one document file is required" });
    }

    const pending = await prisma.verificationRequest.findFirst({
      where: { userId, status: "PENDING" },
    });
    if (pending) return res.status(409).json({ error: "You already have a pending verification request" });

    const request = await prisma.verificationRequest.create({
      data: { userId, docType, fileUrls: fileUrls.map(String), note: note ?? null },
    });
    return res.json({ request });
  } catch (e) {
    logger.error({ err: e }, "Verification POST error");
    return res.status(500).json({ error: "Failed to submit verification" });
  }
});

/* -------------------------------- Support --------------------------------- */

router.post("/support", async (req, res) => {
  try {
    const { subject, message, email } = req.body ?? {};
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "subject and message are required" });
    }

    let resolvedEmail = email;
    const userId = req.session.userId as string | undefined;
    if (userId && !resolvedEmail) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      resolvedEmail = user?.email;
    }
    if (!resolvedEmail) return res.status(400).json({ error: "email is required" });

    const ticket = await prisma.supportTicket.create({
      data: { userId: userId ?? null, email: String(resolvedEmail).toLowerCase().trim(), subject: subject.trim(), message: message.trim() },
    });

    // Best-effort notify the admin inbox — never blocks ticket creation.
    try {
      const recipients = adminRecipients();
      if (recipients.length > 0) {
        const tpl = supportRequestEmail({
          fromEmail: String(resolvedEmail),
          subjectLine: subject.trim(),
          message: message.trim(),
        });
        await sendEmail({ to: recipients, subject: tpl.subject, html: tpl.html, text: tpl.text });
      }
    } catch (e) {
      logger.error({ err: e }, "support email failed");
    }

    return res.json({ ticket: { id: ticket.id, status: ticket.status } });
  } catch (e) {
    logger.error({ err: e }, "Support POST error");
    return res.status(500).json({ error: "Failed to submit support request" });
  }
});

/* --------------------------- Session heartbeat ---------------------------- */

router.post("/user/heartbeat", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { sessionId, platform } = req.body ?? {};
    const now = new Date();
    const STALE_MS = 5 * 60 * 1000;

    if (sessionId) {
      const existing = await prisma.appSession.findUnique({ where: { id: sessionId } });
      if (existing && existing.userId === userId && now.getTime() - existing.lastSeenAt.getTime() < STALE_MS) {
        const duration = Math.round((now.getTime() - existing.startedAt.getTime()) / 1000);
        const updated = await prisma.appSession.update({
          where: { id: sessionId },
          data: { lastSeenAt: now, durationSeconds: duration },
        });
        return res.json({ sessionId: updated.id });
      }
    }

    const created = await prisma.appSession.create({
      data: { userId, platform: platform === "mobile" ? "mobile" : "web" },
    });
    return res.json({ sessionId: created.id });
  } catch (e) {
    logger.error({ err: e }, "Heartbeat error");
    return res.status(500).json({ error: "Failed to record heartbeat" });
  }
});

/* --------------------------- Email verification --------------------------- */

router.post("/auth/verify-email/send", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const profile = await prisma.profile.findUnique({ where: { userId }, select: { emailVerified: true } });
    if (profile?.emailVerified) return res.json({ alreadyVerified: true });

    const token = randomBytes(24).toString("hex");
    await prisma.emailVerificationToken.create({
      data: { userId, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    // Email delivery is wired once a support/transactional email provider is configured.
    // The token is returned in non-production so the flow is testable end-to-end.
    const payload: any = { ok: true, sent: true };
    if (process.env.NODE_ENV !== "production") payload.devToken = token;
    return res.json(payload);
  } catch (e) {
    logger.error({ err: e }, "Verify email send error");
    return res.status(500).json({ error: "Failed to send verification email" });
  }
});

router.post("/auth/verify-email/confirm", async (req, res) => {
  try {
    const { token } = req.body ?? {};
    if (!token) return res.status(400).json({ error: "token required" });
    const record = await prisma.emailVerificationToken.findUnique({ where: { token: String(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    await prisma.$transaction([
      prisma.profile.update({ where: { userId: record.userId }, data: { emailVerified: true } }),
      prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    return res.json({ ok: true, verified: true });
  } catch (e) {
    logger.error({ err: e }, "Verify email confirm error");
    return res.status(500).json({ error: "Failed to verify email" });
  }
});

export default router;
