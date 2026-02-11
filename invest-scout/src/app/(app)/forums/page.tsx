"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowBigDown, ArrowBigUp, Clock3, Flame, MessageCircleMore, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type ForumReaction = { userId: string; type: "LIKE" | "INSIGHTFUL" | "CURIOUS" };
type ForumPost = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  tags?: string[];
  userId: string;
  createdAt: string;
  comments?: { id: string }[];
  reactions?: ForumReaction[];
  user?: {
    email?: string;
    profile?: { username?: string | null; name?: string | null } | null;
  };
};

type SortMode = "HOT" | "NEW" | "TOP";

export default function ForumsPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [myPostsOnly, setMyPostsOnly] = useState(false);
  const [tagFollows, setTagFollows] = useState<string[]>([]);
  const [followingTagsOnly, setFollowingTagsOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("HOT");

  async function loadTagFollows() {
    try {
      const res = await fetch("/api/user/tag-follows?source=FORUM", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load tags");
      setTagFollows((data.follows ?? []).map((f: { tag: string }) => f.tag));
    } catch (e) {
      console.error(e);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/forums", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load forums");
      setPosts(data.posts ?? []);
      setViewerId(data.viewerId ?? null);
      await loadTagFollows();
    } catch (e) {
      console.error(e);
      toast.error("Failed to load forums");
    } finally {
      setLoading(false);
    }
  }

  async function toggleTagFollow(tag: string) {
    const isFollowing = tagFollows.includes(tag);
    try {
      const res = await fetch("/api/user/tag-follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tag, source: "FORUM", action: isFollowing ? "remove" : "add" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to update tag");
      setTagFollows((prev) => (isFollowing ? prev.filter((t) => t !== tag) : [...prev, tag]));
    } catch (e) {
      console.error(e);
      toast.error("Unable to update tag follow");
    }
  }

  async function createPost() {
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and discussion");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("body", body);
      formData.append("tags", tags);
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch("/api/forums", { method: "POST", credentials: "include", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to post");
      setTitle("");
      setBody("");
      setTags("");
      setImageFile(null);
      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create post");
    }
  }

  async function toggleReaction(postId: string, type: ForumReaction["type"]) {
    try {
      const res = await fetch(`/api/forums/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to react");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update reaction");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredPosts = useMemo(() => {
    let next = posts.filter((post) => {
      if (myPostsOnly && viewerId && post.userId !== viewerId) return false;
      if (followingTagsOnly && tagFollows.length && !(post.tags ?? []).some((tag) => tagFollows.includes(tag))) return false;
      const term = search.trim().toLowerCase();
      if (!term) return true;
      const hay = `${post.title ?? ""} ${post.body ?? ""} ${(post.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(term);
    });

    next = [...next].sort((a, b) => {
      if (sortMode === "NEW") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const aVotes = (a.reactions ?? []).length;
      const bVotes = (b.reactions ?? []).length;
      if (sortMode === "TOP") return bVotes - aVotes;
      const aComments = a.comments?.length ?? 0;
      const bComments = b.comments?.length ?? 0;
      const aRecency = Date.now() - new Date(a.createdAt).getTime();
      const bRecency = Date.now() - new Date(b.createdAt).getTime();
      return (bVotes * 2 + bComments) / Math.max(1, bRecency / 3.6e6) - (aVotes * 2 + aComments) / Math.max(1, aRecency / 3.6e6);
    });

    return next;
  }, [posts, myPostsOnly, viewerId, followingTagsOnly, tagFollows, search, sortMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forums</h1>
          <p className="text-muted-foreground">Reddit-style discussions on investing, markets, and opportunities.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Create post</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create a new post</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="What do you want to discuss?" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
              <Input placeholder="Tags/flair (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={createPost}>Post</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
          <Input placeholder="Search title, body, tags..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant={sortMode === "HOT" ? "default" : "outline"} onClick={() => setSortMode("HOT")}><Flame className="mr-1 h-4 w-4" />Hot</Button>
            <Button size="sm" variant={sortMode === "NEW" ? "default" : "outline"} onClick={() => setSortMode("NEW")}><Clock3 className="mr-1 h-4 w-4" />New</Button>
            <Button size="sm" variant={sortMode === "TOP" ? "default" : "outline"} onClick={() => setSortMode("TOP")}><TrendingUp className="mr-1 h-4 w-4" />Top</Button>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <label className="flex items-center gap-2"><Checkbox checked={myPostsOnly} onCheckedChange={(val) => setMyPostsOnly(Boolean(val))} />My posts</label>
            <label className="flex items-center gap-2"><Checkbox checked={followingTagsOnly} onCheckedChange={(val) => setFollowingTagsOnly(Boolean(val))} />Following tags</label>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
      ) : filteredPosts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No posts matched your filters yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const reactions = post.reactions ?? [];
            const counts = {
              LIKE: reactions.filter((r) => r.type === "LIKE").length,
              INSIGHTFUL: reactions.filter((r) => r.type === "INSIGHTFUL").length,
              CURIOUS: reactions.filter((r) => r.type === "CURIOUS").length,
            };
            const author = post.user?.profile?.username || post.user?.profile?.name || post.user?.email || "Private user";
            return (
              <Card key={post.id} className="rounded-2xl border transition hover:shadow-md">
                <CardContent className="grid gap-4 p-4 md:grid-cols-[auto_1fr]">
                  <div className="flex flex-row gap-1 md:flex-col">
                    <Button size="icon" variant="ghost" aria-label="Upvote" onClick={() => toggleReaction(post.id, "LIKE")}><ArrowBigUp className="h-4 w-4" /></Button>
                    <span className="px-2 text-center text-xs font-medium text-muted-foreground">{counts.LIKE + counts.INSIGHTFUL + counts.CURIOUS}</span>
                    <Button size="icon" variant="ghost" aria-label="Downvote" onClick={() => toggleReaction(post.id, "CURIOUS")}><ArrowBigDown className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>u/{author}</span><span>•</span><span>{new Date(post.createdAt).toLocaleString()}</span>
                      {viewerId && post.userId === viewerId && <Badge variant="outline">Your post</Badge>}
                    </div>
                    <CardTitle className="text-lg leading-tight"><Link href={`/forums/${post.id}`} className="hover:underline">{post.title}</Link></CardTitle>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{post.body}</p>
                    {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="h-52 w-full rounded-xl border object-cover" />}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="ghost" size="sm" asChild><Link href={`/forums/${post.id}`} className="gap-2"><MessageCircleMore className="h-4 w-4" />{post.comments?.length ?? 0} comments</Link></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleReaction(post.id, "INSIGHTFUL")}>💡 {counts.INSIGHTFUL}</Button>
                      {(post.tags ?? []).map((tag) => (
                        <button key={tag} type="button" onClick={() => toggleTagFollow(tag)}><Badge variant={tagFollows.includes(tag) ? "default" : "secondary"}>#{tag}</Badge></button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
