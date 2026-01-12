"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type UserResult = {
  id: string;
  email: string;
  profile?: {
    name?: string | null;
    username?: string | null;
    imageUrl?: string | null;
  } | null;
};

export default function UsersSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`, {
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to search users");
        setResults(data.users ?? []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to search users");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find people</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search by username or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <div className="text-sm text-muted-foreground">Searching...</div>}
        </CardContent>
      </Card>

      {results.length === 0 && query.trim() && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No matching users found.</CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((user) => {
            const displayName =
              user.profile?.username || user.profile?.name || user.email || "User";
            return (
              <Card key={user.id}>
                <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.profile?.imageUrl || undefined} alt={displayName} />
                      <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.profile?.username ? `@${user.profile.username}` : user.email}
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/users/${user.id}`}>View profile</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
