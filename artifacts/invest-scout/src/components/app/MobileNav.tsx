

import { Link } from "wouter";
import { useLocation } from "wouter";
import { Bell, Gauge, Home, MessageSquareText, Sparkles, User, Newspaper, MessagesSquare } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/headlines", label: "News", icon: Newspaper },
  { href: "/forums", label: "Forums", icon: MessagesSquare },
  { href: "/messages", label: "Messages", icon: MessageSquareText },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/my-profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-2 px-3 py-2">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`) || (item.href === "/forums" && location.startsWith("/hubs"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-1 text-[11px] transition ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
