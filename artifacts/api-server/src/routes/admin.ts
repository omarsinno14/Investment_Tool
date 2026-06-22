/**
 * admin.ts — ADMIN-only management endpoints.
 * Users, moderation, analytics, geography, reports, verifications, ads, support.
 */
import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { hashPassword } from "../lib/password.js";
import { requireAdmin } from "../lib/adminGuard.js";
import { writeAuditLog } from "../lib/auditLog.js";
import { notifyUser } from "../lib/notify.js";

const router = Router();

/* ----------------------------- Admin approvals ---------------------------- */

router.get("/admin/approvals", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const requests = await prisma.adminSignupRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, username: true, status: true, createdAt: true, decidedAt: true },
    });
    return res.json({ requests });
  } catch (e) {
    logger.error({ err: e }, "Admin approvals GET error");
    return res.status(500).json({ error: "Failed to load approvals" });
  }
});

router.post("/admin/approvals/:id/decide", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { id } = req.params;
    const { decision } = req.body ?? {};
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return res.status(400).json({ error: "decision must be APPROVE or REJECT" });
    }
    const request = await prisma.adminSignupRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "PENDING") return res.status(409).json({ error: "Already decided" });

    if (decision === "APPROVE") {
      const existing = await prisma.user.findUnique({ where: { email: request.email } });
      if (existing) {
        await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      } else {
        await prisma.user.create({
          data: {
            email: request.email,
            passwordHash: request.passwordHash,
            role: "ADMIN",
            profile: { create: { name: request.username, username: request.username, usernameLower: request.username.toLowerCase() } },
          },
        });
      }
    }

    const updated = await prisma.adminSignupRequest.update({
      where: { id },
      data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", decidedAt: new Date(), decidedByUserId: adminId },
    });
    return res.json({ request: updated });
  } catch (e) {
    logger.error({ err: e }, "Admin approval decide error");
    return res.status(500).json({ error: "Failed to decide" });
  }
});

/* -------------------------------- Users ----------------------------------- */

router.get("/admin/users", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { q, status, role } = req.query as Record<string, string>;
    const where: any = {};
    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { profile: { name: { contains: q, mode: "insensitive" } } },
        { profile: { username: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (role === "ADMIN" || role === "USER") where.role = role;
    if (status === "banned") where.bannedAt = { not: null };
    if (status === "restricted") where.restrictedAt = { not: null };
    if (status === "deactivated") where.deactivatedAt = { not: null };
    if (status === "active") {
      where.bannedAt = null;
      where.deactivatedAt = null;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        deactivatedAt: true,
        bannedAt: true,
        banReason: true,
        restrictedAt: true,
        restrictReason: true,
        profile: {
          select: {
            name: true,
            username: true,
            imageUrl: true,
            country: true,
            city: true,
            dateOfBirth: true,
            age: true,
            phone: true,
            identityVerified: true,
            emailVerified: true,
          },
        },
      },
    });
    return res.json({ users });
  } catch (e) {
    logger.error({ err: e }, "Admin users GET error");
    return res.status(500).json({ error: "Failed to load users" });
  }
});

router.get("/admin/users/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        deactivatedAt: true,
        bannedAt: true,
        banReason: true,
        restrictedAt: true,
        restrictReason: true,
        profile: true,
        _count: {
          select: {
            forumPosts: true,
            hubPosts: true,
            messagesSent: true,
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (e) {
    logger.error({ err: e }, "Admin user GET error");
    return res.status(500).json({ error: "Failed to load user" });
  }
});

router.post("/admin/users", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { email, password, name, username, role } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await hashPassword(String(password));
    const uname = username ? String(username).trim() : normalizedEmail.split("@")[0];
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: role === "ADMIN" ? "ADMIN" : "USER",
        profile: { create: { name: name ?? uname, username: uname, usernameLower: uname.toLowerCase() } },
      },
      select: { id: true, email: true, role: true },
    });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: "user.create",
      targetType: "USER",
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
    });
    return res.json({ user });
  } catch (e) {
    logger.error({ err: e }, "Admin user POST error");
    return res.status(500).json({ error: "Failed to create user" });
  }
});

