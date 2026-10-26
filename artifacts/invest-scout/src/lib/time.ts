/** Compact relative time used across social surfaces: "now", "5m", "3h", "2d", "Oct 14". */
export function timeAgo(input?: string | Date | null): string {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

/** Full timestamp for tooltips. */
export function fullDate(input?: string | Date | null): string {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Bucket used to group activity: "Today", "This week", "Earlier". */
export function recencyBucket(input: string | Date): "Today" | "This week" | "Earlier" {
  const date = typeof input === "string" ? new Date(input) : input;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return "Today";
  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) return "This week";
  return "Earlier";
}
