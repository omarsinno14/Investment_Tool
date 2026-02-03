"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavBadgeCounts } from "@/components/app/useNavBadgeCounts";

export function Navbar() {
  const { setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"users" | "opportunities">("users");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const badgeCounts = useNavBadgeCounts();

  const renderBadge = (count: number) => {
    if (!count) return null;
    const label = count > 99 ? "99+" : String(count);
    return (
      <span className="ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
        {label}
      </span>
    );
  };

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const url =
          searchType === "users"
            ? `/api/users/search?q=${encodeURIComponent(term)}`
            : `/api/opportunities?type=community&q=${encodeURIComponent(term)}`;
        const res = await fetch(url, { credentials: "include", signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Search failed");
        setSearchResults(
          searchType === "users" ? data.users ?? [] : data.opportunities ?? []
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Search failed", e);
          setSearchResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, searchType, searchOpen]);

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/feed" className="font-semibold tracking-tight">
          Invesco
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/feed" className="hover:underline">
            Home
          </Link>
          <Link href="/opportunities" className="hover:underline">
            Opportunities{renderBadge(badgeCounts.opportunities)}
          </Link>
          <Link href="/headlines" className="hover:underline">
            News{renderBadge(badgeCounts.headlines)}
          </Link>
          <Link href="/forums" className="hover:underline">Forums</Link>
          <Link href="/messages" className="hover:underline">
            Messages{renderBadge(badgeCounts.messages)}
          </Link>
          <Link href="/notifications" className="hover:underline">
            Notifications{renderBadge(badgeCounts.notifications)}
          </Link>
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Search">
                <Search className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Search</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Search by username, email, or opportunity title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Select
                    value={searchType}
                    onValueChange={(value) => setSearchType(value as "users" | "opportunities")}
                  >
                    <SelectTrigger className="sm:w-[180px]">
                      <SelectValue placeholder="Search type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">Users</SelectItem>
                      <SelectItem value="opportunities">Opportunities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-2">
                  {searching && <div className="text-sm text-muted-foreground">Searching...</div>}
                  {!searching && searchQuery.trim() === "" && (
                    <div className="text-sm text-muted-foreground">Start typing to search.</div>
                  )}
                  {!searching && searchQuery.trim() !== "" && searchResults.length === 0 && (
                    <div className="text-sm text-muted-foreground">No results yet.</div>
                  )}
                  {!searching &&
                    searchResults.map((item: any) => {
                      if (searchType === "users") {
                        const name = item.profile?.username || item.profile?.name || item.email;
                        return (
                          <Link
                            key={item.id}
                            href={`/users/${item.id}`}
                            className="flex flex-col rounded-md border px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => setSearchOpen(false)}
                          >
                            <span className="font-medium">{name}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.profile?.username ? `@${item.profile.username}` : item.email}
                            </span>
                          </Link>
                        );
                      }
                      return (
                        <Link
                          key={item.id}
                          href={`/opportunities/${item.id}`}
                          className="flex flex-col rounded-md border px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => setSearchOpen(false)}
                        >
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {item.summary || item.details || "View opportunity"}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="hover:underline">Theme</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="hover:underline">Profile</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/my-profile">My profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/activity">My activity</Link>
              </DropdownMenuItem>
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