router.patch("/admin/users/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { id } = req.params;
    const { action, reason, role, email, name, username, password } = req.body ?? {};

    if (id === adminId && (action === "ban" || action === "deactivate" || role === "USER")) {
      return res.status(400).json({ error: "You cannot restrict your own admin account" });
    }

    const data: any = {};
    switch (action) {
      case "ban":
        data.bannedAt = new Date();
        data.banReason = reason ?? null;
        break;
      case "unban":
        data.bannedAt = null;
        data.banReason = null;
        break;
      case "restrict":
        data.restrictedAt = new Date();
        data.restrictReason = reason ?? null;
        break;
      case "unrestrict":
        data.restrictedAt = null;
        data.restrictReason = null;
        break;
      case "deactivate":
        data.deactivatedAt = new Date();
        break;
      case "reactivate":
        data.deactivatedAt = null;
        break;
      case "promote":
        data.role = "ADMIN";
        break;
      case "demote":
        data.role = "USER";
        break;
    }
    if (role === "ADMIN" || role === "USER") data.role = role;
    if (email) data.email = String(email).toLowerCase().trim();
    if (password) data.passwordHash = await hashPassword(String(password));

    const profileData: any = {};
    if (name !== undefined) profileData.name = name;
    if (username !== undefined) {
      profileData.username = username;
      profileData.usernameLower = String(username).toLowerCase();
    }
    if (Object.keys(profileData).length) {
      data.profile = { upsert: { create: profileData, update: profileData } };
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, bannedAt: true, restrictedAt: true, deactivatedAt: true },
    });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: action ? `user.${action}` : "user.update",
      targetType: "USER",
      targetId: user.id,
      metadata: { action: action ?? null, reason: reason ?? null, role: role ?? null },
    });
    return res.json({ user });
  } catch (e) {
    logger.error({ err: e }, "Admin user PATCH error");
    return res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/admin/users/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    if (req.params.id === adminId) return res.status(400).json({ error: "You cannot delete your own account" });
    await prisma.user.delete({ where: { id: req.params.id } });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: "user.delete",
      targetType: "USER",
      targetId: req.params.id,
    });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Admin user DELETE error");
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

/* ------------------------------- Analytics -------------------------------- */

router.get("/admin/analytics", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const since = (days: number) => new Date(now.getTime() - days * dayMs);

    const [
      totalUsers,
      newDay,
      newWeek,
      newMonth,
      newYear,
      activeDay,
      activeWeek,
      totalOpportunities,
      totalForumPosts,
      totalHubPosts,
      totalMessages,
      totalComments,
      totalReactions,
      pendingReports,
      pendingVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since(1) } } }),
      prisma.user.count({ where: { createdAt: { gte: since(7) } } }),
      prisma.user.count({ where: { createdAt: { gte: since(30) } } }),
      prisma.user.count({ where: { createdAt: { gte: since(365) } } }),
      prisma.appSession.findMany({ where: { lastSeenAt: { gte: since(1) } }, select: { userId: true } }),
      prisma.appSession.findMany({ where: { lastSeenAt: { gte: since(7) } }, select: { userId: true } }),
      prisma.opportunity.count(),
      prisma.forumPost.count(),
      prisma.hubPost.count(),
      prisma.message.count(),
      prisma.forumComment.count(),
      prisma.forumReaction.count(),
      prisma.report.count({ where: { resolvedAt: null } }),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    ]);

    // Total hours spent across all sessions
    const sessionAgg = await prisma.appSession.aggregate({ _sum: { durationSeconds: true } });
    const totalHours = Math.round((sessionAgg._sum.durationSeconds ?? 0) / 360) / 10;

    // Hours per period
    const hoursIn = async (days: number) => {
      const agg = await prisma.appSession.aggregate({
        _sum: { durationSeconds: true },
        where: { lastSeenAt: { gte: since(days) } },
      });
      return Math.round((agg._sum.durationSeconds ?? 0) / 360) / 10;
    };
    const [hoursDay, hoursWeek, hoursMonth, hoursYear] = await Promise.all([
      hoursIn(1),
      hoursIn(7),
      hoursIn(30),
      hoursIn(365),
    ]);

    // Daily signup series (last 30 days)
    const signups = await prisma.user.findMany({
      where: { createdAt: { gte: since(30) } },
      select: { createdAt: true },
    });
    const signupSeries: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * dayMs).toISOString().slice(0, 10);
      signupSeries[d] = 0;
    }
    for (const s of signups) {
      const key = s.createdAt.toISOString().slice(0, 10);
      if (key in signupSeries) signupSeries[key]++;
    }

    const interactions = totalForumPosts + totalHubPosts + totalMessages + totalComments + totalReactions;

    return res.json({
      users: { total: totalUsers, newDay, newWeek, newMonth, newYear },
      activeUsers: { day: new Set(activeDay.map((s) => s.userId)).size, week: new Set(activeWeek.map((s) => s.userId)).size },
      hours: { total: totalHours, day: hoursDay, week: hoursWeek, month: hoursMonth, year: hoursYear },
      content: { opportunities: totalOpportunities, forumPosts: totalForumPosts, hubPosts: totalHubPosts, messages: totalMessages, comments: totalComments, reactions: totalReactions },
      interactions,
      pending: { reports: pendingReports, verifications: pendingVerifications },
      signupSeries: Object.entries(signupSeries).map(([date, count]) => ({ date, count })),
    });
  } catch (e) {
    logger.error({ err: e }, "Admin analytics error");
    return res.status(500).json({ error: "Failed to load analytics" });
  }
});

