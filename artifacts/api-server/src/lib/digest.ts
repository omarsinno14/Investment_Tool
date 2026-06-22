/**
 * digest.ts — weekly digest STUB (Phase 10).
 *
 * Aggregates each user's unread-notification / recent-activity counts and hands
 * them to the email stub. This is intentionally NOT wired to a cron — that, plus
 * the real email transport, arrives in Phase 11. Best-effort: never throws.
 */
import type { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";
import { sendEmail } from "./email.js";

export async function sendWeeklyDigest(prisma: PrismaClient): Promise<void> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: { deactivatedAt: null, bannedAt: null },
      select: { id: true, email: true },
    });

    for (const user of users) {
      try {
        const [unreadCount, weeklyCount] = await Promise.all([
          prisma.notification.count({ where: { userId: user.id, readAt: null } }),
          prisma.notification.count({ where: { userId: user.id, createdAt: { gte: since } } }),
        ]);

        // Skip users with nothing to report.
        if (unreadCount === 0 && weeklyCount === 0) continue;

        await sendEmail({
          to: user.email,
          subject: "Your weekly Vertica digest",
          text:
            `You have ${unreadCount} unread notification(s) and ` +
            `${weeklyCount} new update(s) from the past week.`,
        });
      } catch (e) {
        logger.error({ err: e, userId: user.id }, "sendWeeklyDigest user error");
      }
    }
  } catch (e) {
    logger.error({ err: e }, "sendWeeklyDigest failed");
  }
}
