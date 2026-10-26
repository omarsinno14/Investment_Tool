import { useEffect, useState } from "react";
import { NAV_BADGE_KEYS, readNavSeen } from "@/lib/nav-badges";

type BadgeCounts = {
  messages: number;
  notifications: number;
  opportunities: number;
  headlines: number;
};

const UNREAD_POLL_MS = 30_000;
const FEED_REFRESH_MS = 5 * 60_000;

function countSince(date: Date | null, items: Array<any>) {
  return items.reduce((sum, item) => {
    const raw = item.publishedAt ?? item.fetchedAt;
    if (!raw) return sum;
    const created = new Date(raw);
    if (Number.isNaN(created.getTime())) return sum;
    return sum + (!date || created.getTime() > date.getTime() ? 1 : 0);
  }, 0);
}

/**
 * One shared store for every component that shows nav badges, so the sidebar,
 * top bar and page remounts don't each re-download data. Unread messages and
 * notifications come from the lightweight /api/user/badge-counts endpoint;
 * "new deals/headlines since last visit" refresh far less often.
 */
let counts: BadgeCounts = { messages: 0, notifications: 0, opportunities: 0, headlines: 0 };
let feedItems: { opportunities: any[]; headlines: any[] } = { opportunities: [], headlines: [] };
let feedLoadedAt = 0;
const listeners = new Set<(c: BadgeCounts) => void>();
let timer: number | null = null;
let inFlight = false;

function publish(next: Partial<BadgeCounts>) {
  counts = { ...counts, ...next };
  listeners.forEach((l) => l(counts));
}

function recomputeFeedCounts() {
  publish({
    opportunities: countSince(readNavSeen(NAV_BADGE_KEYS.opportunities), feedItems.opportunities),
    headlines: countSince(readNavSeen(NAV_BADGE_KEYS.headlines), feedItems.headlines),
  });
}

async function refresh(force = false) {
  if (inFlight) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible" && !force) return;
  inFlight = true;
  try {
    const unreadReq = fetch("/api/user/badge-counts", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const needFeed = force || Date.now() - feedLoadedAt > FEED_REFRESH_MS;
    const feedReq = needFeed
      ? Promise.all([
          fetch("/api/opportunities?type=community&limit=20", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
          fetch("/api/opportunities?type=headlines&limit=20", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
        ]).catch(() => null)
      : Promise.resolve(null);

    const [unread, feed] = await Promise.all([unreadReq, feedReq]);
    if (unread) publish({ messages: unread.messages ?? 0, notifications: unread.notifications ?? 0 });
    if (feed) {
      feedItems = { opportunities: feed[0]?.opportunities ?? [], headlines: feed[1]?.opportunities ?? [] };
      feedLoadedAt = Date.now();
    }
    recomputeFeedCounts();
  } finally {
    inFlight = false;
  }
}

function start() {
  if (timer !== null) return;
  refresh(true);
  timer = window.setInterval(() => refresh(), UNREAD_POLL_MS);
  window.addEventListener("nav:refresh", onSeen);
  window.addEventListener("storage", onSeen);
  document.addEventListener("visibilitychange", onVisible);
}

function stop() {
  if (timer === null) return;
  window.clearInterval(timer);
  timer = null;
  window.removeEventListener("nav:refresh", onSeen);
  window.removeEventListener("storage", onSeen);
  document.removeEventListener("visibilitychange", onVisible);
}

function onSeen() {
  recomputeFeedCounts();
  refresh();
}

function onVisible() {
  if (document.visibilityState === "visible") refresh();
}

export function useNavBadgeCounts() {
  const [value, setValue] = useState<BadgeCounts>(counts);

  useEffect(() => {
    listeners.add(setValue);
    setValue(counts);
    start();
    return () => {
      listeners.delete(setValue);
      if (listeners.size === 0) stop();
    };
  }, []);

  return value;
}
