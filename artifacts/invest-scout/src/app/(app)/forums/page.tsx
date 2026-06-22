import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Globe, Hash, Lock, MessageSquare, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Hub = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isPrivate: boolean;
  isMember?: boolean;
  _count?: { memberships: number; posts: number };
};

type ForumPost = {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  createdAt: string;
  _count?: { comments: number };
};

const FEATURED_SLUGS = ["vertica", "news", "deals", "private-equity", "venture-capital", "real-estate", "africa"];

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

function HubCard({ hub, onJoin }: { hub: Hub; onJoin: (id: string) => void }) {
  const initial = hub.name.charAt(0).toUpperCase();
  return (
    <Link href={`/hubs/${hub.slug}`}>
      <div className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer">
        {/* Avatar — Espresso Black, cream text. Clean, no color chaos */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background text-sm font-bold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm group-hover:text-primary transition-colors">{hub.name}</span>
            {hub.isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
          {hub.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{hub.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{hub._count?.memberships ?? 0}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{hub._count?.posts ?? 0}</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin(hub.id); }}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${hub.isMember ? "bg-muted text-muted-foreground border-border" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"}`}
        >
          {hub.isMember ? "Joined" : "Join"}
        </button>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: ForumPost }) {
  return (
    <Link href={`/forums/${post.id}`}>
      <div className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        {post.body && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.body}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {(post.tags ?? []).slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] font-normal px-1.5 py-0">{t}</Badge>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {post._count?.comments != null && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />{post._count.comments}
              </span>
            )}
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ForumsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hubQuery, setHubQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({ name: "", description: "", isPrivate: false });
  const [role, setRole] = useState("USER");
  const [activeTab, setActiveTab] = useState<"discover" | "mine" | "discussions">("discover");

  async function loadAll(q = "") {
    setLoading(true);
    try {
      const [hubsRes, postsRes, profileRes] = await Promise.all([
        fetch(`/api/hubs${q ? `?q=${encodeURIComponent(q)}&limit=60` : "?limit=60"}`, { credentials: "include" }),
        fetch("/api/forums?limit=20", { credentials: "include" }),
        fetch("/api/user/profile", { credentials: "include" }),
      ]);
      const [hubsData, postsData, profileData] = await Promise.all([
        hubsRes.json().catch(() => ({})),
        postsRes.json().catch(() => ({})),
        profileRes.json().catch(() => ({})),
      ]);
      if (!hubsRes.ok) throw new Error(hubsData?.error ?? "Failed to load hubs");
      setHubs(hubsData.hubs ?? []);
      setPosts(postsData.posts ?? []);
      setRole(profileRes.ok ? (profileData.role ?? "USER") : "USER");
    } catch (e) {
      console.error(e);
      toast.error("Unable to load community");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => loadAll(hubQuery), hubQuery ? 300 : 0);
    return () => clearTimeout(t);
  }, [hubQuery]);

  async function toggleJoin(hubId: string) {
    const hub = hubs.find((h) => h.id === hubId);
    if (!hub) return;
    const was = hub.isMember;
    setHubs((prev) => prev.map((h) => h.id === hubId ? { ...h, isMember: !was } : h));
    try {
      const res = await fetch(`/api/hubs/${hub.slug}/join`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");
    } catch (e: any) {
      setHubs((prev) => prev.map((h) => h.id === hubId ? { ...h, isMember: was } : h));
      toast.error(e?.message ?? "Failed to update membership");
    }
  }

  async function createHub() {
    if (!createData.name.trim()) { toast.error("Hub name is required"); return; }
    try {
      const res = await fetch("/api/hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(createData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to create hub");
      setCreateOpen(false);
      setCreateData({ name: "", description: "", isPrivate: false });
      toast.success("Hub created!");
      window.location.href = `/hubs/${data.hub.slug}`;
    } catch (e: any) {
      toast.error(e?.message ?? "Unable to create hub");
    }
  }

  const featuredHubs = useMemo(() => hubs.filter((h) => FEATURED_SLUGS.includes(h.slug)), [hubs]);
  const myHubs = useMemo(() => hubs.filter((h) => h.isMember), [hubs]);
  const allHubs = useMemo(() => hubs.filter((h) => !FEATURED_SLUGS.includes(h.slug)), [hubs]);

  const tabs = [
    { key: "discover", label: "Discover", icon: Globe, count: hubs.length },
    { key: "mine", label: "My Hubs", icon: Hash, count: myHubs.length },
    { key: "discussions", label: "Discussions", icon: MessageSquare, count: posts.length },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {hubs.length > 0 ? `${hubs.length} hubs · ` : ""}Join communities, share deals, and discuss investments.
          </p>
        </div>
        {role === "ADMIN" && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 self-start sm:self-auto">
                <Plus className="h-4 w-4" />
                Create Hub
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a Hub</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Hub name</Label>
                  <Input value={createData.name} onChange={(e) => setCreateData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. East Africa Startups" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={createData.description} onChange={(e) => setCreateData((p) => ({ ...p, description: e.target.value }))} placeholder="What is this hub about?" rows={3} />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="rounded border" checked={createData.isPrivate} onChange={(e) => setCreateData((p) => ({ ...p, isPrivate: e.target.checked }))} />
                  Private hub (invite-only)
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={createHub}>Create Hub</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl border bg-muted/50 p-1">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeTab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] font-semibold ${activeTab === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Discover tab ── */}
      {activeTab === "discover" && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search hubs by name or topic…" value={hubQuery} onChange={(e) => setHubQuery(e.target.value)} />
          </div>

          {featuredHubs.length > 0 && !hubQuery && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Featured Communities</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></CardContent></Card>
                )) : featuredHubs.map((hub) => <HubCard key={hub.id} hub={hub} onJoin={toggleJoin} />)}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {hubQuery ? `Results for "${hubQuery}"` : "All Hubs"}
            </h2>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-40" /></CardContent></Card>
                ))}
              </div>
            ) : allHubs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-12 text-center">
                <Globe className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-sm">No hubs found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search term.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {allHubs.map((hub) => <HubCard key={hub.id} hub={hub} onJoin={toggleJoin} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── My hubs tab ── */}
      {activeTab === "mine" && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></CardContent></Card>
              ))}
            </div>
          ) : myHubs.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Hash className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">No hub memberships yet</p>
                <p className="text-sm text-muted-foreground mt-1">Join hubs to build your investment community.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("discover")}>Discover hubs</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myHubs.map((hub) => <HubCard key={hub.id} hub={hub} onJoin={toggleJoin} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Discussions tab ── */}
      {activeTab === "discussions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Recent discussions across all hubs.</p>
            <Link href="/forums/new">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New post
              </Button>
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-[80%]" /><Skeleton className="h-3 w-[60%]" /></CardContent></Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">No discussions yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start the first discussion in a hub.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
