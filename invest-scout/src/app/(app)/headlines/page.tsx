"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NAV_BADGE_KEYS, markNavSeen } from "@/lib/nav-badges";

type Opportunity = any;

type TabKey = "for-you" | "top";

function toDateValue(o: any) {
  const d = o.publishedAt ?? o.fetchedAt;
  const t = d ? new Date(d).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

export default function HeadlinesPage() {
  const [loading, setLoading] = useState(true);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("for-you");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  async function load(reset = false) {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const params = new URLSearchParams({ type: "headlines", tab });
      if (!reset && cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/opportunities?${params.toString()}`, { cache: "no-store", credentials: "include" });

      if (res.status === 401) {
        toast.error("Please log in again.");
        window.location.href = "/login";
        return;
      }

      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      const data = isJson ? await res.json() : null;

      if (!res.ok) {
        const errMsg = isJson
          ? data?.error || "Failed to load headlines"
          : `Unexpected response (${ct})`;
        throw new Error(errMsg);
      }

      if (!isJson) {
        const txt = await res.text();
        throw new Error(`Expected JSON, got ${ct}. ${txt.slice(0, 200)}`);
      }

      setOpps((prev) => (reset ? data.opportunities ?? [] : [...prev, ...(data.opportunities ?? [])]));
      setCursor(data.nextCursor ?? null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load headlines");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    markNavSeen(NAV_BADGE_KEYS.headlines);
    load(true);
  }, [tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = opps;
    if (q) {
      list = list.filter((o: any) => `${o.title ?? ""} ${o.summary ?? ""}`.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => toDateValue(b) - toDateValue(a));
  }, [opps, query]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 320,
    overscan: 5,
  });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!cursor || loadingMore || query.trim()) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
        load(false);
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [cursor, loadingMore, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">News</h1>
          <p className="text-sm text-muted-foreground">
            Fresh market headlines, matched to your interests and region.
          </p>
        </div>
        <Button variant="outline" onClick={() => load(true)} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
          <TabsList>
            <TabsTrigger value="for-you">For you</TabsTrigger>
            <TabsTrigger value="top">Top</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative md:w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search news..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[55%]" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-[95%]" />
                <Skeleton className="h-4 w-[85%]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No headlines match your search yet.
          </CardContent>
        </Card>
      ) : (
        <div ref={listRef} className="max-h-[70vh] overflow-y-auto">
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const opp = filtered[virtualRow.index];
              if (!opp) return null;
              return (
                <div
                  key={opp.id}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: "16px",
                  }}
                >
                  <OpportunityCard opp={opp} onActionUpdated={() => load(true)} />
                </div>
              );
            })}
          </div>
          {loadingMore && (
            <div className="py-4 text-center text-sm text-muted-foreground">Loading more...</div>
          )}
        </div>
      )}
    </div>
  );
}
