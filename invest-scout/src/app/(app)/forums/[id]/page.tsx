"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ForumDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<any | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", body: "", tags: "" });
  const [loading, setLoading] = useState(true);

  async function load() {
    const id = params?.id;
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/forums/${id}`, { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load post");
      setPost(data.post ?? null);
      setViewerId(data.viewerId ?? null);
      setEditForm({
        title: data.post?.title ?? "",
        body: data.post?.body ?? "",
        tags: (data.post?.tags ?? []).join(", "),
      });
      await loadComments(id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  }

  async function loadComments(id: string) {
    try {
      const res = await fetch(`/api/forums/${id}/comments`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load comments");
      setComments(data.comments ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load comments");
    }
  }

  async function sendComment() {
    const id = params?.id;
    if (!id || !commentDraft.trim()) return;
    try {
      const res = await fetch(`/api/forums/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: commentDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to comment");
      setCommentDraft("");
      await loadComments(id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to comment");
    }
  }

  async function saveEdits() {
    const id = params?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/forums/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: editForm.title, body: editForm.body, tags: editForm.tags }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to update");
      setEditOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update post");
    }
  }

  async function toggleArchive() {
    const id = params?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/forums/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: !post?.archivedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to update");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update post");
    }
  }

  async function deletePost() {
    const id = params?.id;
    if (!id) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/forums/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete");
      router.push("/forums");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete post");
    }
  }

  async function toggleReaction(type: string) {
    const id = params?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/forums/${id}/reactions`, {
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
  }, [params?.id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Post not found.</CardContent>
      </Card>
    );
  }

  const userLabel = post.user?.profile?.username || post.user?.profile?.name || post.user?.email;
  const isVerified = Boolean(post.user?.profile?.emailVerified && post.user?.profile?.phoneVerified);
  const isIdentityVerified = Boolean(post.user?.profile?.identityVerified);
  const isOwner = viewerId && post.userId === viewerId;
  const reactions = post.reactions ?? [];
  const counts = {
    LIKE: reactions.filter((r: any) => r.type === "LIKE").length,
    INSIGHTFUL: reactions.filter((r: any) => r.type === "INSIGHTFUL").length,
    CURIOUS: reactions.filter((r: any) => r.type === "CURIOUS").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" className="px-0" asChild>
          <Link href="/forums">Back to forums</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl">{post.title}</CardTitle>
            {isOwner && (
              <div className="flex flex-wrap gap-2">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Edit</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Edit discussion</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                      <Textarea value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} rows={5} />
                      <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                      <Button onClick={saveEdits}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={toggleArchive}>
                  {post.archivedAt ? "Restore" : "Archive"}
                </Button>
                <Button variant="destructive" size="sm" onClick={deletePost}>Delete</Button>
              </div>
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
              <img src={post.imageUrl} alt={post.title} className="h-56 w-full object-cover" />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground whitespace-pre-line">{post.body}</div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Button size="sm" variant="outline" onClick={() => toggleReaction("LIKE")}>
              👍 {counts.LIKE}
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggleReaction("INSIGHTFUL")}>
              💡 {counts.INSIGHTFUL}
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggleReaction("CURIOUS")}>
              ❓ {counts.CURIOUS}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(post.tags ?? []).map((tag: string) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 && (
            <div className="text-sm text-muted-foreground">No comments yet.</div>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="border rounded-md p-3 text-sm">
              <div className="text-xs text-muted-foreground">
                {comment.user?.profile?.username || comment.user?.profile?.name || comment.user?.email}
              </div>
              <div className="mt-1 text-muted-foreground">{comment.body}</div>
            </div>
          ))}
          <div className="space-y-2">
            <Textarea
              placeholder="Write a comment"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={3}
            />
            <Button onClick={sendComment}>Reply</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
