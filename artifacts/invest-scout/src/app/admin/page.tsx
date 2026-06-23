import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Ban,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck,
  Flag,
  Globe2,
  HeartPulse,
  Lightbulb,
  LifeBuoy,
  Megaphone,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

/* ------------------------------- helpers ---------------------------------- */

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function apiSend(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? `${res.status}`);
  return data;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtRelative(d?: string | null) {
  if (!d) return "—";
  const then = new Date(d).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

function fmtMoney(n?: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

/* ------------------------------- types ------------------------------------ */

type Analytics = {
  users: { total: number; newDay: number; newWeek: number; newMonth: number; newYear: number };
  activeUsers: { day: number; week: number };
  hours: { total: number; day: number; week: number; month: number; year: number };
  content: { opportunities: number; forumPosts: number; hubPosts: number; messages: number; comments: number; reactions: number };
  interactions: number;
  pending: { reports: number; verifications: number };
  signupSeries: { date: string; count: number }[];
};

type AdminUser = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  deactivatedAt: string | null;
  bannedAt: string | null;
  banReason: string | null;
  restrictedAt: string | null;
  restrictReason: string | null;
  profile?: {
    name?: string | null;
    username?: string | null;
    imageUrl?: string | null;
    country?: string | null;
    city?: string | null;
    identityVerified?: boolean | null;
    emailVerified?: boolean | null;
  } | null;
};

/* ----------------------------- stat tiles --------------------------------- */

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Overview ---------------------------------- */

function OverviewTab() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Analytics>("/api/admin/analytics")
      .then(setData)
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const maxSignup = useMemo(() => Math.max(1, ...(data?.signupSeries ?? []).map((s) => s.count)), [data]);

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Users className="h-5 w-5" />} label="Total Users" value={data.users.total} sub={`+${data.users.newWeek} this week`} />
        <Stat icon={<Activity className="h-5 w-5" />} label="Active (24h)" value={data.activeUsers.day} sub={`${data.activeUsers.week} this week`} />
        <Stat icon={<Clock className="h-5 w-5" />} label="Total Hours" value={data.hours.total} sub={`${data.hours.day}h today`} />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="Interactions" value={data.interactions} sub="posts · msgs · reactions" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Users className="h-5 w-5" />} label="New Today" value={data.users.newDay} />
        <Stat icon={<Users className="h-5 w-5" />} label="New This Month" value={data.users.newMonth} />
        <Stat icon={<Flag className="h-5 w-5" />} label="Open Reports" value={data.pending.reports} />
        <Stat icon={<BadgeCheck className="h-5 w-5" />} label="Pending Verifications" value={data.pending.verifications} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Signups — last 30 days</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-1">
            {data.signupSeries.map((s) => (
              <div key={s.date} className="group relative flex flex-1 flex-col items-center justify-end">
                <div
                  className="w-full rounded-t bg-primary/80 transition-all group-hover:bg-primary"
                  style={{ height: `${(s.count / maxSignup) * 100}%`, minHeight: s.count ? "4px" : "0" }}
                  title={`${s.date}: ${s.count}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Engagement hours</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[["Today", data.hours.day], ["Week", data.hours.week], ["Month", data.hours.month], ["Year", data.hours.year]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p>
              <p className="text-xl font-bold">{v}h</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------- Users ----------------------------------- */

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      const data = await apiGet<{ users: AdminUser[] }>(`/api/admin/users?${params}`);
      setUsers(data.users);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(u: AdminUser, action: string, withReason = false) {
    try {
      await apiSend(`/api/admin/users/${u.id}`, "PATCH", { action, reason: withReason ? reason : undefined });
      toast.success(`User ${action} done`);
      setReason("");
      setSelected(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(u: AdminUser) {
    if (!confirm(`Permanently delete ${u.email}? This cannot be undone.`)) return;
    try {
      await apiSend(`/api/admin/users/${u.id}`, "DELETE");
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => { e.preventDefault(); load(); }}
          className="relative flex-1 min-w-[220px]"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username, email" className="pl-9" />
        </form>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">
                    {(u.profile?.name ?? u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold">{u.profile?.name ?? u.email}</p>
                      {u.profile?.identityVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{u.email} · {fmtDate(u.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {u.role === "ADMIN" && <Badge className="bg-foreground text-background">Admin</Badge>}
                  {u.bannedAt && <Badge variant="destructive">Banned</Badge>}
                  {u.restrictedAt && <Badge variant="secondary">Restricted</Badge>}
                  {u.deactivatedAt && <Badge variant="outline">Deactivated</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {u.bannedAt
                    ? <Button size="sm" variant="outline" onClick={() => act(u, "unban")}>Unban</Button>
                    : <Button size="sm" variant="outline" onClick={() => { setSelected(u); }}><Ban className="mr-1 h-3.5 w-3.5" />Ban</Button>}
                  {u.restrictedAt
                    ? <Button size="sm" variant="outline" onClick={() => act(u, "unrestrict")}>Unrestrict</Button>
                    : <Button size="sm" variant="outline" onClick={() => act(u, "restrict")}>Restrict</Button>}
                  {u.role === "ADMIN"
                    ? <Button size="sm" variant="outline" onClick={() => act(u, "demote")}><UserCog className="mr-1 h-3.5 w-3.5" />Demote</Button>
                    : <Button size="sm" variant="outline" onClick={() => act(u, "promote")}><Shield className="mr-1 h-3.5 w-3.5" />Promote</Button>}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {users.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ban {selected?.profile?.name ?? selected?.email}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason (shown in records)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for ban" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => selected && act(selected, "ban", true)}>Confirm Ban</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------- Hubs ------------------------------------ */

type AdminHub = { id: string; name: string; slug: string; description?: string | null; isPrivate: boolean; _count?: { memberships: number; posts: number } };

function HubsTab() {
  const [hubs, setHubs] = useState<AdminHub[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ hubs: AdminHub[] }>("/api/admin/hubs");
      setHubs(data.hubs);
    } catch {
      toast.error("Failed to load hubs");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function remove(h: AdminHub) {
    if (!confirm(`Delete hub "${h.name}" and all its posts?`)) return;
    try {
      await apiSend(`/api/admin/hubs/${h.id}`, "DELETE");
      toast.success("Hub deleted");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-2">
      {hubs.map((h) => (
        <Card key={h.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background text-sm font-bold">
              {h.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{h.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {h._count?.memberships ?? 0} members · {h._count?.posts ?? 0} posts {h.isPrivate && "· Private"}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(h)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
      {hubs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No hubs yet.</p>}
    </div>
  );
}

/* ------------------------------- Reports ---------------------------------- */

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  isScam: boolean;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  reporter?: { email: string; profile?: { name?: string | null } | null } | null;
};

function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ reports: Report[] }>(`/api/admin/reports?status=${filter}`);
      setReports(data.reports);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function resolve(r: Report, reopen = false) {
    try {
      await apiSend(`/api/admin/reports/${r.id}/resolve`, "POST", { reopen });
      toast.success(reopen ? "Report reopened" : "Report resolved");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="scam">Scam reports</SelectItem>
        </SelectContent>
      </Select>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{r.targetType}</Badge>
                  {r.isScam && <Badge variant="destructive">Scam</Badge>}
                  {r.resolvedAt ? <Badge variant="secondary">Resolved</Badge> : <Badge className="bg-primary text-primary-foreground">Open</Badge>}
                  <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="text-sm font-medium">{r.reason}</p>
                {r.details && <p className="text-sm text-muted-foreground">{r.details}</p>}
                <p className="text-xs text-muted-foreground">
                  Reported by {r.reporter?.profile?.name ?? r.reporter?.email ?? "unknown"} · target {r.targetId.slice(0, 10)}…
                </p>
                <div className="flex gap-2 pt-1">
                  {r.resolvedAt
                    ? <Button size="sm" variant="outline" onClick={() => resolve(r, true)}>Reopen</Button>
                    : <Button size="sm" onClick={() => resolve(r)}>Mark resolved</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {reports.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No reports.</p>}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Verifications ------------------------------- */

type Verification = {
  id: string;
  status: string;
  docType: string;
  fileUrls?: string[];
  note?: string | null;
  createdAt: string;
  user?: { email: string; profile?: { name?: string | null; username?: string | null; identityVerified?: boolean | null } | null } | null;
};

function VerificationsTab() {
  const [items, setItems] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ requests: Verification[] }>(`/api/admin/verifications?status=${filter}`);
      setItems(data.requests);
    } catch {
      toast.error("Failed to load verifications");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function decide(v: Verification, decision: "APPROVE" | "REJECT") {
    try {
      await apiSend(`/api/admin/verifications/${v.id}/decide`, "POST", { decision });
      toast.success(decision === "APPROVE" ? "Verified ✓" : "Rejected");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
        </SelectContent>
      </Select>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="space-y-2">
          {items.map((v) => (
            <Card key={v.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <p className="font-semibold">{v.user?.profile?.name ?? v.user?.email}</p>
                  <Badge variant="outline">{v.docType.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {v.user?.email} · {fmtDate(v.createdAt)}
                </p>
                {v.note && <p className="text-sm text-muted-foreground">{v.note}</p>}
                {(v.fileUrls ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(v.fileUrls ?? []).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                        Document {i + 1}
                      </a>
                    ))}
                  </div>
                )}
                {v.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => decide(v, "APPROVE")}><ShieldCheck className="mr-1 h-3.5 w-3.5" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(v, "REJECT")}>Reject</Button>
                  </div>
                )}
                {v.status !== "PENDING" && <Badge variant={v.status === "APPROVED" ? "default" : "secondary"}>{v.status}</Badge>}
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No verification requests.</p>}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Map ------------------------------------- */

type Geo = { countries: { name: string; count: number }[]; cities: { name: string; count: number }[]; unknown: number };

function MapTab() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Geo>("/api/admin/geography").then(setGeo).catch(() => toast.error("Failed to load geography")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>;
  if (!geo) return null;

  const maxC = Math.max(1, ...geo.countries.map((c) => c.count));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe2 className="h-4 w-4" />Users by country</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {geo.countries.length === 0 && <p className="text-sm text-muted-foreground">No country data yet. Users set this in their profile.</p>}
          {geo.countries.map((c) => (
            <div key={c.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="font-medium">{c.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(c.count / maxC) * 100}%` }} />
              </div>
            </div>
          ))}
          {geo.unknown > 0 && <p className="pt-2 text-xs text-muted-foreground">{geo.unknown} users with no country set.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Top cities</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {geo.cities.length === 0 && <p className="text-sm text-muted-foreground">No city data yet.</p>}
          {geo.cities.map((c) => (
            <div key={c.name} className="flex justify-between border-b pb-1 text-sm last:border-0">
              <span>{c.name}</span>
              <span className="font-medium">{c.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------------- Ads ------------------------------------ */

type Ad = { id: string; title: string; body?: string | null; imageUrl?: string | null; linkUrl?: string | null; placement: string; active: boolean; createdAt: string };

const PLACEMENTS = ["FEED", "OPPORTUNITIES", "HEADLINES", "SIDEBAR"];

function AdsTab() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", imageUrl: "", linkUrl: "", placement: "FEED" });

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ ads: Ad[] }>("/api/admin/ads");
      setAds(data.ads);
    } catch {
      toast.error("Failed to load ads");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    try {
      await apiSend("/api/admin/ads", "POST", form);
      toast.success("Ad created");
      setOpen(false);
      setForm({ title: "", body: "", imageUrl: "", linkUrl: "", placement: "FEED" });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function toggle(ad: Ad) {
    try {
      await apiSend(`/api/admin/ads/${ad.id}`, "PATCH", { active: !ad.active });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(ad: Ad) {
    if (!confirm(`Delete ad "${ad.title}"?`)) return;
    try {
      await apiSend(`/api/admin/ads/${ad.id}`, "DELETE");
      toast.success("Ad deleted");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Megaphone className="mr-1 h-4 w-4" />New Ad</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <Card key={ad.id}>
              <CardContent className="flex items-center gap-4 p-4">
                {ad.imageUrl
                  ? <img src={ad.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted"><Megaphone className="h-5 w-5 text-muted-foreground" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{ad.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{ad.placement} · {ad.active ? "Active" : "Paused"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggle(ad)}>{ad.active ? "Pause" : "Activate"}</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(ad)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
          {ads.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No ads yet.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New advertisement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Body</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
            <div><Label>Link URL</Label><Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} /></div>
            <div>
              <Label>Placement</Label>
              <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLACEMENTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------- Insights --------------------------------- */

type Insight = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  imageUrl: string | null;
  published: boolean;
  createdAt: string;
};

function InsightsTab() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Insight | null>(null);
  const [form, setForm] = useState({ title: "", body: "", category: "", imageUrl: "", published: true });

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ insights: Insight[] }>("/api/admin/insights");
      setInsights(data.insights);
    } catch {
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ title: "", body: "", category: "", imageUrl: "", published: true });
    setOpen(true);
  }

  function openEdit(insight: Insight) {
    setEditing(insight);
    setForm({
      title: insight.title,
      body: insight.body,
      category: insight.category ?? "",
      imageUrl: insight.imageUrl ?? "",
      published: insight.published,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) { toast.error("Title and body required"); return; }
    const payload = {
      title: form.title,
      body: form.body,
      category: form.category || undefined,
      imageUrl: form.imageUrl || undefined,
      published: form.published,
    };
    try {
      if (editing) {
        await apiSend(`/api/admin/insights/${editing.id}`, "PATCH", payload);
        toast.success("Insight updated");
      } else {
        await apiSend("/api/admin/insights", "POST", payload);
        toast.success("Insight published");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function togglePublished(insight: Insight) {
    try {
      await apiSend(`/api/admin/insights/${insight.id}`, "PATCH", { published: !insight.published });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(insight: Insight) {
    if (!confirm(`Delete insight "${insight.title}"?`)) return;
    try {
      await apiSend(`/api/admin/insights/${insight.id}`, "DELETE");
      toast.success("Insight deleted");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Lightbulb className="mr-1 h-4 w-4" />New insight</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardContent className="flex items-center gap-4 p-4">
                {insight.imageUrl
                  ? <img src={insight.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted"><Lightbulb className="h-5 w-5 text-muted-foreground" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{insight.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {insight.category ? `${insight.category} · ` : ""}{insight.published ? "Published" : "Draft"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => togglePublished(insight)}>{insight.published ? "Unpublish" : "Publish"}</Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(insight)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(insight)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
          {insights.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No insights yet.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit insight" : "New insight"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Body</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Market outlook" /></div>
            <div><Label>Image URL</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.published} onCheckedChange={(c) => setForm({ ...form, published: Boolean(c) })} />
              Published
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Publish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------- Support ---------------------------------- */

type Ticket = {
  id: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
  user?: { email: string; profile?: { name?: string | null } | null } | null;
};

function SupportTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ tickets: Ticket[] }>(`/api/admin/support?status=${filter}`);
      setTickets(data.tickets);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function setStatus(t: Ticket, status: string) {
    try {
      await apiSend(`/api/admin/support/${t.id}/status`, "POST", { status });
      toast.success("Updated");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{t.subject}</p>
                  <Badge variant={t.status === "OPEN" ? "default" : "secondary"}>{t.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t.body}</p>
                <p className="text-xs text-muted-foreground">
                  {t.user?.profile?.name ?? t.user?.email} · {fmtDate(t.createdAt)}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setStatus(t, "IN_PROGRESS")}>In progress</Button>
                  <Button size="sm" onClick={() => setStatus(t, "RESOLVED")}>Resolve</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(t, "CLOSED")}>Close</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {tickets.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No tickets.</p>}
        </div>
      )}
    </div>
  );
}

/* -------------------------- Deal Verifications ---------------------------- */

type DealVerification = {
  id: string;
  title: string;
  companyName: string;
  dealType: string;
  minInvestment: number | null;
  publishedAt: string | null;
  createdAt: string;
  createdByUser: { id: string; displayName: string } | null;
};

function DealVerificationsTab() {
  const [items, setItems] = useState<DealVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<{ opportunities: DealVerification[] }>("/api/admin/deal-verifications");
      setItems(data.opportunities);
    } catch {
      toast.error("Failed to load deal verifications");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function decide(o: DealVerification, decision: "APPROVED" | "REJECTED") {
    setPending(o.id);
    try {
      await apiSend(`/api/admin/opportunities/${o.id}/verify`, "POST", { decision });
      toast.success(decision === "APPROVED" ? "Deal approved" : "Deal rejected");
      setItems((prev) => prev.filter((x) => x.id !== o.id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-2">
      {items.map((o) => {
        const money = fmtMoney(o.minInvestment);
        return (
          <Card key={o.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                <p className="font-semibold">{o.title}</p>
                <Badge variant="outline">{o.dealType.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{o.companyName}</p>
              <p className="text-xs text-muted-foreground">
                Submitted by {o.createdByUser?.displayName ?? "unknown"} · {fmtDate(o.createdAt)}
                {money && ` · min ${money}`}
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={pending === o.id} onClick={() => decide(o, "APPROVED")}>
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />Approve
                </Button>
                <Button size="sm" variant="outline" disabled={pending === o.id} onClick={() => decide(o, "REJECTED")}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No deals pending verification.</p>}
    </div>
  );
}

/* ------------------------------ Audit Log --------------------------------- */

type AuditLog = {
  id: string;
  actor: { id: string; displayName: string } | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
};

function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ logs: AuditLog[] }>("/api/admin/audit-logs?limit=100")
      .then((d) => setLogs(d.logs))
      .catch(() => toast.error("Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          <div className="hidden gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1.5fr_1fr_1.5fr_auto]">
            <span>Action</span>
            <span>Actor</span>
            <span>Target</span>
            <span className="text-right">When</span>
          </div>
          {logs.map((l) => (
            <div key={l.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1.5fr_1fr_1.5fr_auto] sm:items-center sm:gap-4">
              <span className="font-medium">{l.action}</span>
              <span className="text-muted-foreground">{l.actor?.displayName ?? "system"}</span>
              <span className="truncate text-muted-foreground">
                {l.targetType ? `${l.targetType}${l.targetId ? ` · ${l.targetId}` : ""}` : "—"}
              </span>
              <span className="text-muted-foreground sm:text-right" title={fmtDate(l.createdAt)}>{fmtRelative(l.createdAt)}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No audit log entries.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------- Health monitor ------------------------------ */

type HealthStatus = "ok" | "warn" | "down";

type Subsystem = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  meta?: Record<string, unknown>;
};

type HealthReport = {
  overall: HealthStatus;
  checkedAt: string;
  uptimeSeconds: number;
  version: string;
  nodeEnv: string;
  subsystems: Subsystem[];
  recentErrors: { at: string; scope: string; message: string }[];
};

function statusStyles(status: HealthStatus): { dot: string; label: string; Icon: typeof CheckCircle2 } {
  switch (status) {
    case "ok":
      return { dot: "bg-emerald-500", label: "Operational", Icon: CheckCircle2 };
    case "warn":
      return { dot: "bg-amber-500", label: "Attention", Icon: AlertTriangle };
    case "down":
      return { dot: "bg-destructive", label: "Down", Icon: XCircle };
  }
}

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function HealthTab() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await apiGet<HealthReport>("/api/admin/health");
      setReport(data);
    } catch {
      toast.error("Failed to load system health");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!report) return <p className="py-8 text-center text-sm text-muted-foreground">No health data.</p>;

  const overall = statusStyles(report.overall);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${overall.dot}`} />
                <h3 className="text-lg font-semibold">
                  {report.overall === "ok"
                    ? "All systems operational"
                    : report.overall === "warn"
                      ? "Operational with warnings"
                      : "Service disruption detected"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Uptime {fmtUptime(report.uptimeSeconds)} · v{report.version} · {report.nodeEnv} ·
                checked {fmtRelative(report.checkedAt)}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {report.subsystems.map((s) => {
          const st = statusStyles(s.status);
          return (
            <Card key={s.key}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <st.Icon
                      className={`h-4 w-4 ${
                        s.status === "ok"
                          ? "text-emerald-600"
                          : s.status === "warn"
                            ? "text-amber-600"
                            : "text-destructive"
                      }`}
                    />
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${st.dot}`} title={st.label} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.detail}</p>
                {s.meta && Object.keys(s.meta).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(s.meta)
                      .filter(([, v]) => typeof v === "number" && (v as number) > 0)
                      .map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-xs font-normal">
                          {k}: {String(v)}
                        </Badge>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent errors</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {report.recentErrors.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No errors recorded this session.
              </p>
            )}
            {report.recentErrors.map((e, i) => (
              <div key={i} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1.5fr_2fr_auto] sm:items-center sm:gap-4">
                <span className="font-mono text-xs text-muted-foreground">{e.scope}</span>
                <span className="truncate">{e.message}</span>
                <span className="text-muted-foreground sm:text-right" title={fmtDate(e.at)}>
                  {fmtRelative(e.at)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------- Page ------------------------------------- */

export default function AdminPage() {
  const [, navigate] = useLocation();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    apiGet<{ role: string }>("/api/user/profile")
      .then((d) => setAuthorized(d.role === "ADMIN"))
      .catch(() => setAuthorized(false));
  }, []);

  useEffect(() => {
    if (authorized === false) navigate("/admin/login");
  }, [authorized, navigate]);

  if (authorized === null) {
    return <div className="space-y-4 p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;
  }
  if (!authorized) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Console</h1>
          <p className="text-sm text-muted-foreground">Manage users, content, and platform health.</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview"><BarChart3 className="mr-1 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-1 h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="hubs"><Building2 className="mr-1 h-4 w-4" />Hubs</TabsTrigger>
          <TabsTrigger value="reports"><Flag className="mr-1 h-4 w-4" />Reports</TabsTrigger>
          <TabsTrigger value="verifications"><BadgeCheck className="mr-1 h-4 w-4" />Verify</TabsTrigger>
          <TabsTrigger value="deals"><FileCheck className="mr-1 h-4 w-4" />Deals</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="mr-1 h-4 w-4" />Audit Log</TabsTrigger>
          <TabsTrigger value="map"><Globe2 className="mr-1 h-4 w-4" />Map</TabsTrigger>
          <TabsTrigger value="ads"><Megaphone className="mr-1 h-4 w-4" />Ads</TabsTrigger>
          <TabsTrigger value="support"><LifeBuoy className="mr-1 h-4 w-4" />Support</TabsTrigger>
          <TabsTrigger value="insights"><Lightbulb className="mr-1 h-4 w-4" />Insights</TabsTrigger>
          <TabsTrigger value="health"><HeartPulse className="mr-1 h-4 w-4" />Health</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
        <TabsContent value="hubs" className="mt-6"><HubsTab /></TabsContent>
        <TabsContent value="reports" className="mt-6"><ReportsTab /></TabsContent>
        <TabsContent value="verifications" className="mt-6"><VerificationsTab /></TabsContent>
        <TabsContent value="deals" className="mt-6"><DealVerificationsTab /></TabsContent>
        <TabsContent value="audit" className="mt-6"><AuditLogTab /></TabsContent>
        <TabsContent value="map" className="mt-6"><MapTab /></TabsContent>
        <TabsContent value="ads" className="mt-6"><AdsTab /></TabsContent>
        <TabsContent value="support" className="mt-6"><SupportTab /></TabsContent>
        <TabsContent value="insights" className="mt-6"><InsightsTab /></TabsContent>
        <TabsContent value="health" className="mt-6"><HealthTab /></TabsContent>
      </Tabs>
    </div>
  );
}
