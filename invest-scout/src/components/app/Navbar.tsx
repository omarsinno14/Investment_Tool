"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Invesco
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/opportunities" className="hover:underline">Opportunities</Link>
          <Link href="/headlines" className="hover:underline">News</Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="hover:underline">Personal Finance</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/money-management">Money management</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/tools">Tools</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/forums" className="hover:underline">Forums</Link>
          <Link href="/messages" className="hover:underline">Messages</Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="hover:underline">Profile</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/interests">Interests</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
