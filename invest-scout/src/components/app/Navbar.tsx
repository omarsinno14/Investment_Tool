"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Invesco
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/opportunities" className="hover:underline">Opportunities</Link>
          <Link href="/news" className="hover:underline">News</Link>
          <Link href="/forums" className="hover:underline">Forums</Link>
          <Link href="/tools" className="hover:underline">Tools</Link>
          <Link href="/interests" className="hover:underline">Interests</Link>
          <Link href="/money-management" className="hover:underline">Money management</Link>
          <Link href="/messages" className="hover:underline">Messages</Link>
          <Link href="/settings" className="hover:underline">Settings</Link>
          <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
