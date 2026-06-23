/**
 * digest.ts — weekly digest (Phase 10/11).
 *
 * Aggregates each user's unread-notification / recent-activity counts plus a few
 * fresh opportunity highlights and emails a branded digest. Respects the
 * per-user Profile.notifyDigest preference. Best-effort: never throws.
 */
import type { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";
import { sendEmail } from "./email.js";
import { weeklyDigestEmail } from "./emailTemplates.js";

function appUrl(): string {
  return (process.env.WEB_APP_URL || process.env.PUBLIC_WEB_URL || "https://vertica.app").replace(/\/$/, "");
}

export async function sendWeeklyDigest(prisma: PrismaClient): Promise<void> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // A handful of fresh, open opportunities to feature in every digest.
    const fresh = await prisma.opportunity.findMany({
      where: { fetchedAt: { gte: since } },
      orderBy: { fetchedAt: "desc" },
      take: 5,
      select: { id: true, title: true },
    });
    const highlights = fresh.map((o) => ({
      title: o.title,
      url: `${appUrl()}/opportunities/${o.id}`,
    }));

    const users = await prisma.user.findMany({
      where: {
        deactivatedAt: null,
        bannedAt: null,
        profile: { notifyDigest: true },
      },
      select: { id: true, email: true, profile: { select: { name: true } } },
    });

    for (const user of users) {
      try {
        const [unreadCount, weeklyCount] = await Promise.all([
          prisma.notification.count({ where: { userId: user.id, readAt: null } }),
          prisma.notification.count({ where: { userId: user.id, createdAt: { gte: since } } }),
        ]);

        if (unreadCount === 0 && weeklyCount === 0 && highlights.length === 0) continue;

        const tpl = weeklyDigestEmail({
          name: user.profile?.name ?? null,
          unreadCount,
          weeklyCount,
          highlights,
        });
        await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      } catch (e) {
        logger.error({ err: e, userId: user.id }, "sendWeeklyDigest user error");
      }
    }
  } catch (e) {
    logger.error({ err: e }, "sendWeeklyDigest failed");
  }
}
