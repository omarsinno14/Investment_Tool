"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Bookmark,
  Globe,
  Layers3,
  RefreshCcw,
  Settings,
  Star,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
// Optional (only if you installed them)
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisclosureBanner } from "@/components/app/DisclosureBanner";

type Opportunity = any;
type Interest = { type: string; value: string };

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [pRes, iRes, oRes] = await Promise.all([
        fetch("/api/user/profile", { cache: "no-store" }),
        fetch("/api/user/interests", { cache: "no-store" }),
        fetch("/api/opportunities?type=community", { cache: "no-store" }),
      ]);

      if (pRes.status === 401 || iRes.status === 401 || oRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      const p = await pRes.json().catch(() => ({}));
      const i = await iRes.json().catch(() => ({}));
      const o = await oRes.json().catch(() => ({}));

      setProfile(p.profile ?? null);
      setInterests(i.interests ?? []);
      setOpps(o.opportunities ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    const total = opps.length;
    const saved = opps.filter((o: any) => o.action?.state === "SAVED").length;
    const interested = opps.filter((o: any) => o.action?.state === "VERY_INTERESTED").length;
    const invested = opps.filter((o: any) => o.action?.state === "INVESTED").length;

    const investedAmt = opps
      .filter((o: any) => o.action?.state === "INVESTED")
      .reduce((sum: number, o: any) => sum + (Number(o.action?.investedAmt) || 0), 0);

    const lastUpdatedMs = opps
      .map((o: any) => {
        const d = o.publishedAt ?? o.fetchedAt;
        const t = d ? new Date(d).getTime() : 0;
        return Number.isFinite(t) ? t : 0;
      })
      .reduce((m: number, v: number) => Math.max(m, v), 0);

    const lastUpdated = lastUpdatedMs ? new Date(lastUpdatedMs).toLocaleString() : "—";

    return { total, saved, interested, invested, investedAmt, lastUpdated };
  }, [opps]);

  const focus = useMemo(() => {
    const countries = interests.filter((x) => x.type === "COUNTRY").map((x) => x.value);
    const sectors = interests.filter((x) => x.type === "SECTOR").map((x) => x.value);
    const industries = interests.filter((x) => x.type === "INDUSTRY").map((x) => x.value);
    const custom = interests.filter((x) => x.type === "CUSTOM").map((x) => x.value);

    return {
      countries,
      sectors,
      industries,
      custom,
      total: interests.length,
    };
  }, [interests]);

  const recentOpps = useMemo(() => {
    const sorted = [...opps].sort((a: any, b: any) => {
      const ta = new Date(a.publishedAt ?? a.fetchedAt ?? 0).getTime() || 0;
      const tb = new Date(b.publishedAt ?? b.fetchedAt ?? 0).getTime() || 0;
      return tb - ta;
    });
    return sorted.slice(0, 6);
  }, [opps]);

  const setupProgress = useMemo(() => {
    // “good enough” onboarding indicator
    // 1) has interests  2) has invest amount  3) has at least 10 opportunities in feed
    const hasInterests = focus.total > 0;
    const hasAmount = Number(profile?.investAmount ?? 0) > 0;
    const hasFeed = opps.length >= 10;

    const score = [hasInterests, hasAmount, hasFeed].filter(Boolean).length;
    return {
      score,
      pct: Math.round((score / 3) * 100),
      hasInterests,
      hasAmount,
      hasFeed,
    };
  }, [focus.total, profile?.investAmount, opps.length]);

  const name = profile?.name ?? "Investor";
  const imageUrl = profile?.imageUrl ?? "";

  return (
    <div className="space-y-6">
      {/* Top header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          {/* Optional Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={imageUrl} alt={name} />
            <AvatarFallback>{String(name).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, <span className="text-foreground">{name}</span>. Your feed is updating continuously.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <DisclosureBanner />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Layers3 className="h-4 w-4" /> Matched
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">
            {loading ? <Skeleton className="h-8 w-16" /> : kpis.total}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Bookmark className="h-4 w-4" /> Saved
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">
            {loading ? <Skeleton className="h-8 w-16" /> : kpis.saved}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> Interested
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">
            {loading ? <Skeleton className="h-8 w-16" /> : kpis.interested}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Invested $
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">
            {loading ? <Skeleton className="h-8 w-24" /> : formatMoney(kpis.investedAmt)}
          </CardContent>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Recent activity */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recent opportunities</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Latest matches from your selected interests.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/opportunities">
                  View all <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start justify-between gap-3">
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-4 w-[85%]" />
                        <Skeleton className="h-3 w-[45%]" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : recentOpps.length === 0 ? (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="font-medium">Your feed is empty</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Add interests, then run ingestion so opportunities start appearing.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild>
                      <Link href="/interests">Pick interests</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/opportunities">Open feed</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {recentOpps.map((o: any) => {
                    const state = o.action?.state ?? "NONE";
                    return (
                      <div key={o.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            href={`/opportunities/${o.id}`}
                            className="block font-medium leading-snug hover:underline line-clamp-2"
                          >
                            {o.title}
                          </Link>
                          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                            <span>{o.source ?? "Unknown source"}</span>
                            <span>•</span>
                            <span>{formatDate(o.publishedAt ?? o.fetchedAt)}</span>
                          </div>
                        </div>

                        {state !== "NONE" ? <Badge>{state}</Badge> : <Badge variant="secondary">New</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Focus overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your focus</CardTitle>
              <p className="text-sm text-muted-foreground">
                What you’re currently tracking (interests drive matching).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[60%]" />
                  <Skeleton className="h-4 w-[75%]" />
                  <Skeleton className="h-4 w-[50%]" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(focus.countries.slice(0, 6)).map((x) => (
                      <Badge key={`c-${x}`} variant="secondary">
                        <Globe className="h-3 w-3 mr-1" /> {x}
                      </Badge>
                    ))}
                    {(focus.sectors.slice(0, 6)).map((x) => (
                      <Badge key={`s-${x}`} variant="secondary">
                        {x}
                      </Badge>
                    ))}
                    {(focus.custom.slice(0, 6)).map((x) => (
                      <Badge key={`k-${x}`} variant="outline">
                        {x}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{focus.total} interests selected</span>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/interests">Edit interests</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Setup / Onboarding */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup status</CardTitle>
              <p className="text-sm text-muted-foreground">
                Finish these basics and your feed becomes way better.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <>
                  <Progress value={setupProgress.pct} />
                  <div className="text-sm text-muted-foreground">
                    {setupProgress.pct}% complete • Last update: {kpis.lastUpdated}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Pick interests</span>
                      {setupProgress.hasInterests ? <Badge>Done</Badge> : <Badge variant="secondary">Missing</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Set invest amount</span>
                      {setupProgress.hasAmount ? <Badge>Done</Badge> : <Badge variant="secondary">Missing</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Build feed (10+ items)</span>
                      {setupProgress.hasFeed ? <Badge>Done</Badge> : <Badge variant="secondary">Missing</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button asChild size="sm">
                      <Link href="/interests">Interests</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/settings">Profile</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/opportunities">Feed</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your most common next steps.
              </p>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="justify-between">
                <Link href="/opportunities">
                  Review opportunities <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/news">
                  Browse news <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/interests">
                  Add / refine interests <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/settings">
                  Update profile settings <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
