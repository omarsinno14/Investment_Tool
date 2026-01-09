"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { DisclosureBanner } from "@/components/app/DisclosureBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Opportunity = any;

function toDateValue(o: any) {
  const d = o.publishedAt ?? o.fetchedAt;
  const t = d ? new Date(d).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

export default function HeadlinesPage() {
  const [loading, setLoading] = useState(true);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/opportunities?type=headlines", { cache: "no-store", credentials: "include" });

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

      setOpps(data.opportunities ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load headlines");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = opps;
    if (q) {
      list = list.filter((o: any) => `${o.title ?? ""} ${o.summary ?? ""}`.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => toDateValue(b) - toDateValue(a));
  }, [opps, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Headlines</h1>
          <p className="text-muted-foreground">Scraped news and investment headlines.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <DisclosureBanner />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search headlines..."
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((opp: any) => (
            <OpportunityCard key={opp.id} opp={opp} onActionUpdated={load} />
          ))}
        </div>
      )}
    </div>
  );
}
