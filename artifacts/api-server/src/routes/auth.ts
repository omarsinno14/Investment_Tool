import { Router } from "express";
import { prisma } from "../lib/db.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, requestedRole } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: { select: { username: true, name: true, imageUrl: true } } },
    });

    if (!user || user.deactivatedAt) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const ok = await verifyPassword(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (requestedRole === "ADMIN" && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.profile?.username ?? null,
        name: user.profile?.name ?? null,
        imageUrl: user.profile?.imageUrl ?? null,
      },
    });
  } catch (e) {
    logger.error({ err: e }, "Login error");
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/session", async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: { profile: { select: { username: true, name: true, imageUrl: true } } },
    });
    if (!user || user.deactivatedAt) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.profile?.username ?? null,
        name: user.profile?.name ?? null,
        imageUrl: user.profile?.imageUrl ?? null,
      },
    });
  } catch (e) {
    logger.error({ err: e }, "Session check error");
    return res.status(500).json({ error: "Session check failed" });
  }
});

export default router;
