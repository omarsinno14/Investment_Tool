"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/app/Navbar";
import { SidebarNav } from "@/components/app/SidebarNav";
import { MobileNav } from "@/components/app/MobileNav";
import { SiteFooter } from "@/components/app/SiteFooter";
import { OverflowGuard } from "@/components/app/OverflowGuard";
import { ScrollToTopButton } from "@/components/app/ScrollToTopButton";
import Link from "next/link";

type LayoutPreference = "TOP" | "SIDEBAR";

function suggestUsername(email?: string | null) {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
  if (cleaned.length >= 3) {
    return cleaned.slice(0, 20);
  }
  if (cleaned.length > 0) {
    return `${cleaned}${"invest".slice(0, 3 - cleaned.length)}`.slice(0, 20);
  }
  return "investor";
}

export function AppShell({ children }: { children: ReactNode }) {
  const [layoutPreference, setLayoutPreference] = useState<LayoutPreference>("SIDEBAR");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileSummary, setProfileSummary] = useState<{ username?: string | null; email?: string | null } | null>(
    null
  );
  const mainRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        const pref = data?.profile?.layoutPreference ?? "SIDEBAR";
        if (pref === "SIDEBAR" || pref === "TOP") {
          setLayoutPreference(pref);
        }
        setProfileSummary({ username: data?.profile?.username ?? null, email: data?.email ?? null });
      } catch (e) {
        console.error("Failed to load layout preference", e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;
    setScrollContainer(container);
    const key = `scroll:${pathname}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      container.scrollTop = Number(stored);
    }
    const onScroll = () => {
      sessionStorage.setItem(key, String(container.scrollTop));
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    if (mainRef.current) {
      setScrollContainer(mainRef.current);
    }
  }, [layoutPreference]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <OverflowGuard />
      {layoutPreference === "SIDEBAR" ? (
        <div className="flex flex-1 min-h-0">
          <div className="hidden md:flex">
            <SidebarNav
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
            />
          </div>
          <main
            ref={mainRef}
            data-scroll-container
            className="flex min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-24 md:px-6 md:py-8"
          >
            <div className="mx-auto w-full max-w-6xl space-y-10">
              {profileSummary && !profileSummary.username && pathname !== "/settings" && (
                <div className="rounded-2xl border bg-card px-4 py-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold">Choose your username</div>
                      <div className="text-xs text-muted-foreground">
                        Usernames are shown everywhere instead of email.{profileSummary?.email
                          ? ` Suggested: @${suggestUsername(profileSummary.email)}`
                          : ""}
                      </div>
                    </div>
                    <Link href="/settings" className="text-xs font-medium text-primary underline">
                      Set username
                    </Link>
                  </div>
                </div>
              )}
              {children}
              <SiteFooter />
            </div>
          </main>
          <MobileNav />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 overflow-y-auto">
            <Navbar />
          </div>
          <main ref={mainRef} data-scroll-container className="flex-1 overflow-y-auto px-4 py-8">
            <div className="mx-auto w-full max-w-6xl space-y-10">
              {profileSummary && !profileSummary.username && pathname !== "/settings" && (
                <div className="rounded-2xl border bg-card px-4 py-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold">Choose your username</div>
                      <div className="text-xs text-muted-foreground">
                        Usernames are shown everywhere instead of email.{profileSummary?.email
                          ? ` Suggested: @${suggestUsername(profileSummary.email)}`
                          : ""}
                      </div>
                    </div>
                    <Link href="/settings" className="text-xs font-medium text-primary underline">
                      Set username
                    </Link>
                  </div>
                </div>
              )}
              {children}
              <SiteFooter />
            </div>
          </main>
        </div>
      )}
      <ScrollToTopButton container={scrollContainer} />
    </div>
  );
}
