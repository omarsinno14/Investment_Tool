import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import {
  Bell,
  CreditCard,
  Gauge,
  Home,
  LifeBuoy,
  Lightbulb,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Newspaper,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/social/UserAvatar";
import { useViewer } from "@/components/social/useViewer";
import { useNavBadgeCounts } from "@/components/app/useNavBadgeCounts";
import { fetchProfile } from "@/lib/profile-cache";
import { cn } from "@/lib/utils";

function isActive(location: string, href: string) {
  return location === href || location.startsWith(`${href}/`) || (href === "/forums" && location.startsWith("/hubs"));
}

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Phone top bar: wordmark, activity and messages shortcuts, and the full menu. */
export function MobileTopBar() {
  const [location] = useLocation();
  const counts = useNavBadgeCounts();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location]);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:hidden">
      <Link href="/feed" className="text-lg font-semibold tracking-tight">
        Vertica
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href="/notifications"
          aria-label={`Activity${counts.notifications ? `, ${counts.notifications} new` : ""}`}
          className={cn("relative flex h-10 w-10 items-center justify-center rounded-full", isActive(location, "/notifications") && "bg-secondary")}
        >
          <Bell className="h-[22px] w-[22px]" />
          <CountBadge count={counts.notifications} className="right-0.5 top-0.5" />
        </Link>
        <Link
          href="/messages"
          aria-label={`Messages${counts.messages ? `, ${counts.messages} unread` : ""}`}
          className={cn("relative flex h-10 w-10 items-center justify-center rounded-full", isActive(location, "/messages") && "bg-secondary")}
        >
          <MessageCircle className="h-[22px] w-[22px]" />
          <CountBadge count={counts.messages} className="right-0.5 top-0.5" />
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full"
        >
          <Menu className="h-[22px] w-[22px]" />
        </button>
      </div>
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} location={location} />
    </header>
  );
}

function MobileMenu({ open, onOpenChange, location }: { open: boolean; onOpenChange: (v: boolean) => void; location: string }) {
  const viewer = useViewer();
  const { theme, setTheme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProfile()
      .then((r) => setIsAdmin(r.ok && r.data?.role === "ADMIN"))
      .catch(() => undefined);
  }, []);

  const groups: { title?: string; items: { href: string; label: string; icon: typeof Home }[] }[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: Gauge },
        { href: "/feed", label: "Home feed", icon: Home },
        { href: "/opportunities", label: "Deals", icon: Sparkles },
        { href: "/headlines", label: "News", icon: Newspaper },
        { href: "/forums", label: "Community", icon: Users },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/settings", label: "Settings", icon: Settings },
        { href: "/interests", label: "Interests", icon: Lightbulb },
        { href: "/billing", label: "Membership", icon: CreditCard },
        { href: "/support", label: "Support", icon: LifeBuoy },
        ...(isAdmin ? [{ href: "/admin", label: "Admin console", icon: Shield }] : []),
      ],
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[82vw] max-w-sm flex-col gap-0 p-0">
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Link href="/my-profile" className="flex items-center gap-3">
            <UserAvatar user={viewer} size="lg" />
            <div className="min-w-0">
              <div className="truncate font-semibold">{viewer?.profile?.name || viewer?.profile?.username || "Your profile"}</div>
              <div className="text-sm text-muted-foreground">View profile</div>
            </div>
          </Link>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto p-2">
          {groups.map((group, i) => (
            <div key={i} className={cn(i > 0 && "mt-3 border-t pt-3")}>
              {group.title && <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.title}</div>}
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                    isActive(location, href) ? "bg-secondary" : "hover:bg-secondary/60"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition hover:bg-secondary/60"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const tabs = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/opportunities", label: "Deals", icon: Sparkles },
  { href: "/headlines", label: "News", icon: Newspaper },
  { href: "/forums", label: "Community", icon: Users },
];

/** Phone bottom tab bar: one row, five destinations. */
export function MobileNav() {
  const [location] = useLocation();
  const counts = useNavBadgeCounts();
  const viewer = useViewer();
  const profileActive = isActive(location, "/my-profile");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(location, href);
          const badge = href === "/opportunities" ? counts.opportunities : href === "/headlines" ? counts.headlines : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}
            >
              <span className="relative">
                <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
                {badge > 0 && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />}
              </span>
              {label}
            </Link>
          );
        })}
        <Link
          href="/my-profile"
          aria-current={profileActive ? "page" : undefined}
          className={cn("flex flex-col items-center justify-center gap-1 text-[11px] font-medium", profileActive ? "text-foreground" : "text-muted-foreground")}
        >
          <UserAvatar user={viewer} size="xs" className={cn("h-6 w-6", profileActive && "ring-2 ring-foreground ring-offset-1 ring-offset-background")} />
          Profile
        </Link>
      </div>
    </nav>
  );
}
