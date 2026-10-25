import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { notifyUser } from "../lib/notify.js";
import { findActiveUser } from "../lib/chat.js";

const router = Router();

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

const memberSelect = { id: true, profile: { select: { name: true, username: true, imageUrl: true } } } as const;

/** GET /user/journal?q=&date=YYYY-MM-DD — entries you own or collaborate on. */
router.get("/user/journal", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q, date } = req.query as Record<string, string>;
    const and: any[] = [{ OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] }];
    if (q?.trim()) {
      and.push({
        OR: [
          { title: { contains: q.trim(), mode: "insensitive" } },
          // Never search inside password-protected bodies.
          { AND: [{ passwordHash: null }, { body: { contains: q.trim(), mode: "insensitive" } }] },
        ],
      });
    }
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      and.push({ entryDate: { gte: start, lt: end } });
    }
    const entries = await prisma.journalEntry.findMany({
      where: { AND: and },
      orderBy: { entryDate: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        entryDate: true,
        ownerId: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { collaborators: true } },
      },
    });
    return res.json({
      entries: entries.map(({ passwordHash, ownerId, _count, ...e }) => ({
        ...e,
        isOwner: ownerId === userId,
        isLocked: !!passwordHash,
        collaboratorCount: _count.collaborators,
      })),
    });
  } catch (e) {
    logger.error({ err: e }, "Journal GET error");
    return res.status(500).json({ error: "Failed to load journal" });
  }
});

router.post("/user/journal", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { title, body, entryDate, imageUrls, chartData, password } = req.body ?? {};
    const cleanBody = String(body ?? "").trim();
    if (!cleanBody) return res.status(400).json({ error: "Entry body is required" });
    const date = entryDate ? new Date(entryDate) : new Date();
    if (Number.isNaN(date.getTime())) return res.status(400).json({ error: "Invalid entry date" });

    const entry = await prisma.journalEntry.create({
      data: {
        ownerId: userId,
        title: title ? String(title).slice(0, 200) : null,
        body: cleanBody.slice(0, 20000),
        entryDate: date,
        imageUrls: Array.isArray(imageUrls) ? imageUrls.map(String).filter(Boolean).slice(0, 10) : [],
        chartData: chartData ?? undefined,
        passwordHash: password ? await hashPassword(String(password)) : null,
      },
      select: { id: true },
    });
    return res.json({ entry });
  } catch (e) {
    logger.error({ err: e }, "Journal POST error");
    return res.status(500).json({ error: "Failed to create entry" });
  }
});

router.get("/user/journal/invites", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const invites = await prisma.journalInvite.findMany({
      where: { toUserId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { fromUser: { select: memberSelect }, entry: { select: { id: true, title: true } } },
    });
    return res.json({ invites });
  } catch (e) {
    logger.error({ err: e }, "Journal invites GET error");
    return res.status(500).json({ error: "Failed to load invites" });
  }
});

router.post("/user/journal/invites", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { entryId, identifier } = req.body ?? {};
    const entry = await prisma.journalEntry.findFirst({
      where: { id: String(entryId ?? ""), ownerId: userId },
      select: { id: true, title: true },
    });
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    const invitee = await findActiveUser(String(identifier ?? ""));
    if (!invitee) return res.status(404).json({ error: "User not found" });
    if (invitee.id === userId) return res.status(400).json({ error: "You already own this entry" });

    const already = await prisma.journalCollaborator.findUnique({
      where: { entryId_userId: { entryId: entry.id, userId: invitee.id } },
      select: { id: true },
    });
    if (already) return res.status(400).json({ error: "Already a collaborator" });

    const pending = await prisma.journalInvite.findFirst({
      where: { entryId: entry.id, toUserId: invitee.id, status: "PENDING" },
      select: { id: true },
    });
    const invite =
      pending ??
      (await prisma.journalInvite.create({
        data: { entryId: entry.id, fromUserId: userId, toUserId: invitee.id },
        select: { id: true },
      }));
    if (!pending) {
      void notifyUser(prisma, {
        recipientId: invitee.id,
        actorId: userId,
        type: "JOURNAL_INVITE",
        title: "Journal collaboration invite",
        body: entry.title ?? "You were invited to a journal entry",
        link: "/journal",
        targetType: "JOURNAL",
        targetId: entry.id,
      });
    }
    return res.json({ invite });
  } catch (e) {
    logger.error({ err: e }, "Journal invite POST error");
    return res.status(500).json({ error: "Failed to send invite" });
  }
});

router.post("/user/journal/invites/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const action = req.body?.action;
    if (action !== "accept" && action !== "decline") return res.status(400).json({ error: "Invalid action" });
    const invite = await prisma.journalInvite.findFirst({
      where: { id: req.params.id, toUserId: userId, status: "PENDING" },
    });
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    if (action === "accept") {
      await prisma.$transaction([
        prisma.journalInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } }),
        prisma.journalCollaborator.upsert({
          where: { entryId_userId: { entryId: invite.entryId, userId } },
          create: { entryId: invite.entryId, userId, role: "editor" },
          update: {},
        }),
      ]);
      void notifyUser(prisma, {
        recipientId: invite.fromUserId,
        actorId: userId,
        type: "JOURNAL_INVITE_ACCEPTED",
        title: "Journal invite accepted",
        link: "/journal",
        targetType: "JOURNAL",
        targetId: invite.entryId,
      });
    } else {
      await prisma.journalInvite.update({ where: { id: invite.id }, data: { status: "DECLINED" } });
    }
    return res.json({ ok: true, action });
  } catch (e) {
    logger.error({ err: e }, "Journal invite respond error");
    return res.status(500).json({ error: "Failed to update invite" });
  }
});

/** GET /user/journal/:id — full entry. Locked entries need the x-entry-password header. */
router.get("/user/journal/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] },
      include: { collaborators: { include: { user: { select: memberSelect } } } },
    });
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    if (entry.passwordHash) {
      const supplied = String(req.headers["x-entry-password"] ?? "");
      if (!supplied || !(await verifyPassword(supplied, entry.passwordHash))) {
        return res.status(403).json({ error: "Incorrect entry password" });
      }
    }
    const { passwordHash, ...rest } = entry;
    return res.json({ entry: { ...rest, isOwner: entry.ownerId === userId, isLocked: !!passwordHash } });
  } catch (e) {
    logger.error({ err: e }, "Journal entry GET error");
    return res.status(500).json({ error: "Failed to load entry" });
  }
});

export default router;
