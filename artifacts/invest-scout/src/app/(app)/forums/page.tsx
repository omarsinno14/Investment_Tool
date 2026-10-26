import { Link } from "wouter";
import { MatchChip } from "@/components/social/MatchChip";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Flame, Lock, MessageCircle, Plus, Search, Share2, Sparkles, ThumbsUp, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RichText } from "@/components/social/RichText";
import { UserAvatar, displayName } from "@/components/social/UserAvatar";
import { useViewer } from "@/components/social/useViewer";
import { fetchProfile } from "@/lib/profile-cache";
import { fullDate, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

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
  user?: { id: string; profile?: { name?: string | null; username?: string | null; imageUrl?: string | null } | null };
  reactions?: { type: string }[];
  saves?: unknown[];
  _count?: { comments: number; reactions: number; saves?: number };
  matchScore?: number;
  matchedInterests?: string[];
};

type Tab = "threads" | "circles" | "mine";
type Sort = "hot" | "new" | "top";

const FEATURED_SLUGS = ["vertica", "news", "deals", "private-equity", "venture-capital", "real-estate", "africa"];

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function engagement(p: ForumPost) {
  return (p._count?.reactions ?? 0) + 2 * (p._count?.comments ?? 0);
}

/** Reddit-style "hot": engagement decays with age so fresh activity rises. */
function hotScore(p: ForumPost) {
  const hours = (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000;
  // Threads matching the member's interests get a boost.
  return ((engagement(p) + 1) * (1 + (p.matchScore ?? 0) * 0.5)) / Math.pow(hours + 2, 1.5);
}

export default function ForumsPage() {
  const viewer = useViewer();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hubQuery, setHubQuery] = useState("");
  const [threadQuery, setThreadQuery] = useState("");
  const [tab, setTab] = useState<Tab>("threads");
  const [sort, setSort] = useState<Sort>("hot");
  const [role, setRole] = useState("USER");
  const [composeOpen, setComposeOpen] = useState(false);
  const [createHubOpen, setCreateHubOpen] = useState(false);

  async function loadHubs(q = "") {
    const res = await fetch(`/api/hubs?limit=60${q ? `&q=${encodeURIComponent(q)}` : ""}`, { credentials: "include" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) setHubs(data.hubs ?? []);
  }

  async function loadPosts(q = "") {
    const res = await fetch(`/api/forums?limit=30${q ? `&q=${encodeURIComponent(q)}` : ""}`, { credentials: "include" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setPosts(data.posts ?? []);
      setNextCursor(data.nextCursor ?? null);
    } else {
      toast.error("Unable to load threads");
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ limit: "30", cursor: nextCursor });
    if (threadQuery.trim()) params.set("q", threadQuery.trim());
    const res = await fetch(`/api/forums?${params}`, { credentials: "include" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setPosts((prev) => [...prev, ...(data.posts ?? []).filter((p: ForumPost) => !prev.some((x) => x.id === p.id))]);
      setNextCursor(data.nextCursor ?? null);
    }
    setLoadingMore(false);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadHubs(), loadPosts(), fetchProfile().then((r) => setRole(r.ok ? r.data?.role ?? "USER" : "USER")).catch(() => undefined)]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => loadHubs(hubQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [hubQuery]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => loadPosts(threadQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [threadQuery]);

  async function toggleJoin(hub: Hub) {
    const was = Boolean(hub.isMember);
    setHubs((prev) => prev.map((h) => (h.id === hub.id ? { ...h, isMember: !was } : h)));
    const res = await fetch(`/api/hubs/${hub.slug}/join`, { method: was ? "DELETE" : "POST", credentials: "include" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setHubs((prev) => prev.map((h) => (h.id === hub.id ? { ...h, isMember: was } : h)));
      toast.error(data?.error ?? "Couldn't update membership");
    }
  }

  async function toggleLike(post: ForumPost) {
    const liked = (post.reactions ?? []).some((r) => r.type === "LIKE");
    const patch = (p: ForumPost): ForumPost => ({
      ...p,
      reactions: liked ? (p.reactions ?? []).filter((r) => r.type !== "LIKE") : [...(p.reactions ?? []), { type: "LIKE" }],
      _count: { comments: p._count?.comments ?? 0, saves: p._count?.saves, reactions: Math.max(0, (p._count?.reactions ?? 0) + (liked ? -1 : 1)) },
    });
    setPosts((prev) => prev.map((p) => (p.id === post.id ? patch(p) : p)));
    const res = await fetch(`/api/forums/${post.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "LIKE" }),
    }).catch(() => null);
    if (!res?.ok) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      toast.error("Couldn't update your reaction");
    }
  }

  async function toggleSave(post: ForumPost) {
    const was = (post.saves?.length ?? 0) > 0;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, saves: was ? [] : [{}] } : p)));
    const res = await fetch(`/api/forums/${post.id}/save`, { method: "POST", credentials: "include" }).catch(() => null);
    if (!res?.ok) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      toast.error("Couldn't save this thread");
    }
  }

  const sortedPosts = useMemo(() => {
    const list = [...posts];
    if (sort === "new") list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else if (sort === "top") list.sort((a, b) => engagement(b) - engagement(a));
    else list.sort((a, b) => hotScore(b) - hotScore(a));
    return list;
  }, [posts, sort]);

  const myHubs = useMemo(() => hubs.filter((h) => h.isMember), [hubs]);
  const popularHubs = useMemo(
    () => [...hubs].sort((a, b) => (b._count?.memberships ?? 0) - (a._count?.memberships ?? 0)).slice(0, 6),
    [hubs]
  );
  const featuredHubs = useMemo(() => hubs.filter((h) => FEATURED_SLUGS.includes(h.slug)), [hubs]);
  const otherHubs = useMemo(() => hubs.filter((h) => !FEATURED_SLUGS.includes(h.slug)), [hubs]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "threads", label: "Threads" },
    { key: "circles", label: "Circles", count: hubs.length },
    { key: "mine", label: "My circles", count: myHubs.length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 sm:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
          <p className="mt-1 text-sm text-muted-foreground">Theses, deal talk and market intel from members.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {role === "ADMIN" && (
            <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex" onClick={() => setCreateHubOpen(true)}>
              <Users className="h-4 w-4" /> New circle
            </Button>
          )}
          <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setComposeOpen(true)}>
            <Plus className="h-4 w-4" /> New thread
          </Button>
        </div>
      </div>

      <nav className="flex gap-6 border-b">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 pb-2.5 text-sm font-medium transition",
              tab === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {count ? <span className="ml-1.5 text-xs text-muted-foreground">{count}</span> : null}
          </button>
        ))}
      </nav>

      {tab === "threads" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-3">
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition hover:border-primary/30"
            >
              <UserAvatar user={viewer} size="sm" />
              <span className="flex-1 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">Start a thread...</span>
            </button>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded-full bg-muted p-0.5 text-sm">
                {([
                  { key: "hot", label: "Hot", icon: Flame },
                  { key: "new", label: "New", icon: Sparkles },
                  { key: "top", label: "Top", icon: TrendingUp },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSort(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition",
                      sort === key ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={threadQuery} onChange={(e) => setThreadQuery(e.target.value)} placeholder="Search threads" className="h-9 rounded-full pl-9" />
              </div>
            </div>

            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-2xl border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))
            ) : sortedPosts.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title={threadQuery ? "No threads match that search" : "No threads yet"}
                body={threadQuery ? "Try a different keyword." : "Be the first to start a conversation."}
                action={!threadQuery ? <Button size="sm" onClick={() => setComposeOpen(true)}>Start a thread</Button> : undefined}
              />
            ) : (
              <>
                {sortedPosts.map((post) => (
                  <ThreadCard key={post.id} post={post} onLike={() => toggleLike(post)} onSave={() => toggleSave(post)} />
                ))}
                {nextCursor && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="hidden space-y-4 lg:block">
            <SidebarCard title="Your circles" action={myHubs.length > 4 ? { label: "See all", onClick: () => setTab("mine") } : undefined}>
              {myHubs.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">Join circles to follow the topics you care about.</p>
              ) : (
                myHubs.slice(0, 4).map((hub) => <HubRow key={hub.id} hub={hub} onToggle={() => toggleJoin(hub)} />)
              )}
            </SidebarCard>
            <SidebarCard title="Popular circles" action={{ label: "Explore", onClick: () => setTab("circles") }}>
              {popularHubs.map((hub) => (
                <HubRow key={hub.id} hub={hub} onToggle={() => toggleJoin(hub)} />
              ))}
            </SidebarCard>
          </aside>
        </div>
      )}

      {tab === "circles" && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 rounded-full pl-9" placeholder="Search circles by name or topic" value={hubQuery} onChange={(e) => setHubQuery(e.target.value)} />
          </div>
          {featuredHubs.length > 0 && !hubQuery && (
            <HubGrid title="Featured" hubs={featuredHubs} loading={loading} onToggle={toggleJoin} />
          )}
          <HubGrid title={hubQuery ? `Results for "${hubQuery}"` : "All circles"} hubs={otherHubs} loading={loading} onToggle={toggleJoin} />
        </div>
      )}

      {tab === "mine" &&
        (myHubs.length === 0 && !loading ? (
          <EmptyState
            icon={Users}
            title="You haven't joined a circle yet"
            body="Join circles to get closer to the deals and people that matter."
            action={<Button variant="outline" size="sm" onClick={() => setTab("circles")}>Explore circles</Button>}
          />
        ) : (
          <HubGrid hubs={myHubs} loading={loading} onToggle={toggleJoin} />
        ))}

      <ComposeThreadDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onCreated={(post) => {
          setPosts((prev) => [{ ...post, reactions: [], saves: [], _count: { comments: 0, reactions: 0 } }, ...prev]);
          setSort("new");
          setTab("threads");
        }}
      />
      {role === "ADMIN" && <CreateHubDialog open={createHubOpen} onOpenChange={setCreateHubOpen} />}
    </div>
  );
}

function ThreadCard({ post, onLike, onSave }: { post: ForumPost; onLike: () => void; onSave: () => void }) {
  const liked = (post.reactions ?? []).some((r) => r.type === "LIKE");
  const saved = (post.saves?.length ?? 0) > 0;
  const reactions = post._count?.reactions ?? 0;
  const commentCount = post._count?.comments ?? 0;

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    const url = `${window.location.origin}/forums/${post.id}`;
    if (navigator.share) await navigator.share({ title: post.title, url }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success("Link copied");
    }
  }

  return (
    <article className="group rounded-2xl border bg-card transition hover:border-primary/30">
      <Link href={`/forums/${post.id}`} className="block px-4 pt-3.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserAvatar user={post.user} size="xs" />
          <span className="font-medium text-foreground">{displayName(post.user)}</span>
          <span aria-hidden>·</span>
          <time title={fullDate(post.createdAt)}>{timeAgo(post.createdAt)}</time>
        </div>
        <h3 className="mt-2 text-base font-semibold leading-snug tracking-tight group-hover:text-primary">{post.title}</h3>
        <MatchChip matched={post.matchedInterests} className="mt-1.5" />
        {post.body && <RichText text={post.body} className="mt-1 line-clamp-3 block text-sm leading-relaxed text-muted-foreground" />}
        {(post.tags ?? []).length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(post.tags ?? []).slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}
      </Link>
      <div className="flex items-center gap-1 px-2 pb-1.5 pt-1.5">
        <ActionButton active={liked} onClick={onLike} label={liked ? "Unlike" : "Like"}>
          <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
          {reactions > 0 && <span className="tabular-nums">{reactions}</span>}
        </ActionButton>
        <Link
          href={`/forums/${post.id}`}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{commentCount}</span>
          <span className="hidden sm:inline">{commentCount === 1 ? "comment" : "comments"}</span>
        </Link>
        <ActionButton onClick={share} label="Share">
          <Share2 className="h-4 w-4" />
        </ActionButton>
        <ActionButton active={saved} onClick={onSave} label={saved ? "Remove bookmark" : "Bookmark"} className="ml-auto">
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        </ActionButton>
      </div>
    </article>
  );
}

function ActionButton({
  active,
  onClick,
  label,
  className,
  children,
}: {
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
        active ? "font-medium text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function HubMark({ hub, size = "md" }: { hub: Hub; size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-foreground font-semibold text-background",
        size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm"
      )}
    >
      {hub.name.charAt(0).toUpperCase()}
    </div>
  );
}

function JoinPill({ joined, onClick }: { joined?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition",
        joined ? "border bg-background text-muted-foreground hover:border-destructive/40 hover:text-destructive" : "bg-primary text-primary-foreground hover:bg-primary/90"
      )}
    >
      {joined ? "Joined" : "Join"}
    </button>
  );
}

function HubRow({ hub, onToggle }: { hub: Hub; onToggle: () => void }) {
  return (
    <Link href={`/hubs/${hub.slug}`} className="flex items-center gap-3 rounded-xl px-1 py-1.5 transition hover:bg-muted/60">
      <HubMark hub={hub} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate text-sm font-medium">
          {hub.name}
          {hub.isPrivate && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
        </div>
        <div className="text-xs text-muted-foreground">{plural(hub._count?.memberships ?? 0, "member")}</div>
      </div>
      <JoinPill joined={hub.isMember} onClick={onToggle} />
    </Link>
  );
}

function HubGrid({ title, hubs, loading, onToggle }: { title?: string; hubs: Hub[]; loading: boolean; onToggle: (hub: Hub) => void }) {
  return (
    <section className="space-y-3">
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
      ) : hubs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No circles found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {hubs.map((hub) => (
            <Link key={hub.id} href={`/hubs/${hub.slug}`} className="group flex gap-3 rounded-2xl border bg-card p-4 transition hover:border-primary/30">
              <HubMark hub={hub} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold group-hover:text-primary">{hub.name}</span>
                  {hub.isPrivate && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                </div>
                {hub.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{hub.description}</p>}
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {plural(hub._count?.memberships ?? 0, "member")} · {plural(hub._count?.posts ?? 0, "post")}
                </div>
              </div>
              <JoinPill joined={hub.isMember} onClick={() => onToggle(hub)} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function SidebarCard({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && (
          <button type="button" onClick={action.onClick} className="text-xs font-medium text-primary hover:underline">
            {action.label}
          </button>
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Users; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}

function ComposeThreadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (post: ForumPost) => void;
}) {
  const [form, setForm] = useState({ title: "", body: "", tags: "" });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Add a title and some details");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/forums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: form.title.trim(), body: form.body.trim(), tags: form.tags }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      toast.error(data?.error ?? "Couldn't publish your thread");
      return;
    }
    onCreated(data.post);
    setForm({ title: "", body: "", tags: "" });
    onOpenChange(false);
    toast.success("Thread published");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Start a thread</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            maxLength={300}
            className="h-11 text-base font-medium"
          />
          <Textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Share your thesis, question or deal insight. Mention members with @username."
            rows={7}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="real-estate, private-credit" />
          </div>
          <p className="text-xs text-muted-foreground">Keep it factual. Use projected or estimated, never guaranteed, when discussing returns.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !form.title.trim() || !form.body.trim()}>
            {busy ? "Publishing..." : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateHubDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [data, setData] = useState({ name: "", description: "", isPrivate: false });

  async function create() {
    if (!data.name.trim()) {
      toast.error("Circle name is required");
      return;
    }
    const res = await fetch("/api/hubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(body?.error ?? "Unable to create circle");
      return;
    }
    toast.success("Circle created");
    window.location.href = `/hubs/${body.hub.slug}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a circle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Circle name</Label>
            <Input value={data.name} onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. East Africa Startups" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={data.description} onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))} placeholder="What brings this circle together?" rows={3} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="rounded border" checked={data.isPrivate} onChange={(e) => setData((p) => ({ ...p, isPrivate: e.target.checked }))} />
            Private circle (invite-only)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Create circle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

