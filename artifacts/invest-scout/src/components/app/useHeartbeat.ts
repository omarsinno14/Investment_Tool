import { useEffect, useRef } from "react";

/**
 * Records an active session via the heartbeat endpoint so admins can track
 * engagement hours. Fires on mount, then every 60s while the tab is visible.
 */
const HEARTBEAT_SESSION_KEY = "vertica.heartbeat.sessionId";

export function useHeartbeat() {
  const sessionId = useRef<string | null>(
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem(HEARTBEAT_SESSION_KEY) : null,
  );

  useEffect(() => {
    let cancelled = false;

    async function beat() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/user/heartbeat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId.current, platform: "web" }),
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.sessionId) {
          sessionId.current = data.sessionId;
          try { sessionStorage.setItem(HEARTBEAT_SESSION_KEY, data.sessionId); } catch { /* ignore */ }
        }
      } catch {
        /* heartbeat is best-effort */
      }
    }

    beat();
    const interval = setInterval(beat, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
