"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Navbar } from "@/components/app/Navbar";
import { SidebarNav } from "@/components/app/SidebarNav";
import { MobileNav } from "@/components/app/MobileNav";
import { SiteFooter } from "@/components/app/SiteFooter";

type LayoutPreference = "TOP" | "SIDEBAR";

export function AppShell({ children }: { children: ReactNode }) {
  const [layoutPreference, setLayoutPreference] = useState<LayoutPreference>("SIDEBAR");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      } catch (e) {
        console.error("Failed to load layout preference", e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {layoutPreference === "SIDEBAR" ? (
        <div className="flex flex-1 min-h-0">
          <div className="hidden md:flex">
            <SidebarNav
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
            />
          </div>
          <main className="flex min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-24 md:px-6 md:py-8">
            <div className="mx-auto w-full max-w-6xl space-y-10">
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
          <main className="flex-1 overflow-y-auto px-4 py-8">
            <div className="mx-auto w-full max-w-6xl space-y-10">
              {children}
              <SiteFooter />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
