"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RefreshCcw, Search } from "lucide-react";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Opportunity = any;

function toDateValue(o: any) {
  const d = o.publishedAt ?? o.fetchedAt;
  const t = d ? new Date(d).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function tokenizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length >= 4)
    .filter(
      (w) =>
        ![
          "from",
          "with",
          "that",
          "this",
          "your",
          "will",
          "into",
          "over",
          "more",
          "than",
          "after",
          "before",
          "today",
          "latest",
          "about",
          "could",
        ].includes(w)
    );
}

export default function OpportunitiesPage() {
  const [loading, setLoading] = useState(true);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [query, setQuery] = useState("");
  const [exclude, setExclude] = useState("");
  const [tab, setTab] = useState<"ALL" | "SAVED" | "VERY_INTERESTED" | "INVESTED">("ALL");
  const [sort, setSort] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [posting, setPosting] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "",
    summary: "",
    details: "",
    askAmount: "",
    benefits: "",
    tags: "",
    locationName: "",
    locationMapUrl: "",
    contactEmail: "",
    contactPhone: "",
    contactUsername: "",
    images: [] as File[],
  });
  const uploadRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/opportunities", { cache: "no-store", credentials: "include" });

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
          ? data?.error || "Failed to load opportunities"
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
      toast.error("Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }

  async function submitPost() {
    if (!postForm.title.trim()) {
      toast.error("Add a title for your opportunity");
      return;
    }
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("title", postForm.title);
      formData.append("summary", postForm.summary);
      formData.append("details", postForm.details);
      formData.append("askAmount", postForm.askAmount);
      formData.append("benefits", postForm.benefits);
      formData.append("tags", postForm.tags);
      formData.append("locationName", postForm.locationName);
      formData.append("locationMapUrl", postForm.locationMapUrl);
      formData.append("contactEmail", postForm.contactEmail);
      formData.append("contactPhone", postForm.contactPhone);
      formData.append("contactUsername", postForm.contactUsername);
      postForm.images.forEach((file) => formData.append("images", file));

      const res = await fetch("/api/user/opportunities", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to post");
      }
      toast.success("Opportunity posted to the feed");
      setPostForm({
        title: "",
        summary: "",
        details: "",
        askAmount: "",
        benefits: "",
        tags: "",
        locationName: "",
        locationMapUrl: "",
        contactEmail: "",
        contactPhone: "",
        contactUsername: "",
        images: [],
      });
      if (uploadRef.current) uploadRef.current.value = "";
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to post opportunity");
    } finally {
      setPosting(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = exclude
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    let list = opps;

    if (tab !== "ALL") {
      list = list.filter((o: any) => (o.action?.state ?? "NONE") === tab);
    }

    if (q) {
      list = list.filter((o: any) => {
        const hay = `${o.title ?? ""} ${o.summary ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (excluded.length) {
      list = list.filter((o: any) => {
        const hay = `${o.title ?? ""} ${o.summary ?? ""}`.toLowerCase();
        return !excluded.some((term) => term.length >= 2 && hay.includes(term));
      });
    }

    list = [...list].sort((a, b) =>
      sort === "NEWEST" ? toDateValue(b) - toDateValue(a) : toDateValue(a) - toDateValue(b)
    );

    return list;
  }, [opps, query, tab, sort]);

  const kpis = useMemo(() => {
    const total = opps.length;
    const saved = opps.filter((o: any) => o.action?.state === "SAVED").length;
    const interested = opps.filter((o: any) => o.action?.state === "VERY_INTERESTED").length;
    const invested = opps.filter((o: any) => o.action?.state === "INVESTED").length;

    const investedAmt = opps
      .filter((o: any) => o.action?.state === "INVESTED")
      .reduce((sum: number, o: any) => sum + (Number(o.action?.investedAmt) || 0), 0);

    const last = opps.map((o: any) => toDateValue(o)).reduce((m: number, v: number) => Math.max(m, v), 0);

    return {
      total,
      saved,
      interested,
      invested,
      investedAmt,
      lastUpdated: last ? new Date(last).toLocaleString() : "—",
    };
  }, [opps]);

  const insights = useMemo(() => {
    const topicCount = new Map<string, number>();
    const sourceCount = new Map<string, number>();

    for (const o of opps) {
      const src = (o.source ?? "Unknown") as string;
      sourceCount.set(src, (sourceCount.get(src) ?? 0) + 1);

      const words = tokenizeTitle(o.title ?? "");
      for (const w of words.slice(0, 10)) {
        topicCount.set(w, (topicCount.get(w) ?? 0) + 1);
      }
    }

    const topTopics = [...topicCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topSources = [...sourceCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    return { topTopics, topSources };
  }, [opps]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground">
            A live feed matched to your interests. Save, track, and mark investments.
          </p>
        </div>

        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Matched</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">{kpis.total}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Saved</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">{kpis.saved}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Interested</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">{kpis.interested}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Invested</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">{kpis.invested}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Invested $</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">
            {kpis.investedAmt.toLocaleString()}
          </CardContent>
        </Card>
      </div>

      {/* Controls + Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post an opportunity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Input
                  placeholder="Title"
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Input
                  placeholder="Short summary"
                  value={postForm.summary}
                  onChange={(e) => setPostForm({ ...postForm, summary: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Textarea
                  placeholder="Details / explanation"
                  value={postForm.details}
                  onChange={(e) => setPostForm({ ...postForm, details: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Ask amount"
                  value={postForm.askAmount}
                  onChange={(e) => setPostForm({ ...postForm, askAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Textarea
                  placeholder="Benefits"
                  value={postForm.benefits}
                  onChange={(e) => setPostForm({ ...postForm, benefits: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Input
                  placeholder="Tags (comma-separated)"
                  value={postForm.tags}
                  onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Location"
                  value={postForm.locationName}
                  onChange={(e) => setPostForm({ ...postForm, locationName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Map link (optional)"
                  value={postForm.locationMapUrl}
                  onChange={(e) => setPostForm({ ...postForm, locationMapUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Contact email"
                  value={postForm.contactEmail}
                  onChange={(e) => setPostForm({ ...postForm, contactEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Contact phone"
                  value={postForm.contactPhone}
                  onChange={(e) => setPostForm({ ...postForm, contactPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Input
                  placeholder="Contact username"
                  value={postForm.contactUsername}
                  onChange={(e) => setPostForm({ ...postForm, contactUsername: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Input
                  ref={uploadRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setPostForm({ ...postForm, images: Array.from(e.target.files ?? []) })}
                />
                {postForm.images.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {postForm.images.length} image(s) selected
                  </div>
                )}
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={submitPost} disabled={posting}>
                  {posting ? "Publishing..." : "Publish to feed"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:w-[640px]">
              <div className="relative md:w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search titles & summaries..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Input
                placeholder="Exclude keywords (comma-separated)"
                value={exclude}
                onChange={(e) => setExclude(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant={tab === "ALL" ? "default" : "outline"} size="sm" onClick={() => setTab("ALL")}>
                All
              </Button>
              <Button variant={tab === "SAVED" ? "default" : "outline"} size="sm" onClick={() => setTab("SAVED")}>
                Saved
              </Button>
              <Button
                variant={tab === "VERY_INTERESTED" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("VERY_INTERESTED")}
              >
                Interested
              </Button>
              <Button
                variant={tab === "INVESTED" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("INVESTED")}
              >
                Invested
              </Button>

              <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEWEST">Newest</SelectItem>
                  <SelectItem value="OLDEST">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[55%]" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[85%]" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((opp: any) => (
                  <OpportunityCard key={opp.id} opp={opp} onActionUpdated={load} />
                ))}
              </div>

              {filtered.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center space-y-2">
                    <div className="text-lg font-semibold">Nothing here yet</div>
                    <div className="text-muted-foreground">
                      Pick more interests, then run the ingestion worker to pull fresh headlines.
                    </div>
                    <div className="pt-2">
                      <Button asChild>
                        <a href="/interests">Go to Interests</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Insights sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Last updated</div>
                <div className="text-sm text-muted-foreground">{kpis.lastUpdated}</div>
              </div>

              <div>
                <div className="text-sm font-medium">Top topics</div>
                <div className="mt-2 space-y-1">
                  {insights.topTopics.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data yet</div>
                  ) : (
                    insights.topTopics.map(([w, n]) => (
                      <div key={w} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{w}</span>
                        <span className="font-medium">{n}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Sources</div>
                <div className="mt-2 space-y-1">
                  {insights.topSources.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data yet</div>
                  ) : (
                    insights.topSources.map(([s, n]) => (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground line-clamp-1">{s}</span>
                        <span className="font-medium">{n}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Make it smarter next</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <div>• Add a signal score (source quality + novelty + fit).</div>
              <div>• Add charts (weekly volume, saved vs invested).</div>
              <div>• Add alerts when saved items get follow-up news.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