router.get("/admin/geography", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const profiles = await prisma.profile.findMany({ select: { country: true, city: true } });
    const byCountry: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    for (const p of profiles) {
      if (p.country) byCountry[p.country] = (byCountry[p.country] ?? 0) + 1;
      if (p.city) {
        const key = p.country ? `${p.city}, ${p.country}` : p.city;
        byCity[key] = (byCity[key] ?? 0) + 1;
      }
    }
    const countries = Object.entries(byCountry).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const cities = Object.entries(byCity).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 50);
    return res.json({ countries, cities, unknown: profiles.filter((p) => !p.country).length });
  } catch (e) {
    logger.error({ err: e }, "Admin geography error");
    return res.status(500).json({ error: "Failed to load geography" });
  }
});

/* -------------------------------- Reports --------------------------------- */

router.get("/admin/reports", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status === "open") where.resolvedAt = null;
    if (status === "resolved") where.resolvedAt = { not: null };
    if (status === "scam") where.isScam = true;

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        reporter: { select: { id: true, email: true, profile: { select: { name: true, username: true } } } },
      },
    });
    return res.json({ reports });
  } catch (e) {
    logger.error({ err: e }, "Admin reports GET error");
    return res.status(500).json({ error: "Failed to load reports" });
  }
});

router.post("/admin/reports/:id/resolve", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { note, reopen } = req.body ?? {};
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        resolvedAt: reopen ? null : new Date(),
        resolutionNote: note ?? null,
        reviewedByUserId: adminId,
      },
    });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: reopen ? "report.reopen" : "report.resolve",
      targetType: "REPORT",
      targetId: report.id,
      metadata: { note: note ?? null, reopen: !!reopen },
    });
    return res.json({ report });
  } catch (e) {
    logger.error({ err: e }, "Admin report resolve error");
    return res.status(500).json({ error: "Failed to resolve report" });
  }
});

/* ----------------------------- Verifications ------------------------------ */

router.get("/admin/verifications", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") where.status = status;
    const requests = await prisma.verificationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, email: true, profile: { select: { name: true, username: true, imageUrl: true, identityVerified: true } } } },
      },
    });
    return res.json({ requests });
  } catch (e) {
    logger.error({ err: e }, "Admin verifications GET error");
    return res.status(500).json({ error: "Failed to load verifications" });
  }
});

