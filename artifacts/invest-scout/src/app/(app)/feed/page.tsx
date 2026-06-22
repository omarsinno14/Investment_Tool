import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  MessageSquare,
  Plus,
  Search,
  TrendingUp,
  Users,
  Filter,
  RefreshCcw,
} from "lucide-react";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function timeAgo(d?: string | null) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ForumPostCard({ post }: { post: any }) {
  return (
    <Link href={`/forums/${post.id}`}>
      <div className="group block rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {post.title}
        </h3>
        {post.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{post.body}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {(post.tags ?? []).slice(0, 3).map((t: string) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{t}</Badge>
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

function PeopleCard({ user, onFollow }: { user: any; onFollow: (id: string) => void }) {
  const name = user.profile?.name || user.profile?.username || user.email?.split("@")[0];
  const username = user.profile?.username;
  const initials = name?.slice(0, 2).toUpperCase() ?? "IN";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={user.profile?.imageUrl} />
          <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          {username && <p className="text-xs text-muted-foreground truncate">@{username}</p>}
        </div>
      </div>
      <Link href={`/users/${user.id}`}>
        <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs">View</Button>
      </Link>
    </div>
  );
}

export default function FeedPage() {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [forums, setForums] = useState<any[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [oppCursor, setOppCursor] = useState<string | null>(null);
  const [forumCursor, setForumCursor] = useState<string | null>(null);
  const [oppLoadingMore, setOppLoadingMore] = useState(false);
  const [forumLoadingMore, setForumLoadingMore] = useState(false);

  const [oppQuery, setOppQuery] = useState("");
  const [forumQuery, setForumQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<any[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  const [myOppsOnly, setMyOppsOnly] = useState(false);
  const [boostedFirst, setBoostedFirst] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"opportunity" | "forum">("opportunity");
  const [posting, setPosting] = useState(false);
  const [oppForm, setOppForm] = useState({ title: "", summary: "", tags: "", askAmount: "", askCurrency: "USD", expectedRoiPercent: "" });
  const [forumForm, setForumForm] = useState({ title: "", body: "", tags: "" });

  const oppListRef = useRef<HTMLDivElement | null>(null);
  const forumListRef = useRef<HTMLDivElement | null>(null);

  async function loadInitial() {
    setLoading(true);
    try {
      const [oppRes, forumRes] = await Promise.all([
        fetch("/api/opportunities?type=community&limit=30", { credentials: "include" }),
        fetch("/api/forums?limit=30", { credentials: "include" }),
      ]);
      if ([oppRes, forumRes].some((r) => r.status === 401)) { window.location.href = "/login"; return; }
      const [oppData, forumData] = await Promise.all([oppRes.json().catch(() => ({})), forumRes.json().catch(() => ({}))]);
      if (!oppRes.ok) throw new Error(oppData?.error ?? "Failed to load opportunities");
      if (!forumRes.ok) throw new Error(forumData?.error ?? "Failed to load discussions");
      setOpportunities(oppData.opportunities ?? []);
      setForums(forumData.posts ?? []);
      setViewerId(oppData.viewerId ?? forumData.viewerId ?? null);
      setOppCursor(oppData.nextCursor ?? null);
      setForumCursor(forumData.nextCursor ?? null);
    } catch (e) { console.error(e); toast.error("Failed to load feed"); }
    finally { setLoading(false); }
  }

  async function loadMoreOpps() {
    if (!oppCursor || oppLoadingMore) return;
    setOppLoadingMore(true);
    try {
      const res = await fetch(`/api/opportunities?type=community&limit=20&cursor=${encodeURIComponent(oppCursor)}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setOpportunities((prev) => [...prev, ...(data.opportunities ?? [])]);
      setOppCursor(data.nextCursor ?? null);
    } catch { toast.error("Failed to load more"); }
    finally { setOppLoadingMore(false); }
  }

  async function loadMoreForums() {
    if (!forumCursor || forumLoadingMore) return;
    setForumLoadingMore(true);
    try {
      const res = await fetch(`/api/forums?limit=20&cursor=${encodeURIComponent(forumCursor)}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setForums((prev) => [...prev, ...(data.posts ?? [])]);
      setForumCursor(data.nextCursor ?? null);
    } catch { toast.error("Failed to load more"); }
    finally { setForumLoadingMore(false); }
  }

  useEffect(() => { loadInitial(); }, []);

  useEffect(() => {
    if (!peopleQuery.trim()) { setPeopleResults([]); return; }
    const t = window.setTimeout(async () => {
      setPeopleLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(peopleQuery.trim())}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        setPeopleResults(data.users ?? []);
      } catch { }
      finally { setPeopleLoading(false); }
    }, 300);
    return () => window.clearTimeout(t);
  }, [peopleQuery]);

  // Infinite scroll
  useEffect(() => {
    const el = oppListRef.current;
    if (!el) return;
    const fn = () => { if (!oppCursor || oppLoadingMore || oppQuery.trim()) return; if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) loadMoreOpps(); };
    el.addEventListener("scroll", fn);
    return () => el.removeEventListener("scroll", fn);
  }, [oppCursor, oppLoadingMore, oppQuery]);

  useEffect(() => {
    const el = forumListRef.current;
    if (!el) return;
    const fn = () => { if (!forumCursor || forumLoadingMore || forumQuery.trim()) return; if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) loadMoreForums(); };
    el.addEventListener("scroll", fn);
    return () => el.removeEventListener("scroll", fn);
  }, [forumCursor, forumLoadingMore, forumQuery]);

  const filteredOpps = useMemo(() => {
    const q = oppQuery.trim().toLowerCase();
    const now = Date.now();
    let list = opportunities.filter((o) => {
      if (myOppsOnly && viewerId && o.createdByUserId !== viewerId) return false;
      if (q && !`${o.title ?? ""} ${o.summary ?? ""} ${(o.tags ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (boostedFirst) {
      list = [...list].sort((a, b) => {
        const ab = a.boostedUntil ? new Date(a.boostedUntil).getTime() > now : false;
        const bb = b.boostedUntil ? new Date(b.boostedUntil).getTime() > now : false;
        if (ab !== bb) return ab ? -1 : 1;
        return new Date(b.publishedAt ?? b.fetchedAt ?? 0).getTime() - new Date(a.publishedAt ?? a.fetchedAt ?? 0).getTime();
      });
    }
    return list;
  }, [opportunities, oppQuery, myOppsOnly, viewerId, boostedFirst]);

  const filteredForums = useMemo(() => {
    const q = forumQuery.trim().toLowerCase();
    return forums.filter((p) => {
      if (!q) return true;
      return `${p.title ?? ""} ${p.body ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [forums, forumQuery]);

  async function submitOpportunity() {
    if (!oppForm.title.trim()) { toast.error("Title is required"); return; }
    setPosting(true);
    try {
      const res = await fetch("/api/user/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: oppForm.title, summary: oppForm.summary, tags: oppForm.tags, askAmount: oppForm.askAmount, askCurrency: oppForm.askCurrency, expectedRoiPercent: oppForm.expectedRoiPercent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setOpportunities((prev) => [data.opportunity, ...prev]);
      setOppForm({ title: "", summary: "", tags: "", askAmount: "", askCurrency: "USD", expectedRoiPercent: "" });
      setCreateOpen(false);
      toast.success("Opportunity posted!");
    } catch (e: any) { toast.error(e?.message ?? "Unable to post"); }
    finally { setPosting(false); }
  }

  async function submitForum() {
    if (!forumForm.title.trim() || !forumForm.body.trim()) { toast.error("Title and body are required"); return; }
    setPosting(true);
    try {
      const res = await fetch("/api/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: forumForm.title, body: forumForm.body, tags: forumForm.tags ? forumForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setForums((prev) => [data.post, ...prev]);
      setForumForm({ title: "", body: "", tags: "" });
      setCreateOpen(false);
      toast.success("Discussion published!");
    } catch (e: any) { toast.error(e?.message ?? "Unable to post"); }
    finally { setPosting(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
          <p className="text-sm text-muted-foreground">Opportunities, discussions, and investors — all in one place.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={loadInitial} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create</DialogTitle>
              </DialogHeader>
              <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="opportunity">
                    <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    Opportunity
                  </TabsTrigger>
                  <TabsTrigger value="forum">
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    Discussion
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="opportunity" className="space-y-3 pt-4">
                  <Input placeholder="Opportunity title *" value={oppForm.title} onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })} />
                  <Textarea placeholder="Short summary of the deal" value={oppForm.summary} onChange={(e) => setOppForm({ ...oppForm, summary: e.target.value })} rows={3} />
                  <Input placeholder="Tags (comma-separated)" value={oppForm.tags} onChange={(e) => setOppForm({ ...oppForm, tags: e.target.value })} />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Input placeholder="Ask amount" type="number" value={oppForm.askAmount} onChange={(e) => setOppForm({ ...oppForm, askAmount: e.target.value })} />
                    </div>
                    <Select value={oppForm.askCurrency} onValueChange={(v) => setOppForm({ ...oppForm, askCurrency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="NGN">NGN</SelectItem>
                        <SelectItem value="ZAR">ZAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Expected ROI %" type="number" value={oppForm.expectedRoiPercent} onChange={(e) => setOppForm({ ...oppForm, expectedRoiPercent: e.target.value })} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={submitOpportunity} disabled={posting}>{posting ? "Posting…" : "Post opportunity"}</Button>
                  </DialogFooter>
                </TabsContent>

                <TabsContent value="forum" className="space-y-3 pt-4">
                  <Input placeholder="Discussion title *" value={forumForm.title} onChange={(e) => setForumForm({ ...forumForm, title: e.target.value })} />
                  <Textarea placeholder="Share your thoughts, question, or insight *" value={forumForm.body} onChange={(e) => setForumForm({ ...forumForm, body: e.target.value })} rows={4} />
                  <Input placeholder="Tags (comma-separated)" value={forumForm.tags} onChange={(e) => setForumForm({ ...forumForm, tags: e.target.value })} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={submitForum} disabled={posting}>{posting ? "Posting…" : "Post discussion"}</Button>
                  </DialogFooter>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="opportunities">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
          <TabsTrigger value="opportunities" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Opportunities</span>
            {opportunities.length > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary font-semibold">{opportunities.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="forums" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Forums</span>
            {forums.length > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary font-semibold">{forums.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>People</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Opportunities tab ── */}
        <TabsContent value="opportunities" className="mt-6 space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Search…" value={oppQuery} onChange={(e) => setOppQuery(e.target.value)} />
            </div>
            <button
              onClick={() => setMyOppsOnly(!myOppsOnly)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${myOppsOnly ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"}`}
            >
              <Filter className="h-3 w-3" />Mine only
            </button>
            <button
              onClick={() => setBoostedFirst(!boostedFirst)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${boostedFirst ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"}`}
            >
              <TrendingUp className="h-3 w-3" />Boosted first
            </button>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : filteredOpps.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">No opportunities yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {oppQuery ? "Try a different search term." : "Set your interests to see matched deals, or post the first opportunity."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline"><Link href="/interests">Set interests</Link></Button>
                <Button size="sm" onClick={() => { setCreateTab("opportunity"); setCreateOpen(true); }}>Post opportunity</Button>
              </div>
            </div>
          ) : (
            <div ref={oppListRef}>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredOpps.map((opp) => (
                  <OpportunityCard key={opp.id} opp={opp} onActionUpdated={() => {}} />
                ))}
              </div>
              {oppLoadingMore && (
                <div className="mt-4 flex justify-center py-4 text-sm text-muted-foreground">
                  <RefreshCcw className="h-4 w-4 animate-spin mr-2" />Loading more…
                </div>
              )}
              {!oppCursor && !oppLoadingMore && filteredOpps.length > 0 && (
                <p className="mt-4 text-center text-xs text-muted-foreground">All {filteredOpps.length} opportunities loaded</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Forums tab ── */}
        <TabsContent value="forums" className="mt-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Search discussions…" value={forumQuery} onChange={(e) => setForumQuery(e.target.value)} />
            </div>
            <Button size="sm" variant="outline" onClick={() => { setCreateTab("forum"); setCreateOpen(true); }} className="shrink-0 gap-1.5">
              <Plus className="h-3.5 w-3.5" />New
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : filteredForums.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">No discussions yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start the conversation.</p>
              </div>
              <Button size="sm" onClick={() => { setCreateTab("forum"); setCreateOpen(true); }}>Start a discussion</Button>
            </div>
          ) : (
            <div ref={forumListRef}>
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredForums.map((p) => <ForumPostCard key={p.id} post={p} />)}
              </div>
              {forumLoadingMore && (
                <div className="mt-4 flex justify-center py-4 text-sm text-muted-foreground">
                  <RefreshCcw className="h-4 w-4 animate-spin mr-2" />Loading more…
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── People tab ── */}
        <TabsContent value="people" className="mt-6 space-y-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search investors by name or username…" value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} />
          </div>

          {peopleLoading && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          )}

          {!peopleLoading && peopleQuery.trim() && peopleResults.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No investors found for "{peopleQuery}"</p>
            </div>
          )}

          {!peopleLoading && !peopleQuery.trim() && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Type a name or username to discover investors</p>
            </div>
          )}

          {peopleResults.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {peopleResults.map((user) => <PeopleCard key={user.id} user={user} onFollow={() => {}} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
