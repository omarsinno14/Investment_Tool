/**
 * healthMetrics.ts — lightweight in-process telemetry for the admin health
 * monitoring unit (Phase 12).
 *
 * Keeps a bounded ring buffer of recent server-side errors plus simple request
 * counters so the admin dashboard can show fault signals without an external
 * APM. State is per-process and resets on restart — that's intentional; the
 * dashboard is for live operational awareness, not long-term analytics.
 */

export interface RecordedError {
  at: string;
  scope: string;
  message: string;
}

const MAX_ERRORS = 50;
const errors: RecordedError[] = [];

let requestCount = 0;
let errorCount = 0;
const processStartedAt = Date.now();

/** Record a server-side error for the health dashboard. Never throws. */
export function recordError(scope: string, err: unknown): void {
  try {
    errorCount += 1;
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    errors.unshift({ at: new Date().toISOString(), scope, message: message.slice(0, 300) });
    if (errors.length > MAX_ERRORS) errors.length = MAX_ERRORS;
  } catch {
    /* swallow — telemetry must never break the request path */
  }
}

/** Count one handled request (success or failure). */
export function recordRequest(): void {
  requestCount += 1;
}

export function getRecentErrors(limit = 20): RecordedError[] {
  return errors.slice(0, limit);
}

export function getCounters(): {
  requestCount: number;
  errorCount: number;
  errorRate: number;
  uptimeSeconds: number;
} {
  const uptimeSeconds = Math.floor((Date.now() - processStartedAt) / 1000);
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
  return { requestCount, errorCount, errorRate, uptimeSeconds };
}
