"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Home,
  Lightbulb,
  MessageSquareText,
  Newspaper,
  Sparkles,
  User,
  Users,
  Bell,
  ClipboardList,
} from "lucide-react";
import { useNavBadgeCounts } from "@/components/app/useNavBadgeCounts";

type SidebarNavProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function SidebarNav({ collapsed = false, onToggleCollapsed }: SidebarNavProps) {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const badgeCounts = useNavBadgeCounts();
  return (
    <aside
      className={`flex h-full flex-col overflow-y-auto border-r bg-background py-6 ${collapsed ? "w-20 px-3" : "w-64 px-4"}`}
    >
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
        <Link href="/feed" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Home className="h-4 w-4" />
          {!collapsed && <span>Home feed</span>}
        </Link>
        <Link href="/opportunities" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Sparkles className="h-4 w-4" />
          {!collapsed && (
            <span className="flex w-full items-center justify-between">
              <span>Opportunities</span>
              {badgeCounts.opportunities > 0 && (
                <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {badgeCounts.opportunities > 99 ? "99+" : badgeCounts.opportunities}
                </span>
              )}
            </span>
          )}
        </Link>
        <Link href="/headlines" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Newspaper className="h-4 w-4" />
          {!collapsed && (
            <span className="flex w-full items-center justify-between">
              <span>News</span>
              {badgeCounts.headlines > 0 && (
                <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {badgeCounts.headlines > 99 ? "99+" : badgeCounts.headlines}
                </span>
              )}
            </span>
          )}
        </Link>
        <Link href="/forums" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Users className="h-4 w-4" />
          {!collapsed && <span>Forums</span>}
        </Link>
        <Link href="/messages" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <MessageSquareText className="h-4 w-4" />
          {!collapsed && (
            <span className="flex w-full items-center justify-between">
              <span>Messages</span>
              {badgeCounts.messages > 0 && (
                <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {badgeCounts.messages > 99 ? "99+" : badgeCounts.messages}
                </span>
              )}
            </span>
          )}
        </Link>
        <Link href="/notifications" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
          <Bell className="h-4 w-4" />
          {!collapsed && (
            <span className="flex w-full items-center justify-between">
              <span>Notifications</span>
              {badgeCounts.notifications > 0 && (
                <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {badgeCounts.notifications > 99 ? "99+" : badgeCounts.notifications}
                </span>
              )}
            </span>
          )}
        </Link>
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
            <Link href="/follow-requests" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <User className="h-4 w-4" />
              {!collapsed && <span>Follow requests</span>}
            </Link>
            <Link href="/activity" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
              <ClipboardList className="h-4 w-4" />
              {!collapsed && <span>My activity</span>}
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
