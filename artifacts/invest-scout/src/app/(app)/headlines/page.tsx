import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCcw, Search, Rss, Clock, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NAV_BADGE_KEYS, markNavSeen } from "@/lib/nav-badges";

interface HeadlineItem {
  id: string;
  title: string;
  url?: string;
  summary?: string;
  source?: string;
  fetchedAt?: string;
  tags?: string[];
  countryTags?: string[];
}

function timeAgo(d?: string) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function HeadlineCard({ item }: { item: HeadlineItem }) {
  const tags = [...(item.countryTags ?? []), ...(item.tags ?? [])].slice(0, 3);

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = item.url ?? "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: item.title, text: item.summary ?? undefined, url: shareUrl });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
        return;
      }
      toast.error("Sharing is not supported on this device");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      toast.error("Unable to share");
    }
  }

  return (
    <div className="group relative rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={item.title}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Source + time */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
              <Rss className="h-3 w-3" />
              {item.source ?? "News"}
            </span>
            {item.fetchedAt && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timeAgo(item.fetchedAt)}
                </span>
              </>
            )}
          </div>

          {/* Headline */}
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>

          {/* Summary */}
          {item.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] font-normal px-2 py-0">{t}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share headline"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <ExternalLink className="mt-0.5 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-3 w-[75%]" />
      <Skeleton className="h-3 w-[60%]" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export default function HeadlinesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HeadlineItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [activeSource, setActiveSource] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/headlines?limit=80", { credentials: "include" });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load headlines");
      setItems(data.headlines ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load headlines");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    markNavSeen(NAV_BADGE_KEYS.headlines);
    load();
  }, []);

  const sources = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) {
      const s = i.source ?? "Unknown";
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const displayedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (activeSource && i.source !== activeSource) return false;
      if (q && !`${i.title} ${i.summary ?? ""} ${i.source ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, activeSource]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rss className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">News</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Live investment headlines from {sources.length} sources{total > 0 ? ` · ${total} articles` : ""}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search headlines…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Source filter pills */}
      {!loading && sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveSource(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!activeSource ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}
          >
            All sources
          </button>
          {sources.map(([src, count]) => (
            <button
              key={src}
              onClick={() => setActiveSource(activeSource === src ? null : src)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${activeSource === src ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}
            >
              {src} <span className="opacity-50">({count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Rss className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">No headlines found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {query ? "Try a different search term." : "Pull down to refresh or set interests to personalise."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>Refresh feed</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayedItems.map((item, i) => (
            <HeadlineCard key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
