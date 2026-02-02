"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ScrollToTopButton({ container }: { container: HTMLElement | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!container) return;
    const onScroll = () => {
      setVisible(container.scrollTop > 500);
    };
    container.addEventListener("scroll", onScroll);
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [container]);

  if (!visible) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      className="fixed bottom-6 right-6 shadow-lg"
      onClick={() => container?.scrollTo({ top: 0, behavior: "smooth" })}
    >
      Back to top
    </Button>
  );
}
