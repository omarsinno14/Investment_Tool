

import { Link } from "wouter";
import { useParams, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Flag, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user?: { email?: string; profile?: { username?: string | null; name?: string | null } | null };
};

type Post = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  archivedAt?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  userId: string;
  reactions?: { type: "LIKE" | "INSIGHTFUL" | "CURIOUS"; userId: string }[];
  user?: { email?: string; profile?: { username?: string | null; name?: string | null } | null };
};

export default function ForumDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", body: "", tags: "" });
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  async function load() {
    const id = params?.id;
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/forums/${id}`, { credentials: "include" });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load post");
      setPost(data.post ?? null);
      setViewerId(data.viewerId ?? null);
      setEditForm({ title: data.post?.title ?? "", body: data.post?.body ?? "", tags: (data.post?.tags ?? []).join(", ") });
      await loadComments(id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params?.id]);

  const isOwner = Boolean(viewerId && post?.userId === viewerId);
  const counts = useMemo(() => {
    const reactions = post?.reactions ?? [];
    return {
      LIKE: reactions.filter((r) => r.type === "LIKE").length,
      INSIGHTFUL: reactions.filter((r) => r.type === "INSIGHTFUL").length,
      CURIOUS: reactions.filter((r) => r.type === "CURIOUS").length,
    };
  }, [post]);

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

  async function toggleReaction(type: "LIKE" | "INSIGHTFUL" | "CURIOUS") {
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

  async function submitReport() {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetType: "FORUM_POST", targetId: post?.id, reason: reportReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to report");
      toast.success("Report submitted");
      setReportOpen(false);
      setReportReason("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit report");
    }
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  if (!post) return <Card><CardContent className="py-10 text-center text-muted-foreground">Post not found.</CardContent></Card>;

  const author = post.user?.profile?.username || post.user?.profile?.name || post.user?.email || "Private user";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="px-0" asChild><Link href="/forums">Back to forums</Link></Button>
      <Card className="rounded-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl">{post.title}</CardTitle>
            {isOwner ? (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild><Button variant="outline" size="sm">Edit post</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Edit post</DialogTitle></DialogHeader>
                  <div className="space-y-3"><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /><Textarea rows={6} value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} /><Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} /></div>
                  <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={saveEdits}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Flag className="h-4 w-4" />Report</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Report this post</DialogTitle></DialogHeader><Textarea rows={4} value={reportReason} onChange={(e) => setReportReason(e.target.value)} /><DialogFooter><Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button><Button onClick={submitReport} disabled={!reportReason.trim()}>Submit</Button></DialogFooter></DialogContent>
              </Dialog>
            )}
          </div>
          <div className="text-xs text-muted-foreground">u/{author} • {new Date(post.createdAt).toLocaleString()}</div>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{post.body}</p>
          {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="max-h-[360px] w-full rounded-xl border object-cover" />}
          <div className="flex flex-wrap gap-2">{(post.tags ?? []).map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Button size="sm" variant="outline" onClick={() => toggleReaction("LIKE")}>👍 {counts.LIKE}</Button>
            <Button size="sm" variant="outline" onClick={() => toggleReaction("INSIGHTFUL")}>💡 {counts.INSIGHTFUL}</Button>
            <Button size="sm" variant="outline" onClick={() => toggleReaction("CURIOUS")}>❓ {counts.CURIOUS}</Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Comments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {comments.length === 0 ? <div className="text-sm text-muted-foreground">No comments yet.</div> : comments.map((comment) => {
              const commentAuthor = comment.user?.profile?.username || comment.user?.profile?.name || comment.user?.email || "User";
              const isCollapsed = collapsed[comment.id];
              return (
                <div key={comment.id} className="rounded-xl border p-3">
                  <button type="button" onClick={() => setCollapsed((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))} className="flex w-full items-center justify-between text-left">
                    <div className="text-xs text-muted-foreground">u/{commentAuthor} • {new Date(comment.createdAt).toLocaleString()}</div>
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {!isCollapsed && <div className="mt-2 text-sm text-muted-foreground">{comment.body}</div>}
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <Textarea placeholder="Add a comment" rows={3} value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
            <Button onClick={sendComment} className="gap-2"><MessageSquarePlus className="h-4 w-4" />Comment</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
