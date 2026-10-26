import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { hashPassword } from "../lib/password.js";
import { accountLimiter } from "../lib/rateLimit.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

function endSession(req: any): Promise<void> {
  return new Promise((resolve) => req.session.destroy(() => resolve()));
}

/** POST /user/data-actions — self-service data clearing from Settings. */
router.post("/user/data-actions", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const action = String(req.body?.action ?? "");
    const clearHistory = () =>
      Promise.all([
        prisma.opportunityView.deleteMany({ where: { viewerId: userId } }),
        prisma.forumView.deleteMany({ where: { viewerId: userId } }),
      ]);
    const clearInterests = () => prisma.interest.deleteMany({ where: { userId } });
    const clearSaves = () =>
      Promise.all([
        prisma.opportunityAction.deleteMany({ where: { userId, state: "SAVED" } }),
        prisma.forumSave.deleteMany({ where: { userId } }),
        prisma.savedArticle.deleteMany({ where: { userId } }),
      ]);
    const clearFinancial = () =>
      Promise.all([
        prisma.moneyManagement.deleteMany({ where: { userId } }),
        prisma.portfolioAsset.deleteMany({ where: { userId } }),
      ]);

    switch (action) {
      case "clear_history":
        await clearHistory();
        break;
      case "clear_interests":
        await clearInterests();
        break;
      case "clear_saves":
        await clearSaves();
        break;
      case "clear_financial":
        await clearFinancial();
        break;
      case "clear_data":
        await Promise.all([clearHistory(), clearSaves(), clearInterests()]);
        break;
      default:
        return res.status(400).json({ error: "Unknown action" });
    }
    return res.json({ ok: true, action });
  } catch (e) {
    logger.error({ err: e }, "Data action error");
    return res.status(500).json({ error: "Failed to clear data" });
  }
});

/** POST /user/account { action: "deactivate" } — hide the account and sign out. */
router.post("/user/account", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    if (req.body?.action !== "deactivate") return res.status(400).json({ error: "Unknown action" });
    await prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt: new Date(), sessionEpoch: { increment: 1 } },
    });
    await endSession(req);
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Account deactivate error");
    return res.status(500).json({ error: "Failed to deactivate account" });
  }
});

/** DELETE /user/account — permanently delete the account and its data. */
router.delete("/user/account", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === "ADMIN") {
      return res.status(400).json({ error: "Admin accounts must be removed by another admin" });
    }
    await prisma.user.delete({ where: { id: userId } });
    await endSession(req);
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Account delete error");
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

/** POST /admin/signup-request — public admin application, approved by an existing admin. */
router.post("/admin/signup-request", accountLimiter, async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body ?? {};
    const cleanEmail = String(email ?? "").toLowerCase().trim();
    const cleanUsername = String(username ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return res.status(400).json({ error: "Valid email required" });
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({ error: "Username must be 3-30 letters, numbers, dots or underscores" });
    }
    if (String(password ?? "").length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });

    const existing = await prisma.adminSignupRequest.findUnique({ where: { email: cleanEmail }, select: { status: true } });
    if (existing?.status === "PENDING") return res.json({ ok: true });
    const passwordHash = await hashPassword(String(password));
    await prisma.adminSignupRequest.upsert({
      where: { email: cleanEmail },
      create: { email: cleanEmail, username: cleanUsername, passwordHash },
      update: { username: cleanUsername, passwordHash, status: "PENDING", decidedAt: null, decidedByUserId: null },
    });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Admin signup request error");
    return res.status(500).json({ error: "Failed to submit request" });
  }
});

export default router;
