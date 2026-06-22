

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type SearchResults = {
  opportunities: any[];
  users: any[];
  hubs: any[];
  posts: any[];
};

const EMPTY: SearchResults = { opportunities: [], users: [], hubs: [], posts: [] };

function initials(name?: string | null, email?: string | null) {
  const base = (name ?? email ?? "").trim();
  if (!base) return "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    setTouched(true);
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error("Failed to search");
        setResults({
          opportunities: data.opportunities ?? [],
          users: data.users ?? [],
          hubs: data.hubs ?? [],
          posts: data.posts ?? [],
        });
      } catch (e) {
        console.error(e);
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const totalCount =
    results.opportunities.length +
    results.users.length +
    results.hubs.length +
    results.posts.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find opportunities, members, circles, and discussions across Vertica.
        </p>
      </div>

      <div className="relative w-full md:max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          className="pl-9"
          placeholder="Search Vertica..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[70%]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !query.trim() ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Start typing to search across Vertica.
          </CardContent>
        </Card>
      ) : touched && totalCount === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-lg font-semibold">No results</div>
            <div className="text-muted-foreground">Try a different keyword or check your spelling.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {results.opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.opportunities.map((o) => (
                  <Link
                    key={o.id}
                    href={`/opportunities/${o.id}`}
                    className="block rounded-md border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="font-medium">{o.title}</div>
                    {(o.companyName || o.summary) && (
                      <div className="line-clamp-1 text-sm text-muted-foreground">
                        {o.companyName ?? o.summary}
                      </div>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {results.users.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/users/${u.id}`}
                    className="flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.profile?.imageUrl ?? undefined} />
                      <AvatarFallback>{initials(u.profile?.name, u.email)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.profile?.name ?? u.email}</div>
                      {u.profile?.username && (
                        <div className="truncate text-sm text-muted-foreground">@{u.profile.username}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {results.hubs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Circles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.hubs.map((h) => (
                  <Link
                    key={h.id}
                    href={`/hubs/${h.slug}`}
                    className="block rounded-md border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="font-medium">{h.name}</div>
                    {h.description && (
                      <div className="line-clamp-1 text-sm text-muted-foreground">{h.description}</div>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {results.posts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/forums/${p.id}`}
                    className="block rounded-md border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="font-medium">{p.title}</div>
                    {p.body && (
                      <div className="line-clamp-1 text-sm text-muted-foreground">{p.body}</div>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
