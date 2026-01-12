"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ForumPost = any;

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

  async function loadTagFollows() {
    try {
      const res = await fetch("/api/user/tag-follows?source=FORUM", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load tags");
      setTagFollows((data.follows ?? []).map((f: any) => f.tag));
    } catch (e) {
      console.error(e);
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
      setTagFollows((prev) =>
        isFollowing ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
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

      const res = await fetch("/api/forums", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
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

  async function toggleReaction(postId: string, type: string) {
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

  const filteredPosts = posts.filter((post) => {
    if (myPostsOnly && viewerId && post.userId !== viewerId) return false;
    if (followingTagsOnly && tagFollows.length) {
      const tags = post.tags ?? [];
      if (!tags.some((tag: string) => tagFollows.includes(tag))) return false;
    }
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const hay = `${post.title ?? ""} ${post.body ?? ""} ${(post.tags ?? []).join(" ")}`.toLowerCase();
    return hay.includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forums</h1>
          <p className="text-muted-foreground">
            Share investments, outlooks, and questions with the community.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Start a discussion</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Start a discussion</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Share your thoughts..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
              />
              <Input
                placeholder="Tags (comma-separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createPost}>Post to forums</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search forums by keyword, question, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <Checkbox checked={myPostsOnly} onCheckedChange={(val) => setMyPostsOnly(Boolean(val))} />
            See my posts only
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={followingTagsOnly} onCheckedChange={(val) => setFollowingTagsOnly(Boolean(val))} />
            Following tags only
          </label>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {!loading && filteredPosts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No forum posts yet.
          </CardContent>
        </Card>
      )}

      {!loading && filteredPosts.length > 0 && (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {filteredPosts.map((post) => {
            const userLabel =
              post.user?.profile?.username || post.user?.profile?.name || post.user?.email || "Private user";
            const isVerified = Boolean(post.user?.profile?.emailVerified && post.user?.profile?.phoneVerified);
            const isIdentityVerified = Boolean(post.user?.profile?.identityVerified);
            const reactions = post.reactions ?? [];
            const counts = {
              LIKE: reactions.filter((r: any) => r.type === "LIKE").length,
              INSIGHTFUL: reactions.filter((r: any) => r.type === "INSIGHTFUL").length,
              CURIOUS: reactions.filter((r: any) => r.type === "CURIOUS").length,
            };
            return (
              <Card key={post.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">
                      <Link href={`/forums/${post.id}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </CardTitle>
                    {viewerId && post.userId === viewerId && (
                      <Badge variant="outline">Your post</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {userLabel}
                    {isIdentityVerified ? " • Verified ID" : ""}
                    {isVerified ? " • Verified contact" : ""}
                    {" • "}
                    {new Date(post.createdAt).toLocaleString()}
                  </div>
                  {post.imageUrl && (
                    <div className="overflow-hidden rounded-md border bg-muted/20">
                      <img src={post.imageUrl} alt={post.title} className="h-44 w-full object-cover" />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground line-clamp-3">{post.body}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Button size="sm" variant="outline" onClick={() => toggleReaction(post.id, "LIKE")}>
                      👍 {counts.LIKE}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleReaction(post.id, "INSIGHTFUL")}>
                      💡 {counts.INSIGHTFUL}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleReaction(post.id, "CURIOUS")}>
                      ❓ {counts.CURIOUS}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(post.tags ?? []).map((tag: string) => {
                      const isFollowing = tagFollows.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTagFollow(tag)}
                          className="flex items-center gap-2"
                        >
                          <Badge variant={isFollowing ? "default" : "secondary"}>{tag}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {isFollowing ? "Following" : "Follow"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/forums/${post.id}`}>View discussion</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
