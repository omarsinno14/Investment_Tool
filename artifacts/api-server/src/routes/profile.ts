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

    // Username validation
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
    const d: any = {};

    // Basic info
    if (body.name !== undefined) d.name = body.name ?? null;
    if (body.username !== undefined) { d.username = cleanUsername || null; d.usernameLower = usernameLower; }
    if (body.bio !== undefined) d.bio = body.bio ?? null;
    if (body.occupation !== undefined) d.occupation = body.occupation ?? null;
    if (body.websiteUrl !== undefined) d.websiteUrl = body.websiteUrl ?? null;
    if (body.age !== undefined) d.age = body.age ? Number(body.age) : null;
    if (body.dateOfBirth !== undefined) d.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.country !== undefined) d.country = body.country ?? null;
    if (body.city !== undefined) d.city = body.city ?? null;
    if (body.currency !== undefined) d.currency = body.currency ?? null;
    if (body.riskTolerance !== undefined) d.riskTolerance = body.riskTolerance;
    if (body.phone !== undefined) d.phone = body.phone ?? null;
    if (body.familySituation !== undefined) d.familySituation = body.familySituation ?? null;
    if (body.netWorth !== undefined) d.netWorth = body.netWorth ? Number(body.netWorth) : null;
    if (body.investAmount !== undefined) d.investAmount = body.investAmount ? Number(body.investAmount) : null;
    if (body.layoutPreference !== undefined) d.layoutPreference = body.layoutPreference ?? null;
    if (body.imageUrl !== undefined) d.imageUrl = body.imageUrl ?? null;
    if (body.coverPhotoUrl !== undefined) d.coverPhotoUrl = body.coverPhotoUrl ?? null;
    if (body.cvUrl !== undefined) d.cvUrl = body.cvUrl ?? null;

    // Verification flags are server-controlled only (set via the verification
    // workflow and admin review) — never writable through the profile endpoint,
    // otherwise any user could self-grant a verified badge.

    // Arrays
    if (body.expertiseTags !== undefined) d.expertiseTags = Array.isArray(body.expertiseTags) ? body.expertiseTags : [];
    if (body.verifiedExpertiseTags !== undefined) d.verifiedExpertiseTags = Array.isArray(body.verifiedExpertiseTags) ? body.verifiedExpertiseTags : [];

    // Privacy flags
    if (body.hideAgeFromNonFollowers !== undefined) d.hideAgeFromNonFollowers = Boolean(body.hideAgeFromNonFollowers);
    if (body.hideContactFromNonFollowers !== undefined) d.hideContactFromNonFollowers = Boolean(body.hideContactFromNonFollowers);
    if (body.hidePhotoFromNonFollowers !== undefined) d.hidePhotoFromNonFollowers = Boolean(body.hidePhotoFromNonFollowers);
    if (body.hidePostsFromNonFollowers !== undefined) d.hidePostsFromNonFollowers = Boolean(body.hidePostsFromNonFollowers);
    if (body.hideFollowerCount !== undefined) d.hideFollowerCount = Boolean(body.hideFollowerCount);
    if (body.requiresFollowApproval !== undefined) d.requiresFollowApproval = Boolean(body.requiresFollowApproval);

    // Notification prefs
    if (body.notifyMessages !== undefined) d.notifyMessages = Boolean(body.notifyMessages);
    if (body.notifyFollows !== undefined) d.notifyFollows = Boolean(body.notifyFollows);
    if (body.notifyOpportunities !== undefined) d.notifyOpportunities = Boolean(body.notifyOpportunities);
    if (body.notifyForums !== undefined) d.notifyForums = Boolean(body.notifyForums);
    if (body.notifyJournal !== undefined) d.notifyJournal = Boolean(body.notifyJournal);
    if (body.notifyPayments !== undefined) d.notifyPayments = Boolean(body.notifyPayments);
    if (body.notifyDigest !== undefined) d.notifyDigest = Boolean(body.notifyDigest);

    let profile;
    if (existing) {
      profile = await prisma.profile.update({ where: { userId }, data: d });
    } else {
      profile = await prisma.profile.create({ data: { userId, ...d } });
    }
    return res.json({ profile });
  } catch (e) {
    logger.error({ err: e }, "Profile POST error");
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
