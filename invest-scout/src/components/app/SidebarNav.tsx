"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Lightbulb,
  MessageSquareText,
  Newspaper,
  PieChart,
  Target,
  Scale,
  Wrench,
  Sparkles,
  User,
  Users,
} from "lucide-react";

type SidebarNavProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function SidebarNav({ collapsed = false, onToggleCollapsed }: SidebarNavProps) {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <aside className={`flex flex-col border-r bg-background py-6 ${collapsed ? "w-20 px-3" : "w-64 px-4"}`}>
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          {collapsed ? "I" : "Invesco"}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className={`mt-6 flex flex-1 flex-col text-sm ${collapsed ? "gap-1" : "gap-3"}`}>
        <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Gauge className="h-4 w-4" />
          {!collapsed && <span>Dashboard</span>}
        </Link>
        <Link href="/opportunities" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Sparkles className="h-4 w-4" />
          {!collapsed && <span>Opportunities</span>}
        </Link>
        <Link href="/headlines" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Newspaper className="h-4 w-4" />
          {!collapsed && <span>News</span>}
        </Link>
        <Link href="/forums" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Users className="h-4 w-4" />
          {!collapsed && <span>Forums</span>}
        </Link>
        <Link href="/messages" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <MessageSquareText className="h-4 w-4" />
          {!collapsed && <span>Messages</span>}
        </Link>
        <div className="pt-2">
          {!collapsed && <div className="px-2 text-xs uppercase tracking-wide text-muted-foreground">Personal Finance</div>}
          <div className="mt-2 space-y-1">
            <Link href="/cashflow" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <Building2 className="h-4 w-4" />
              {!collapsed && <span>Cashflow</span>}
            </Link>
            <Link href="/portfolio" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <PieChart className="h-4 w-4" />
              {!collapsed && <span>Portfolio</span>}
            </Link>
            <Link href="/goals" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <Target className="h-4 w-4" />
              {!collapsed && <span>Goals & timelines</span>}
            </Link>
            <Link href="/ratios" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <Scale className="h-4 w-4" />
              {!collapsed && <span>Ratios</span>}
            </Link>
            <Link href="/tools" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <Wrench className="h-4 w-4" />
              {!collapsed && <span>Tools</span>}
            </Link>
          </div>
        </div>
        <div className="pt-2">
          {!collapsed && <div className="px-2 text-xs uppercase tracking-wide text-muted-foreground">Profile</div>}
          <div className="mt-2 space-y-1">
            <Link href="/my-profile" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <User className="h-4 w-4" />
              {!collapsed && <span>My profile</span>}
            </Link>
            <Link href="/settings" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <User className="h-4 w-4" />
              {!collapsed && <span>Settings</span>}
            </Link>
            <Link href="/interests" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <Lightbulb className="h-4 w-4" />
              {!collapsed && <span>Interests</span>}
            </Link>
          </div>
        </div>
      </nav>
      <Button
        variant="ghost"
        className="mb-2"
        onClick={() => setTheme(nextTheme)}
      >
        {collapsed ? (theme === "dark" ? "🌙" : "☀️") : `Switch to ${nextTheme} mode`}
      </Button>
      <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
        {collapsed ? "Exit" : "Logout"}
      </Button>
    </aside>
  );
}
