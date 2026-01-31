"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Gauge, Home, MessageSquareText, Sparkles } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/messages", label: "Messages", icon: MessageSquareText },
  { href: "/notifications", label: "Alerts", icon: Bell },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
