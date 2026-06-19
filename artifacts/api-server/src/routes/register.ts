import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { hashPassword } from "../lib/password.js";
import { logger } from "../lib/logger.js";

const router = Router();

const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,20}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().regex(USERNAME_REGEX),
  dob: z.string(),
  password: z.string().regex(PASSWORD_REGEX),
  confirmPassword: z.string().min(8),
});

function isAtLeast18(dob: string) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
}

router.post("/register", async (req, res) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    if (parsed.data.password !== parsed.data.confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    if (!isAtLeast18(parsed.data.dob)) {
      return res.status(400).json({ error: "You must be at least 18 years old to register" });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const username = parsed.data.username.trim();
    const usernameLower = username.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const existingUsername = await prisma.profile.findFirst({ where: { usernameLower }, select: { id: true } });
    if (existingUsername) return res.status(409).json({ error: "Username already in use" });

    const passwordHash = await hashPassword(parsed.data.password);
    const age = Math.max(18, new Date().getFullYear() - new Date(parsed.data.dob).getFullYear());

    const user = await prisma.user.create({
      data: {
        role: "USER",
        email,
        passwordHash,
        profile: {
          create: {
            name: `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`,
            username,
            usernameLower,
            age,
          },
        },
      },
      select: { id: true, email: true },
    });

    return res.json({ user, requiresEmailConfirmation: false });
  } catch (e) {
    logger.error({ err: e }, "Register error");
    return res.status(500).json({ error: "Failed to register" });
  }
});

export default router;
