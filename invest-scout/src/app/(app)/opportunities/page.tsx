"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCcw, Search } from "lucide-react";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Opportunity = any;
type OpportunityPost = {
  id: string;
  title: string;
  description: string;
  askAmount?: number | null;
  benefits?: string | null;
  tags: string[];
  images: string[];
  locationName?: string | null;
  mapUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactUsername?: string | null;
  createdAt: string;
  user?: { email?: string | null; profile?: { username?: string | null } | null } | null;
};

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
  const [posts, setPosts] = useState<OpportunityPost[]>([]);
  const [query, setQuery] = useState("");
  const [exclude, setExclude] = useState("");
  const [tab, setTab] = useState<"ALL" | "SAVED" | "VERY_INTERESTED" | "INVESTED">("ALL");
  const [sort, setSort] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [postForm, setPostForm] = useState({
    title: "",
    description: "",
    askAmount: "",
    benefits: "",
    tags: "",
    locationName: "",
    mapUrl: "",
    contactEmail: "",
    contactPhone: "",
    contactUsername: "",
    images: [] as string[],
  });
  const [publishing, setPublishing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [res, postRes] = await Promise.all([
        fetch("/api/opportunities", { cache: "no-store", credentials: "include" }),
        fetch("/api/user/opportunity-posts", { cache: "no-store", credentials: "include" }),
      ]);

      if (res.status === 401 || postRes.status === 401) {
        toast.error("Please log in again.");
        window.location.href = "/login";
        return;
      }

      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      const data = isJson ? await res.json() : null;
      const postData = await postRes.json().catch(() => ({}));

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
      setPosts(postData.posts ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load opportunities");
    } finally {
      setLoading(false);
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
  }, [opps, query, tab, sort, exclude]);

  async function publishPost() {
    if (!postForm.title.trim() || !postForm.description.trim()) {
      toast.error("Add a title and description");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/user/opportunity-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: postForm.title,
          description: postForm.description,
          askAmount: postForm.askAmount === "" ? undefined : Number(postForm.askAmount),
          benefits: postForm.benefits,
          tags: postForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
          images: postForm.images,
          locationName: postForm.locationName,
          mapUrl: postForm.mapUrl,
          contactEmail: postForm.contactEmail,
          contactPhone: postForm.contactPhone,
          contactUsername: postForm.contactUsername,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Unable to publish");
        return;
      }
      setPostForm({
        title: "",
        description: "",
        askAmount: "",
        benefits: "",
        tags: "",
        locationName: "",
        mapUrl: "",
        contactEmail: "",
        contactPhone: "",
        contactUsername: "",
        images: [],
      });
      await load();
      toast.success("Opportunity posted");
    } catch (e) {
      console.error(e);
      toast.error("Unable to publish");
    } finally {
      setPublishing(false);
    }
  }

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
              <CardTitle>Post an opportunity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="e.g. Aerospace defense AI platform"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ask amount</Label>
                  <Input
                    value={postForm.askAmount}
                    onChange={(e) => setPostForm({ ...postForm, askAmount: e.target.value })}
                    type="number"
                    placeholder="500000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Details</Label>
                <Textarea
                  value={postForm.description}
                  onChange={(e) => setPostForm({ ...postForm, description: e.target.value })}
                  rows={4}
                  placeholder="Describe the opportunity, traction, timeline, and what you're looking for."
                />
              </div>

              <div className="space-y-2">
                <Label>Benefits</Label>
                <Textarea
                  value={postForm.benefits}
                  onChange={(e) => setPostForm({ ...postForm, benefits: e.target.value })}
                  rows={2}
                  placeholder="What investors/partners get: equity %, revenue share, strategic access, etc."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={postForm.tags}
                    onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                    placeholder="AI, aerospace, defense"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={postForm.locationName}
                    onChange={(e) => setPostForm({ ...postForm, locationName: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Map link</Label>
                  <Input
                    value={postForm.mapUrl}
                    onChange={(e) => setPostForm({ ...postForm, mapUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Contact email</Label>
                  <Input
                    value={postForm.contactEmail}
                    onChange={(e) => setPostForm({ ...postForm, contactEmail: e.target.value })}
                    placeholder="founder@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact phone</Label>
                  <Input
                    value={postForm.contactPhone}
                    onChange={(e) => setPostForm({ ...postForm, contactPhone: e.target.value })}
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact username</Label>
                  <Input
                    value={postForm.contactUsername}
                    onChange={(e) => setPostForm({ ...postForm, contactUsername: e.target.value })}
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Images</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, 4);
                    if (!files.length) return;
                    const readers = files.map(
                      (file) =>
                        new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
                          reader.readAsDataURL(file);
                        })
                    );
                    Promise.all(readers).then((images) => {
                      setPostForm((prev) => ({
                        ...prev,
                        images: [...prev.images, ...images.filter(Boolean)].slice(0, 6),
                      }));
                    });
                  }}
                />
                {postForm.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {postForm.images.map((img, idx) => (
                      <img
                        key={`${img}-${idx}`}
                        src={img}
                        alt="Upload preview"
                        className="h-20 w-24 rounded-md object-cover border"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={publishPost} disabled={publishing}>
                  {publishing ? "Publishing..." : "Publish to feed"}
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
              {posts.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Community opportunities</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {posts.map((post) => (
                      <Card key={post.id} className="space-y-2">
                        <CardHeader className="space-y-2">
                          <CardTitle className="text-base">{post.title}</CardTitle>
                          <div className="text-xs text-muted-foreground">
                            Posted {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {post.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {post.images.slice(0, 4).map((img, idx) => (
                                <img
                                  key={`${post.id}-img-${idx}`}
                                  src={img}
                                  alt={post.title}
                                  className="h-24 w-full rounded-md object-cover border"
                                  loading="lazy"
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">{post.description}</p>
                          {post.benefits && (
                            <div className="text-sm">
                              <span className="font-medium">Benefits:</span> {post.benefits}
                            </div>
                          )}
                          {post.askAmount ? (
                            <div className="text-sm">
                              <span className="font-medium">Ask:</span> ${post.askAmount.toLocaleString()}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {post.tags.map((tag) => (
                              <span key={`${post.id}-${tag}`} className="rounded-full border px-2 py-1">
                                {tag}
                              </span>
                            ))}
                          </div>
                          {(post.locationName || post.mapUrl) && (
                            <div className="text-sm text-muted-foreground">
                              {post.locationName}
                              {post.mapUrl && (
                                <a className="ml-2 underline" href={post.mapUrl} target="_blank" rel="noreferrer">
                                  Map
                                </a>
                              )}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground space-y-1">
                            {post.contactEmail && <div>Email: {post.contactEmail}</div>}
                            {post.contactPhone && <div>Phone: {post.contactPhone}</div>}
                            {post.contactUsername && <div>Username: {post.contactUsername}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
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
