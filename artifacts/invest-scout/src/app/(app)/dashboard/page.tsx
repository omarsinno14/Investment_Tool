import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart2,
  Bell,
  BookOpen,
  Globe,
  RefreshCcw,
  Rss,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type Interest = { type: string; value: string };

function timeAgo(d?: string | null) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: "Opportunities", href: "/opportunities" },
  { icon: Rss, label: "News", href: "/headlines" },
  { icon: BookOpen, label: "Forums", href: "/forums" },
  { icon: BarChart2, label: "Portfolio", href: "/portfolio" },
  { icon: Users, label: "Investors", href: "/users" },
  { icon: Bell, label: "Alerts", href: "/notifications" },
];

function QuickActionCard({ icon: Icon, label, href }: { icon: any; label: string; href: string }) {
  return (
    <Link href={href}>
      <div className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-all hover:border-primary/40 hover:bg-primary/5 cursor-pointer">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [communityOpps, setCommunityOpps] = useState<any[]>([]);
  const [headlines, setHeadlines] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [pRes, iRes, oRes, hRes] = await Promise.all([
        fetch("/api/user/profile", { credentials: "include" }),
        fetch("/api/user/interests", { credentials: "include" }),
        fetch("/api/opportunities?type=community&limit=8", { credentials: "include" }),
        fetch("/api/headlines?limit=6", { credentials: "include" }),
      ]);

      if ([pRes, iRes, oRes].some((r) => r.status === 401)) {
        window.location.href = "/login";
        return;
      }

      const [p, i, o, h] = await Promise.all([
        pRes.json().catch(() => ({})),
        iRes.json().catch(() => ({})),
        oRes.json().catch(() => ({})),
        hRes.json().catch(() => ({})),
      ]);

      setProfile(p.profile ?? null);
      setInterests(i.interests ?? []);
      setCommunityOpps(o.opportunities ?? []);
      setHeadlines(h.headlines ?? []);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const focus = useMemo(() => ({
    countries: interests.filter((x) => x.type === "COUNTRY").map((x) => x.value),
    sectors: interests.filter((x) => x.type === "SECTOR" || x.type === "ASSET_CLASS").map((x) => x.value),
    total: interests.length,
  }), [interests]);

  const setupPct = useMemo(() => {
    const checks = [focus.total > 0, Boolean(profile?.name), communityOpps.length > 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [focus.total, profile, communityOpps.length]);

  const name = profile?.name ?? "Investor";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      {/* ── Hero ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-border">
            <AvatarImage src={profile?.imageUrl} />
            <AvatarFallback className="bg-foreground text-background font-semibold text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">{getGreeting()}</p>
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="self-start sm:self-auto">
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {QUICK_ACTIONS.map((a) => <QuickActionCard key={a.href} {...a} />)}
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">

          {/* Latest News */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <Rss className="h-4 w-4 text-accent" />
                <CardTitle className="text-sm font-semibold">Latest News</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/headlines">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-[88%]" />
                      <Skeleton className="h-3 w-[40%]" />
                    </div>
                  </div>
                ))
              ) : headlines.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Rss className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">No news yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add interests to get personalised headlines.</p>
                  </div>
                  <Button asChild size="sm" variant="outline"><Link href="/interests">Set interests</Link></Button>
                </div>
              ) : (
                headlines.map((h: any, idx) => (
                  <a
                    key={h.id ?? idx}
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {h.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {h.source && <span className="font-medium text-accent">{h.source}</span>}
                        {h.fetchedAt && <><span>·</span><span>{timeAgo(h.fetchedAt)}</span></>}
                      </div>
                    </div>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Opportunities</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/opportunities">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-[85%]" />
                      <Skeleton className="h-3 w-[45%]" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))
              ) : communityOpps.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">No opportunities yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Set your interests to see matched deals.</p>
                  </div>
                  <Button asChild size="sm"><Link href="/interests">Pick interests</Link></Button>
                </div>
              ) : (
                communityOpps.slice(0, 6).map((o: any) => (
                  <Link key={o.id} href={`/opportunities/${o.id}`}>
                    <div className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40 cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {o.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {o.source && <span>{o.source}</span>}
                          {o.tags?.[0] && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{o.tags[0]}</Badge>}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">New</Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Onboarding */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Getting started</CardTitle>
              <p className="text-xs text-muted-foreground">{setupPct}% complete</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? <Skeleton className="h-1.5 w-full rounded-full" /> : <Progress value={setupPct} className="h-1.5" />}
              <div className="space-y-2 text-sm">
                {[
                  { label: "Set interests", done: focus.total > 0, href: "/interests" },
                  { label: "Complete profile", done: Boolean(profile?.name), href: "/settings" },
                  { label: "Explore opportunities", done: communityOpps.length > 0, href: "/opportunities" },
                ].map((item) => (
                  <Link key={item.label} href={item.href}>
                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${item.done ? "text-muted-foreground" : "hover:bg-muted/40 cursor-pointer"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${item.done ? "bg-primary" : "bg-border"}`} />
                        <span className={item.done ? "line-through opacity-60" : ""}>{item.label}</span>
                      </div>
                      {!item.done && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Your interests</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/interests">Edit</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}
                </div>
              ) : focus.total === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">No interests set yet.</p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link href="/interests">Add interests</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {[...focus.countries.slice(0, 4), ...focus.sectors.slice(0, 4)].map((v, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">{v}</Badge>
                  ))}
                  {focus.total > 8 && (
                    <Badge variant="outline" className="text-xs">+{focus.total - 8} more</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Explore */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Explore</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {[
                { label: "Portfolio tracker", href: "/portfolio" },
                { label: "Cash flow", href: "/cashflow" },
                { label: "Goals", href: "/goals" },
                { label: "Journal", href: "/journal" },
                { label: "Financial ratios", href: "/ratios" },
                { label: "Tools", href: "/tools" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 cursor-pointer">
                    <span>{item.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
