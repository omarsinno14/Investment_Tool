/**
 * notify.ts — best-effort in-app notification + push emission helper.
 *
 * Creates a Notification row for the recipient (respecting their per-user
 * Profile.notify* preferences) and best-effort fires an Expo push if they have
 * a registered push token. This NEVER throws — a notification failure must never
 * break the underlying action (follow / message / comment / etc).
 */
import type { PrismaClient, NotificationType } from "@prisma/client";
import { logger } from "./logger.js";
import { notifyUsers } from "./pushNotificationService.js";

export interface NotifyInput {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  data?: Record<string, unknown>;
}

/**
 * Maps each NotificationType to the Profile.notify* boolean flag that gates it.
 * Types with no relevant flag (e.g. REPORT_RECEIVED) return null → always sent.
 */
const TYPE_TO_PREFERENCE: Record<NotificationType, keyof PreferenceFlags | null> = {
  MESSAGE: "notifyMessages",
  FOLLOW_REQUEST: "notifyFollows",
  FOLLOW_ACCEPTED: "notifyFollows",
  FORUM_REACTION: "notifyForums",
  FORUM_COMMENT: "notifyForums",
  FORUM_MENTION: "notifyForums",
  HUB_MENTION: "notifyForums",
  OPPORTUNITY_MATCH: "notifyOpportunities",
  OPPORTUNITY_TRENDING: "notifyOpportunities",
  NEWS_BREAKING: "notifyOpportunities",
  JOURNAL_INVITE: "notifyJournal",
  JOURNAL_INVITE_ACCEPTED: "notifyJournal",
  REPORT_RECEIVED: null,
};

interface PreferenceFlags {
  notifyMessages: boolean;
  notifyFollows: boolean;
  notifyOpportunities: boolean;
  notifyForums: boolean;
  notifyJournal: boolean;
}

export async function notifyUser(prisma: PrismaClient, input: NotifyInput): Promise<void> {
  try {
    const { recipientId, actorId, type, title, body, link, targetType, targetId, data } = input;

    // No self-notify.
    if (!recipientId || (actorId && recipientId === actorId)) return;

    // Respect the recipient's preference for this notification category.
    const prefKey = TYPE_TO_PREFERENCE[type];
    if (prefKey) {
      const profile = await prisma.profile.findUnique({
        where: { userId: recipientId },
        select: {
          notifyMessages: true,
          notifyFollows: true,
          notifyOpportunities: true,
          notifyForums: true,
          notifyJournal: true,
        },
      });
      // If a profile exists and the flag is explicitly disabled, silently skip.
      if (profile && profile[prefKey] === false) return;
    }

    // The schema's Notification model stores everything in a JSON `data` blob,
    // so title/body/link/actor/target all live there alongside any extra data.
    const payload: Record<string, unknown> = {
      title,
      ...(body != null ? { body } : {}),
      ...(link != null ? { link } : {}),
      ...(actorId != null ? { actorId, fromUserId: actorId } : {}),
      ...(targetType != null ? { targetType } : {}),
      ...(targetId != null ? { targetId } : {}),
      ...(data ?? {}),
    };

    await prisma.notification.create({
      data: { userId: recipientId, type, data: payload as any },
    });

    // Best-effort push (no-op if the recipient has no token).
    await notifyUsers([recipientId], {
      title,
      body: body ?? title,
      data: { ...payload, type, ...(link != null ? { link } : {}) },
    }).catch((e) => logger.error({ err: e }, "notifyUser push failed"));
  } catch (e) {
    logger.error({ err: e }, "notifyUser failed");
  }
}
