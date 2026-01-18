"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function FeedPage() {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [forums, setForums] = useState<any[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const [oppQuery, setOppQuery] = useState("");
  const [forumQuery, setForumQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<any[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  const [myOppsOnly, setMyOppsOnly] = useState(false);
  const [myForumsOnly, setMyForumsOnly] = useState(false);
  const [boostedFirst, setBoostedFirst] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"opportunity" | "forum">("opportunity");
  const [posting, setPosting] = useState(false);
  const [oppForm, setOppForm] = useState({
    title: "",
    summary: "",
    tags: "",
    askAmount: "",
    askCurrency: "USD",
    expectedRoiPercent: "",
  });
  const [forumForm, setForumForm] = useState({ title: "", body: "", tags: "" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [oppRes, forumRes] = await Promise.all([
          fetch("/api/opportunities?type=community", { credentials: "include" }),
          fetch("/api/forums", { credentials: "include" }),
        ]);
        if ([oppRes, forumRes].some((res) => res.status === 401)) {
          window.location.href = "/login";
          return;
        }
        const oppData = await oppRes.json().catch(() => ({}));
        const forumData = await forumRes.json().catch(() => ({}));
        if (!oppRes.ok) throw new Error(oppData?.error ?? "Failed to load opportunities");
        if (!forumRes.ok) throw new Error(forumData?.error ?? "Failed to load forums");
        setOpportunities(oppData.opportunities ?? []);
        setForums(forumData.posts ?? []);
        setViewerId(oppData.viewerId ?? forumData.viewerId ?? null);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load feed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!peopleQuery.trim()) {
      setPeopleResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setPeopleLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(peopleQuery.trim())}`, {
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to search users");
        setPeopleResults(data.users ?? []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to search users");
      } finally {
        setPeopleLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [peopleQuery]);

  const filteredOpps = useMemo(() => {
    const term = oppQuery.trim().toLowerCase();
    const now = Date.now();
    let list = opportunities.filter((opp) => {
      if (myOppsOnly && viewerId && opp.createdByUserId !== viewerId) return false;
      if (!term) return true;
      const hay = `${opp.title ?? ""} ${opp.summary ?? ""} ${(opp.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(term);
    });
    if (boostedFirst) {
      list = list.slice().sort((a, b) => {
        const aBoosted = a.boostedUntil ? new Date(a.boostedUntil).getTime() > now : false;
        const bBoosted = b.boostedUntil ? new Date(b.boostedUntil).getTime() > now : false;
        if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;
        return new Date(b.publishedAt ?? b.fetchedAt ?? 0).getTime() -
          new Date(a.publishedAt ?? a.fetchedAt ?? 0).getTime();
      });
    }
    return list;
  }, [opportunities, oppQuery, myOppsOnly, viewerId, boostedFirst]);

  const filteredForums = useMemo(() => {
    const term = forumQuery.trim().toLowerCase();
    return forums.filter((post) => {
      if (myForumsOnly && viewerId && post.userId !== viewerId) return false;
      if (!term) return true;
      const hay = `${post.title ?? ""} ${post.body ?? ""} ${(post.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(term);
    });
  }, [forums, forumQuery, myForumsOnly, viewerId]);

  async function submitOpportunity() {
    if (!oppForm.title.trim()) {
      toast.error("Add a title to post an opportunity");
      return;
    }
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("title", oppForm.title);
      formData.append("summary", oppForm.summary);
      formData.append("tags", oppForm.tags);
      formData.append("askAmount", oppForm.askAmount);
      formData.append("askCurrency", oppForm.askCurrency);
      formData.append("expectedRoiPercent", oppForm.expectedRoiPercent);

      const res = await fetch("/api/user/opportunities", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to post opportunity");
      setOpportunities((prev) => [data.opportunity, ...prev]);
      setOppForm({
        title: "",
        summary: "",
        tags: "",
        askAmount: "",
        askCurrency: "USD",
        expectedRoiPercent: "",
      });
      setCreateOpen(false);
      toast.success("Opportunity posted");
    } catch (e) {
      console.error(e);
      toast.error("Unable to post opportunity");
    } finally {
      setPosting(false);
    }
  }

  async function submitForum() {
    if (!forumForm.title.trim() || !forumForm.body.trim()) {
      toast.error("Add a title and discussion");
      return;
    }
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("title", forumForm.title);
      formData.append("body", forumForm.body);
      formData.append("tags", forumForm.tags);

      const res = await fetch("/api/forums", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to post forum");
      setForums((prev) => [data.post, ...prev]);
      setForumForm({ title: "", body: "", tags: "" });
      setCreateOpen(false);
      toast.success("Forum post published");
    } catch (e) {
      console.error(e);
      toast.error("Unable to post forum");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home feed</h1>
          <p className="text-sm text-muted-foreground">
            Track opportunities, conversations, and investor discovery in one place.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create something new</DialogTitle>
            </DialogHeader>
            <Tabs value={createTab} onValueChange={(value) => setCreateTab(value as typeof createTab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="opportunity">Opportunity</TabsTrigger>
                <TabsTrigger value="forum">Forum post</TabsTrigger>
              </TabsList>
              <TabsContent value="opportunity" className="space-y-3 pt-4">
                <Input
                  placeholder="Opportunity title"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                />
                <Textarea
                  placeholder="Short summary"
                  value={oppForm.summary}
                  onChange={(e) => setOppForm({ ...oppForm, summary: e.target.value })}
                  rows={4}
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Tags (comma-separated)"
                      value={oppForm.tags}
                      onChange={(e) => setOppForm({ ...oppForm, tags: e.target.value })}
                    />
                  </div>
                  <div>
                    <Select
                      value={oppForm.askCurrency}
                      onValueChange={(value) => setOppForm({ ...oppForm, askCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Ask amount"
                    type="number"
                    value={oppForm.askAmount}
                    onChange={(e) => setOppForm({ ...oppForm, askAmount: e.target.value })}
                  />
                  <Input
                    placeholder="Expected ROI %"
                    type="number"
                    value={oppForm.expectedRoiPercent}
                    onChange={(e) => setOppForm({ ...oppForm, expectedRoiPercent: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitOpportunity} disabled={posting}>
                    {posting ? "Posting..." : "Post opportunity"}
                  </Button>
                </DialogFooter>
              </TabsContent>
              <TabsContent value="forum" className="space-y-3 pt-4">
                <Input
                  placeholder="Discussion title"
                  value={forumForm.title}
                  onChange={(e) => setForumForm({ ...forumForm, title: e.target.value })}
                />
                <Textarea
                  placeholder="Share your question or insight"
                  value={forumForm.body}
                  onChange={(e) => setForumForm({ ...forumForm, body: e.target.value })}
                  rows={4}
                />
                <Input
                  placeholder="Tags (comma-separated)"
                  value={forumForm.tags}
                  onChange={(e) => setForumForm({ ...forumForm, tags: e.target.value })}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitForum} disabled={posting}>
                    {posting ? "Posting..." : "Post to forums"}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="opportunities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="forums">Forums</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opportunity filters</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <Input
                placeholder="Search by title or tag"
                value={oppQuery}
                onChange={(e) => setOppQuery(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={myOppsOnly}
                  onChange={(e) => setMyOppsOnly(e.target.checked)}
                />
                My posts only
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={boostedFirst}
                  onChange={(e) => setBoostedFirst(e.target.checked)}
                />
                Boosted first
              </label>
            </CardContent>
          </Card>
          {loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full" />
              ))}
            </div>
          )}
          {!loading && filteredOpps.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No opportunities match your filters yet.
              </CardContent>
            </Card>
          )}
          {!loading && filteredOpps.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredOpps.map((opp) => (
                <OpportunityCard key={opp.id} opp={opp} onActionUpdated={() => {}} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="forums" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forum filters</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <Input
                placeholder="Search by title, tags, or body"
                value={forumQuery}
                onChange={(e) => setForumQuery(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={myForumsOnly}
                  onChange={(e) => setMyForumsOnly(e.target.checked)}
                />
                My posts only
              </label>
            </CardContent>
          </Card>
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}
          {!loading && filteredForums.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No forum posts found. Start a new discussion above.
              </CardContent>
            </Card>
          )}
          {!loading && filteredForums.length > 0 && (
            <div className="space-y-3">
              {filteredForums.map((post) => (
                <Card key={post.id}>
                  <CardContent className="space-y-2 py-4">
                    <Link href={`/forums/${post.id}`} className="text-base font-semibold hover:underline">
                      {post.title}
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.body}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {(post.tags ?? []).slice(0, 4).map((tag: string) => (
                        <span key={tag} className="rounded-full border px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discover investors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label>Search people</Label>
              <Input
                placeholder="Search by username or email"
                value={peopleQuery}
                onChange={(e) => setPeopleQuery(e.target.value)}
              />
              {peopleLoading && <div className="text-sm text-muted-foreground">Searching...</div>}
            </CardContent>
          </Card>
          {!peopleLoading && peopleQuery.trim() !== "" && peopleResults.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No users found. Try another keyword.
              </CardContent>
            </Card>
          )}
          {peopleResults.length > 0 && (
            <div className="space-y-3">
              {peopleResults.map((user) => {
                const name = user.profile?.username || user.profile?.name || user.email;
                return (
                  <Card key={user.id}>
                    <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.profile?.username ? `@${user.profile.username}` : user.email}
                        </div>
                      </div>
                      <Button asChild variant="outline">
                        <Link href={`/users/${user.id}`}>View profile</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
