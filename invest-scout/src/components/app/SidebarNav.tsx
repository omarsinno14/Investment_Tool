"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SidebarNav() {
  return (
    <aside className="w-64 flex-col border-r bg-background px-4 py-6 flex">
      <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
        Invesco
      </Link>
      <nav className="mt-6 flex flex-1 flex-col gap-2 text-sm">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <Link href="/opportunities" className="hover:underline">Opportunities</Link>
        <Link href="/headlines" className="hover:underline">Headlines</Link>
        <Link href="/interests" className="hover:underline">Interests</Link>
        <Link href="/money-management" className="hover:underline">Money management</Link>
        <Link href="/tools" className="hover:underline">Tools</Link>
        <Link href="/forums" className="hover:underline">Forums</Link>
        <Link href="/messages" className="hover:underline">Messages</Link>
        <Link href="/settings" className="hover:underline">Settings</Link>
      </nav>
      <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
        Logout
      </Button>
    </aside>
  );
}
