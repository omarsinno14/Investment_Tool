"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Navbar } from "@/components/app/Navbar";
import { SidebarNav } from "@/components/app/SidebarNav";
import { SiteFooter } from "@/components/app/SiteFooter";

type LayoutPreference = "TOP" | "SIDEBAR";

export function AppShell({ children }: { children: ReactNode }) {
  const [layoutPreference, setLayoutPreference] = useState<LayoutPreference>("TOP");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        const pref = data?.profile?.layoutPreference;
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
    <div className="min-h-screen flex flex-col">
      {layoutPreference === "SIDEBAR" ? (
        <div className="flex flex-1">
          <SidebarNav />
          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      ) : (
        <>
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        </>
      )}
      <SiteFooter />
    </div>
  );
}
