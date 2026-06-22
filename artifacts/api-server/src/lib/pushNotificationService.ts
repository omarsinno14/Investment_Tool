/**
 * pushNotificationService.ts
 * Sends Expo push notifications to users whose interests match a new opportunity.
 * Uses the Expo Push API: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { prisma } from "./db.js";
import { logger } from "./logger.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  badge?: number;
}

async function sendExpoPushBatch(messages: ExpoMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      logger.warn({ status: res.status, body: txt }, "Expo push batch error");
    }
  } catch (e) {
    logger.error({ err: e }, "Expo push send failed");
  }
}

/**
 * Notify all users whose interests match the opportunity's tags/countries.
 * Called immediately after a new opportunity is created.
 */
export async function notifyMatchingUsers(opportunity: {
  id: string;
  title: string;
  tags: string[];
  countryTags?: string[];
  summary?: string | null;
}): Promise<void> {
  try {
    const oppTagsLower = [...(opportunity.tags ?? []), ...(opportunity.countryTags ?? [])].map((t) => t.toLowerCase());
    if (oppTagsLower.length === 0) return;

    // Find users with matching interests who have push tokens
    const users = await (prisma as any).pushToken.findMany({
      select: {
        token: true,
        userId: true,
      },
      where: {
        user: {
          // Respect the per-user opportunity notification preference.
          profile: { notifyOpportunities: { not: false } },
          interests: {
            some: {
              value: { in: oppTagsLower, mode: "insensitive" },
            },
          },
        },
      },
    });

    if (users.length === 0) return;

    // Build messages — 100 per batch (Expo limit)
    const messages: ExpoMessage[] = users
      .filter((u: any) => u.token?.startsWith("ExponentPushToken[") || u.token?.startsWith("ExpoPushToken["))
      .map((u: any) => ({
        to: u.token,
        sound: "default",
        title: "New opportunity matched",
        body: opportunity.title.slice(0, 200),
        data: { opportunityId: opportunity.id, screen: "opportunity" },
      }));

    // Send in batches of 100
    for (let i = 0; i < messages.length; i += 100) {
      await sendExpoPushBatch(messages.slice(i, i + 100));
    }

    logger.info({ count: messages.length, opportunityId: opportunity.id }, "Push notifications sent for new opportunity");
  } catch (e) {
    logger.error({ err: e }, "notifyMatchingUsers failed");
  }
}

/**
 * Notify specific users with a custom message.
 * Used for direct system notifications.
 */
export async function notifyUsers(
  userIds: string[],
  notification: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const tokens = await (prisma as any).pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });

    const messages: ExpoMessage[] = tokens
      .filter((t: any) => t.token?.startsWith("ExponentPushToken[") || t.token?.startsWith("ExpoPushToken["))
      .map((t: any) => ({
        to: t.token,
        sound: "default",
        title: notification.title,
        body: notification.body,
        data: notification.data,
      }));

    for (let i = 0; i < messages.length; i += 100) {
      await sendExpoPushBatch(messages.slice(i, i + 100));
    }
  } catch (e) {
    logger.error({ err: e }, "notifyUsers failed");
  }
}
