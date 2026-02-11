export const NAV_BADGE_KEYS = {
  messages: "invescout-last-seen-messages",
  notifications: "invescout-last-seen-notifications",
  opportunities: "invescout-last-seen-opportunities",
  headlines: "invescout-last-seen-headlines",
} as const;

export function markNavSeen(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, new Date().toISOString());
  window.dispatchEvent(new Event("nav:refresh"));
}

export function readNavSeen(key: string) {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
