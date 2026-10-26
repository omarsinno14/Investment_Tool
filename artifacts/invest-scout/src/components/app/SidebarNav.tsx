

import { Link } from "wouter";
import { fetchProfile } from "@/lib/profile-cache";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gauge,
  Home,
  Lightbulb,
  LifeBuoy,
  MessageSquareText,
  Newspaper,
  Shield,
  Sparkles,
  User,
  Users,
  Bell,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useNavBadgeCounts } from "@/components/app/useNavBadgeCounts";

type SidebarNavProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

function NavCount({ count, collapsed }: { count: number; collapsed: boolean }) {
  if (count <= 0) return null;
  return collapsed ? (
    <span className="ml-auto h-2 w-2 rounded-full bg-destructive" aria-label={`${count} new`} />
  ) : (
    <span className="ml-auto rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-[18px] text-white">{count > 99 ? "99+" : count}</span>
  );
}

export function SidebarNav({ collapsed = false, onToggleCollapsed }: SidebarNavProps) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const badgeCounts = useNavBadgeCounts();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProfile()
      .then((r) => setIsAdmin(r.ok && r.data?.role === "ADMIN"))
      .catch(() => {});
  }, []);

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
        <Link href="/messages" className={itemClass("/messages")} aria-current={location.startsWith("/messages") ? "page" : undefined}><MessageSquareText className="h-4 w-4" />{!collapsed && <span className="flex-1">Messages</span>}<NavCount count={badgeCounts.messages} collapsed={collapsed} /></Link>
        <Link href="/notifications" className={itemClass("/notifications")} aria-current={location.startsWith("/notifications") ? "page" : undefined}><Bell className="h-4 w-4" />{!collapsed && <span className="flex-1">Notifications</span>}<NavCount count={badgeCounts.notifications} collapsed={collapsed} /></Link>
        <div className="pt-2">
          {!collapsed && <div className="px-2 text-xs uppercase tracking-wide text-muted-foreground">Profile</div>}
          <div className="mt-2 space-y-1">
            <Link href="/my-profile" className={itemClass("/my-profile")}><User className="h-4 w-4" />{!collapsed && <span>My profile</span>}</Link>
            <Link href="/settings" className={itemClass("/settings")}><User className="h-4 w-4" />{!collapsed && <span>Settings</span>}</Link>
            <Link href="/billing" className={itemClass("/billing")}><CreditCard className="h-4 w-4" />{!collapsed && <span>Membership</span>}</Link>
            <Link href="/interests" className={itemClass("/interests")}><Lightbulb className="h-4 w-4" />{!collapsed && <span>Interests</span>}</Link>
            <Link href="/support" className={itemClass("/support")}><LifeBuoy className="h-4 w-4" />{!collapsed && <span>Support</span>}</Link>
          </div>
        </div>
        {isAdmin && (
          <div className="pt-2">
            {!collapsed && <div className="px-2 text-xs uppercase tracking-wide text-muted-foreground">Admin</div>}
            <div className="mt-2 space-y-1">
              <Link href="/admin" className={itemClass("/admin")} aria-current={location.startsWith("/admin") ? "page" : undefined}><Shield className="h-4 w-4" />{!collapsed && <span>Admin Console</span>}</Link>
            </div>
          </div>
        )}
      </nav>
      <div className="space-y-1 border-t pt-3">
        <button type="button" onClick={() => setTheme(nextTheme)} className={`${itemClass("#")} w-full text-left`} aria-label={`Switch to ${nextTheme} mode`}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{nextTheme === "dark" ? "Dark mode" : "Light mode"}</span>}
        </button>
        <button
          type="button"
          onClick={async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/login"; }}
          className={`${itemClass("#")} w-full text-left text-destructive hover:bg-destructive/10`}
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
