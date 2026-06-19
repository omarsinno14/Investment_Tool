

import { Link } from "wouter";
import { useLocation } from "wouter";

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
} from "lucide-react";
import { useNavBadgeCounts } from "@/components/app/useNavBadgeCounts";

type SidebarNavProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function SidebarNav({ collapsed = false, onToggleCollapsed }: SidebarNavProps) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const badgeCounts = useNavBadgeCounts();

  const itemClass = (href: string) => {
    const active = location === href || location.startsWith(`${href}/`) || (href === "/forums" && location.startsWith("/hubs"));
    return `flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted ${active ? "bg-muted border border-border" : ""}`;
  };

  return (
    <aside className={`flex h-full flex-col overflow-y-auto border-r bg-background py-6 ${collapsed ? "w-20 px-3" : "w-64 px-4"}`}>
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">{collapsed ? "I" : "Vertica"}</Link>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapsed} aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className={`mt-6 flex flex-1 flex-col text-sm ${collapsed ? "gap-1" : "gap-3"}`}>
        <Link href="/dashboard" className={itemClass("/dashboard")} aria-current={location.startsWith("/dashboard") ? "page" : undefined}><Gauge className="h-4 w-4" />{!collapsed && <span>Dashboard</span>}</Link>
        <Link href="/feed" className={itemClass("/feed")} aria-current={location.startsWith("/feed") ? "page" : undefined}><Home className="h-4 w-4" />{!collapsed && <span>Home feed</span>}</Link>
        <Link href="/opportunities" className={itemClass("/opportunities")} aria-current={location.startsWith("/opportunities") ? "page" : undefined}><Sparkles className="h-4 w-4" />{!collapsed && <span>Opportunities</span>}</Link>
        <Link href="/headlines" className={itemClass("/headlines")} aria-current={location.startsWith("/headlines") ? "page" : undefined}><Newspaper className="h-4 w-4" />{!collapsed && <span>News</span>}</Link>
        <Link href="/forums" className={itemClass("/forums")} aria-current={location.startsWith("/forums") || location.startsWith("/hubs") ? "page" : undefined}><Users className="h-4 w-4" />{!collapsed && <span>Forums</span>}</Link>
        <Link href="/messages" className={itemClass("/messages")} aria-current={location.startsWith("/messages") ? "page" : undefined}><MessageSquareText className="h-4 w-4" />{!collapsed && <span>Messages {badgeCounts.messages > 0 ? `(${badgeCounts.messages})` : ""}</span>}</Link>
        <Link href="/notifications" className={itemClass("/notifications")} aria-current={location.startsWith("/notifications") ? "page" : undefined}><Bell className="h-4 w-4" />{!collapsed && <span>Notifications</span>}</Link>
        <div className="pt-2">
          {!collapsed && <div className="px-2 text-xs uppercase tracking-wide text-muted-foreground">Profile</div>}
          <div className="mt-2 space-y-1">
            <Link href="/my-profile" className={itemClass("/my-profile")}><User className="h-4 w-4" />{!collapsed && <span>My profile</span>}</Link>
            <Link href="/settings" className={itemClass("/settings")}><User className="h-4 w-4" />{!collapsed && <span>Settings</span>}</Link>
            <Link href="/interests" className={itemClass("/interests")}><Lightbulb className="h-4 w-4" />{!collapsed && <span>Interests</span>}</Link>
          </div>
        </div>
      </nav>
      <Button variant="ghost" className="mb-2" onClick={() => setTheme(nextTheme)}>{collapsed ? (theme === "dark" ? "🌙" : "☀️") : `Switch to ${nextTheme} mode`}</Button>
      <Button variant="outline" onClick={async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/login"; }}>{collapsed ? "Exit" : "Logout"}</Button>
    </aside>
  );
}