router.post("/admin/verifications/:id/decide", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { decision, note } = req.body ?? {};
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return res.status(400).json({ error: "decision must be APPROVE or REJECT" });
    }
    const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Request not found" });

    const updated = await prisma.verificationRequest.update({
      where: { id: req.params.id },
      data: {
        status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewNote: note ?? null,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
      },
    });

    if (decision === "APPROVE") {
      await prisma.profile.update({ where: { userId: request.userId }, data: { identityVerified: true } });
    }
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: decision === "APPROVE" ? "verification.approve" : "verification.reject",
      targetType: "VERIFICATION_REQUEST",
      targetId: updated.id,
      metadata: { userId: request.userId, note: note ?? null },
    });
    return res.json({ request: updated });
  } catch (e) {
    logger.error({ err: e }, "Admin verification decide error");
    return res.status(500).json({ error: "Failed to decide verification" });
  }
});

/* --------------------------------- Hubs ----------------------------------- */

router.get("/admin/hubs", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const hubs = await prisma.hub.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { memberships: true, posts: true } } },
    });
    return res.json({ hubs });
  } catch (e) {
    logger.error({ err: e }, "Admin hubs GET error");
    return res.status(500).json({ error: "Failed to load hubs" });
  }
});

router.patch("/admin/hubs/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { name, description, isPrivate } = req.body ?? {};
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (isPrivate !== undefined) data.isPrivate = !!isPrivate;
    const hub = await prisma.hub.update({ where: { id: req.params.id }, data });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: "hub.update",
      targetType: "HUB",
      targetId: hub.id,
      metadata: data,
    });
    return res.json({ hub });
  } catch (e) {
    logger.error({ err: e }, "Admin hub PATCH error");
    return res.status(500).json({ error: "Failed to update hub" });
  }
});

router.delete("/admin/hubs/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    await prisma.hub.delete({ where: { id: req.params.id } });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: "hub.delete",
      targetType: "HUB",
      targetId: req.params.id,
    });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Admin hub DELETE error");
    return res.status(500).json({ error: "Failed to delete hub" });
  }
});

/* ---------------------------------- Ads ----------------------------------- */

router.get("/admin/ads", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const ads = await prisma.advertisement.findMany({ orderBy: { createdAt: "desc" } });
    return res.json({ ads });
  } catch (e) {
    logger.error({ err: e }, "Admin ads GET error");
    return res.status(500).json({ error: "Failed to load ads" });
  }
});

router.post("/admin/ads", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { title, body, imageUrl, linkUrl, placement, active, startsAt, endsAt } = req.body ?? {};
    if (!title) return res.status(400).json({ error: "title required" });
    const ad = await prisma.advertisement.create({
      data: {
        title,
        body: body ?? null,
        imageUrl: imageUrl ?? null,
        linkUrl: linkUrl ?? null,
        placement: ["FEED", "OPPORTUNITIES", "HEADLINES", "SIDEBAR"].includes(placement) ? placement : "FEED",
        active: active !== false,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        createdByUserId: adminId,
      },
    });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: "ad.create",
      targetType: "ADVERTISEMENT",
      targetId: ad.id,
      metadata: { title: ad.title, placement: ad.placement },
    });
    return res.json({ ad });
  } catch (e) {
    logger.error({ err: e }, "Admin ad POST error");
    return res.status(500).json({ error: "Failed to create ad" });
  }
});

router.patch("/admin/ads/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { title, body, imageUrl, linkUrl, placement, active, startsAt, endsAt } = req.body ?? {};
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (body !== undefined) data.body = body;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (linkUrl !== undefined) data.linkUrl = linkUrl;
    if (placement !== undefined) data.placement = placement;
    if (active !== undefined) data.active = !!active;
    if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) data.endsAt = endsAt ? new Date(endsAt) : null;
    const ad = await prisma.advertisement.update({ where: { id: req.params.id }, data });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: "ad.update",
      targetType: "ADVERTISEMENT",
      targetId: ad.id,
      metadata: data,
    });
    return res.json({ ad });
  } catch (e) {
    logger.error({ err: e }, "Admin ad PATCH error");
    return res.status(500).json({ error: "Failed to update ad" });
  }
});

router.delete("/admin/ads/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    await prisma.advertisement.delete({ where: { id: req.params.id } });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: "ad.delete",
      targetType: "ADVERTISEMENT",
      targetId: req.params.id,
    });
    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "Admin ad DELETE error");
    return res.status(500).json({ error: "Failed to delete ad" });
  }
});

