"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ForumPost = any;

export default function ForumsPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});

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
    } catch (e) {
      console.error(e);
      toast.error("Failed to load forums");
    } finally {
      setLoading(false);
    }
  }

  async function createPost() {
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and discussion");
      return;
    }
    try {
      const res = await fetch("/api/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to post");
      setTitle("");
      setBody("");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create post");
    }
  }

  async function loadComments(postId: string) {
    try {
      const res = await fetch(`/api/forums/${postId}/comments`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load comments");
      setComments((prev) => ({ ...prev, [postId]: data.comments ?? [] }));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load comments");
    }
  }

  async function sendComment(postId: string) {
    const draft = commentDrafts[postId] ?? "";
    if (!draft.trim()) return;
    try {
      const res = await fetch(`/api/forums/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to comment");
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      await loadComments(postId);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to comment");
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
      toast.error("Failed to react");
    }
  }

  async function toggleSave(postId: string) {
    try {
      const res = await fetch(`/api/forums/${postId}/save`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save post");
    }
  }

  async function toggleRepost(postId: string) {
    try {
      const res = await fetch(`/api/forums/${postId}/repost`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to repost");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to repost");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forums</h1>
        <p className="text-muted-foreground">
          Share investments, outlooks, and questions with the community.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start a discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Share your thoughts..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />
          <Button onClick={createPost}>Post to forums</Button>
        </CardContent>
      </Card>

      {loading && <div>Loading...</div>}
      {!loading && posts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No forum posts yet.
          </CardContent>
        </Card>
      )}

      {!loading && posts.map((post) => {
        const reactionCount = post.reactions?.length ?? 0;
        const commentCount = post.comments?.length ?? 0;
        const saveCount = post.saves?.length ?? 0;
        const repostCount = post.reposts?.length ?? 0;
        const userLabel = post.user?.profile?.username || post.user?.profile?.name || post.user?.email;
        const isVerified = Boolean(post.user?.profile?.emailVerified && post.user?.profile?.phoneVerified);

        return (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle className="text-base">{post.title}</CardTitle>
              <div className="text-xs text-muted-foreground">
                {userLabel} {isVerified ? "• Verified" : ""} • {new Date(post.createdAt).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">{post.body}</div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{reactionCount} reactions</span>
                <span>{commentCount} comments</span>
                <span>{saveCount} saves</span>
                <span>{repostCount} reposts</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleReaction(post.id, "LIKE")}>
                  Like
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleReaction(post.id, "INSIGHTFUL")}>
                  Insightful
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleReaction(post.id, "CURIOUS")}>
                  Curious
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleSave(post.id)}>
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleRepost(post.id)}>
                  Repost
                </Button>
                <Button variant="ghost" size="sm" onClick={() => loadComments(post.id)}>
                  Load comments
                </Button>
              </div>
              {(comments[post.id] ?? []).map((comment) => (
                <div key={comment.id} className="text-sm text-muted-foreground border-t pt-2">
                  <div className="text-xs">
                    {comment.user?.profile?.username || comment.user?.profile?.name || comment.user?.email}
                  </div>
                  {comment.body}
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment"
                  value={commentDrafts[post.id] ?? ""}
                  onChange={(e) =>
                    setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                />
                <Button size="sm" onClick={() => sendComment(post.id)}>Reply</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
