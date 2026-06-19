import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const router = Router();

function requireAuth(req: any, res: any) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

router.get("/user/profile", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, profile: true },
    });
    return res.json({ profile: user?.profile ?? null, email: user?.email ?? null, role: user?.role ?? "USER" });
  } catch (e) {
    logger.error({ err: e }, "Profile GET error");
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

router.post("/user/profile", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: "Invalid payload" });

    const cleanUsername = typeof body.username === "string" ? body.username.trim() : null;
    const usernameRegex = /^[a-zA-Z0-9._]{3,20}$/;
    if (cleanUsername && !usernameRegex.test(cleanUsername)) {
      return res.status(400).json({ error: "Username must be 3-20 characters with letters, numbers, underscores, or dots." });
    }

    const usernameLower = cleanUsername ? cleanUsername.toLowerCase() : null;
    if (usernameLower) {
      const existing = await prisma.profile.findFirst({
        where: { usernameLower, userId: { not: userId } },
        select: { id: true },
      });
      if (existing) return res.status(409).json({ error: "Username is already taken." });
    }

    const existing = await prisma.profile.findUnique({ where: { userId } });
    const profileData: any = {};
    if (body.name !== undefined) profileData.name = body.name ?? null;
    if (body.username !== undefined) {
      profileData.username = cleanUsername || null;
      profileData.usernameLower = usernameLower;
    }
    if (body.bio !== undefined) profileData.bio = body.bio ?? null;
    if (body.occupation !== undefined) profileData.occupation = body.occupation ?? null;
    if (body.websiteUrl !== undefined) profileData.websiteUrl = body.websiteUrl ?? null;
    if (body.age !== undefined) profileData.age = body.age ? Number(body.age) : null;
    if (body.currency !== undefined) profileData.currency = body.currency ?? null;
    if (body.riskTolerance !== undefined) profileData.riskTolerance = body.riskTolerance;

    let profile;
    if (existing) {
      profile = await prisma.profile.update({ where: { userId }, data: profileData });
    } else {
      profile = await prisma.profile.create({ data: { userId, ...profileData } });
    }
    return res.json({ profile });
  } catch (e) {
    logger.error({ err: e }, "Profile POST error");
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
