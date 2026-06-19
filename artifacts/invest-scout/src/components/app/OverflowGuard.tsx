

import { useEffect } from "react";

export function OverflowGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    let frame = 0;
    let last = 0;

    const scan = () => {
      frame = requestAnimationFrame(() => {
        const now = Date.now();
        if (now - last < 1500) {
          scan();
          return;
        }
        last = now;
        const root = document.documentElement;
        if (root.scrollWidth > root.clientWidth + 1) {
          const offenders: HTMLElement[] = [];
          document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            if (el.scrollWidth > root.clientWidth + 1) offenders.push(el);
          });
          // eslint-disable-next-line no-console
          console.warn("[OverflowGuard] Horizontal overflow detected", offenders.slice(0, 5));
        }
        scan();
      });
    };

    scan();
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