/* -------------------------------- Support --------------------------------- */

router.get("/admin/support", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status === "open") where.status = { in: ["OPEN", "IN_PROGRESS"] };
    if (status === "closed") where.status = { in: ["RESOLVED", "CLOSED"] };
    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, email: true, profile: { select: { name: true, username: true } } } } },
    });
    return res.json({ tickets });
  } catch (e) {
    logger.error({ err: e }, "Admin support GET error");
    return res.status(500).json({ error: "Failed to load tickets" });
  }
});

router.post("/admin/support/:id/status", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { status } = req.body ?? {};
    if (!["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: { status, resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null },
    });
    return res.json({ ticket });
  } catch (e) {
    logger.error({ err: e }, "Admin support status error");
    return res.status(500).json({ error: "Failed to update ticket" });
  }
});

/* ------------------------------ Audit logs -------------------------------- */

router.get("/admin/audit-logs", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const limitRaw = Number((req.query as Record<string, string>).limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: { select: { id: true, profile: { select: { name: true, username: true } } } },
      },
    });
    const result = logs.map((l) => ({
      id: l.id,
      actor: l.actor
        ? { id: l.actor.id, displayName: l.actor.profile?.name ?? l.actor.profile?.username ?? null }
        : null,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata,
      createdAt: l.createdAt,
    }));
    return res.json({ logs: result });
  } catch (e) {
    logger.error({ err: e }, "Admin audit-logs GET error");
    return res.status(500).json({ error: "Failed to load audit logs" });
  }
});

/* --------------------------- Deal verifications --------------------------- */

router.get("/admin/deal-verifications", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const opportunities = await prisma.opportunity.findMany({
      where: { dealVerification: "PENDING" },
      orderBy: { fetchedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        companyName: true,
        dealType: true,
        minInvestment: true,
        publishedAt: true,
        fetchedAt: true,
        createdByUser: { select: { id: true, profile: { select: { name: true, username: true } } } },
      },
    });
    const result = opportunities.map((o) => ({
      id: o.id,
      title: o.title,
      companyName: o.companyName,
      dealType: o.dealType,
      minInvestment: o.minInvestment,
      publishedAt: o.publishedAt,
      createdAt: o.fetchedAt,
      createdByUser: o.createdByUser
        ? { id: o.createdByUser.id, displayName: o.createdByUser.profile?.name ?? o.createdByUser.profile?.username ?? null }
        : null,
    }));
    return res.json({ opportunities: result });
  } catch (e) {
    logger.error({ err: e }, "Admin deal-verifications GET error");
    return res.status(500).json({ error: "Failed to load deal verifications" });
  }
});

router.post("/admin/opportunities/:id/verify", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const { decision } = req.body ?? {};
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return res.status(400).json({ error: "decision must be APPROVED or REJECTED" });
    }
    const opportunity = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: { dealVerification: decision },
    });
    await writeAuditLog(prisma, {
      actorId: adminId,
      action: decision === "APPROVED" ? "deal.verify.approve" : "deal.verify.reject",
      targetType: "OPPORTUNITY",
      targetId: opportunity.id,
      metadata: { decision },
    });

    if (opportunity.createdByUserId) {
      await notifyUser(prisma, {
        recipientId: opportunity.createdByUserId,
        type: "OPPORTUNITY_MATCH",
        title: decision === "APPROVED" ? "Your deal was approved" : "Your deal was rejected",
        body:
          decision === "APPROVED"
            ? `“${opportunity.title}” has been verified and is now live.`
            : `“${opportunity.title}” was not approved during verification.`,
        link: `/opportunities/${opportunity.id}`,
        targetType: "OPPORTUNITY",
        targetId: opportunity.id,
        data: { opportunityId: opportunity.id, decision },
      });
    }

    return res.json({ opportunity });
  } catch (e) {
    logger.error({ err: e }, "Admin opportunity verify error");
    return res.status(500).json({ error: "Failed to verify opportunity" });
  }
});

export default router;
