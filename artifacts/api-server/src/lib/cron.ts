/**
 * cron.ts — lightweight in-process scheduler (Phase 11).
 *
 * Runs the weekly digest. Timers reset on restart, which is acceptable: the
 * digest is idempotent enough (it only reports counts) and a missed window
 * simply rolls into the next. Disable with DISABLE_CRON=1.
 */
import type { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";
import { sendWeeklyDigest } from "./digest.js";

const HOUR = 60 * 60 * 1000;

let lastDigestKey = "";

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${week}`;
}

export function startCron(prisma: PrismaClient): void {
  if (process.env.DISABLE_CRON === "1") {
    logger.info("[cron] disabled via DISABLE_CRON");
    return;
  }
  // Weekly digest target: Monday ~13:00 UTC.
  const DIGEST_DAY = 1; // Monday
  const DIGEST_HOUR = 13;

  const tick = async () => {
    const now = new Date();
    if (now.getUTCDay() === DIGEST_DAY && now.getUTCHours() === DIGEST_HOUR) {
      const key = isoWeekKey(now);
      if (key !== lastDigestKey) {
        lastDigestKey = key;
        logger.info({ week: key }, "[cron] running weekly digest");
        await sendWeeklyDigest(prisma);
      }
    }
  };

  // Check hourly.
  setInterval(() => void tick(), HOUR).unref?.();
  logger.info("[cron] scheduler started");
}
