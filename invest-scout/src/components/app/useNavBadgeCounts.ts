import { useEffect, useState } from "react";
import { NAV_BADGE_KEYS, readNavSeen } from "@/lib/nav-badges";

type BadgeCounts = {
  messages: number;
  notifications: number;
  opportunities: number;
  headlines: number;
};

function countSince(date: Date | null, timestamp: string | null | undefined) {
  if (!timestamp) return 0;
  const created = new Date(timestamp);
  if (Number.isNaN(created.getTime())) return 0;
  if (!date) return 1;
  return created.getTime() > date.getTime() ? 1 : 0;
}

export function useNavBadgeCounts() {
  const [counts, setCounts] = useState<BadgeCounts>({
    messages: 0,
    notifications: 0,
    opportunities: 0,
    headlines: 0,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [messagesRes, notificationsRes, oppsRes, headlinesRes] = await Promise.all([
          fetch("/api/user/messages", { credentials: "include" }),
          fetch("/api/user/notifications", { credentials: "include" }),
          fetch("/api/opportunities?type=community", { credentials: "include" }),
          fetch("/api/opportunities?type=headlines", { credentials: "include" }),
        ]);

        const [messagesData, notificationsData, oppsData, headlinesData] = await Promise.all([
          messagesRes.json().catch(() => ({})),
          notificationsRes.json().catch(() => ({})),
          oppsRes.json().catch(() => ({})),
          headlinesRes.json().catch(() => ({})),
        ]);

        if (!active) return;

        const messagesSeen = readNavSeen(NAV_BADGE_KEYS.messages);
        const notificationsSeen = readNavSeen(NAV_BADGE_KEYS.notifications);
        const oppsSeen = readNavSeen(NAV_BADGE_KEYS.opportunities);
        const headlinesSeen = readNavSeen(NAV_BADGE_KEYS.headlines);

        const messages = (messagesData.messages ?? []) as Array<any>;
        const currentUserId = messagesData.currentUserId;
        const messageCount = messages.reduce((sum, item) => {
          if (item.toUserId !== currentUserId) return sum;
          return sum + countSince(messagesSeen, item.createdAt);
        }, 0);

        const notifications = (notificationsData.notifications ?? []) as Array<any>;
        const notificationCount = notifications.reduce(
          (sum, item) => sum + countSince(notificationsSeen, item.createdAt),
          0
        );

        const opportunities = (oppsData.opportunities ?? []) as Array<any>;
        const opportunityCount = opportunities.reduce((sum, item) => {
          const date = item.publishedAt ?? item.fetchedAt;
          return sum + countSince(oppsSeen, date);
        }, 0);

        const headlines = (headlinesData.opportunities ?? []) as Array<any>;
        const headlinesCount = headlines.reduce((sum, item) => {
          const date = item.publishedAt ?? item.fetchedAt;
          return sum + countSince(headlinesSeen, date);
        }, 0);

        setCounts({
          messages: messageCount,
          notifications: notificationCount,
          opportunities: opportunityCount,
          headlines: headlinesCount,
        });
      } catch (e) {
        if (!active) return;
        console.error("Failed to load nav badges", e);
      }
    };

    const handleRefresh = () => {
      load();
    };

    load();
    window.addEventListener("storage", handleRefresh);
    window.addEventListener("nav:refresh", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener("nav:refresh", handleRefresh);
    };
  }, []);

  return counts;
}
