import { Link, useLocation, useParams } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Flag, HelpCircle, Lightbulb, MessageCircle, MoreHorizontal, Pencil, Share2, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CommentSection, type CommentItem } from "@/components/social/CommentSection";
import { RichText } from "@/components/social/RichText";
import { UserAvatar, displayName, profileHref } from "@/components/social/UserAvatar";
import { useViewer } from "@/components/social/useViewer";
import { cn } from "@/lib/utils";
import { fullDate, timeAgo } from "@/lib/time";

type ReactionType = "LIKE" | "INSIGHTFUL" | "CURIOUS";

type Post = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  imageUrl?: string | null;
  tags?: string[];
  userId: string;
  reactions?: { type: ReactionType; userId: string }[];
  saves?: unknown[];
  user?: { id: string; profile?: { username?: string | null; name?: string | null; imageUrl?: string | null } | null };
};

const REACTIONS: { type: ReactionType; label: string; icon: typeof ThumbsUp }[] = [
  { type: "LIKE", label: "Like", icon: ThumbsUp },
  { type: "INSIGHTFUL", label: "Insightful", icon: Lightbulb },
  { type: "CURIOUS", label: "Curious", icon: HelpCircle },
];

export default function ForumDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const viewer = useViewer();
  const [post, setPost] = useState<Post | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", body: "", tags: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

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
      const p: Post = data.post;
      setPost(p);
      setViewerId(data.viewerId ?? null);
      setSaved((p.saves?.length ?? 0) > 0);
      setComments((data.post as any)?.comments ?? []);
      setEditForm({ title: p.title, body: p.body, tags: (p.tags ?? []).join(", ") });
    } catch (e) {
      console.error(e);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params?.id]);

  const isOwner = Boolean(viewerId && post?.userId === viewerId);
  const reactionState = useMemo(() => {
    const list = post?.reactions ?? [];
    return Object.fromEntries(
      REACTIONS.map(({ type }) => [type, { count: list.filter((r) => r.type === type).length, active: list.some((r) => r.type === type && r.userId === viewerId) }])
    ) as Record<ReactionType, { count: number; active: boolean }>;
  }, [post, viewerId]);

  async function toggleReaction(type: ReactionType) {
    if (!post || !viewerId) return;
    const was = reactionState[type].active;
    // Optimistic: flip locally, roll back on failure.
    setPost((prev) =>
      prev
        ? {
            ...prev,
            reactions: was
              ? (prev.reactions ?? []).filter((r) => !(r.type === type && r.userId === viewerId))
              : [...(prev.reactions ?? []), { type, userId: viewerId }],
          }
        : prev
    );
    const res = await fetch(`/api/forums/${post.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type }),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't update your reaction");
      load();
    }
  }

  async function toggleSave() {
    if (!post) return;
    setSaved((s) => !s);
    const res = await fetch(`/api/forums/${post.id}/save`, { method: "POST", credentials: "include" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setSaved((s) => !s);
      toast.error("Couldn't save this thread");
      return;
    }
    toast.success(data?.saved ? "Saved to your bookmarks" : "Removed from bookmarks");
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: post?.title, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success("Link copied");
    }
  }

  async function submitComment(body: string) {
    if (!post) return false;
    const res = await fetch(`/api/forums/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(data?.error ?? "Couldn't post your comment");
      return false;
    }
    setComments((prev) => [...prev, data.comment]);
    return true;
  }

  async function deleteComment(comment: CommentItem) {
    if (!post) return;
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    const res = await fetch(`/api/forums/${post.id}/comments/${comment.id}`, { method: "DELETE", credentials: "include" }).catch(() => null);
    if (!res?.ok) {
      setComments(previous);
      toast.error("Couldn't delete comment");
    }
  }

  async function saveEdits() {
    if (!post) return;
    const res = await fetch(`/api/forums/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editForm),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(data?.error ?? "Couldn't update post");
      return;
    }
    setEditOpen(false);
    setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
    toast.success("Post updated");
  }

  async function deletePost() {
    if (!post || !window.confirm("Delete this thread? This can't be undone.")) return;
    const res = await fetch(`/api/forums/${post.id}`, { method: "DELETE", credentials: "include" }).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't delete post");
      return;
    }
    toast.success("Thread deleted");
    navigate("/forums");
  }

  async function submitReport() {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetType: "FORUM_POST", targetId: post?.id, reason: reportReason }),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't submit report");
      return;
    }
    toast.success("Thanks. Our team will review it.");
    setReportOpen(false);
    setReportReason("");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-2xl border bg-card py-16 text-center">
        <p className="font-semibold">This thread isn't available</p>
        <p className="text-sm text-muted-foreground">It may have been removed by its author.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/forums">Back to community</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/forums" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Community
      </Link>

      <article className="rounded-2xl border bg-card">
        <header className="flex items-center gap-3 px-4 pt-4 sm:px-5">
          <Link href={profileHref(post.user)}>
            <UserAvatar user={post.user} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={profileHref(post.user)} className="text-sm font-semibold hover:underline">
              {displayName(post.user)}
            </Link>
            <div className="text-xs text-muted-foreground" title={fullDate(post.createdAt)}>
              {timeAgo(post.createdAt)}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Post options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner ? (
                <>
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={deletePost}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setReportOpen(true)}>
                  <Flag className="mr-2 h-4 w-4" /> Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="space-y-3 px-4 pb-2 pt-3 sm:px-5">
          <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{post.title}</h1>
          <RichText text={post.body} className="block text-[15px] leading-relaxed text-foreground/90" />
          {post.imageUrl && <img src={post.imageUrl} alt="" className="max-h-[480px] w-full rounded-xl border object-cover" />}
          {(post.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(post.tags ?? []).map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-1 border-t px-2 py-1.5 sm:px-3">
          {REACTIONS.map(({ type, label, icon: Icon }) => {
            const { count, active } = reactionState[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleReaction(type)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
                  active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "fill-current")} />
                <span className="hidden sm:inline">{label}</span>
                {count > 0 && <span className="tabular-nums">{count}</span>}
              </button>
            );
          })}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{comments.length}</span>
          </span>
          <div className="ml-auto flex items-center">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground" onClick={share} aria-label="Share">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 rounded-full", saved ? "text-primary" : "text-muted-foreground")}
              onClick={toggleSave}
              aria-label={saved ? "Remove bookmark" : "Bookmark"}
              aria-pressed={saved}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
            </Button>
          </div>
        </footer>
      </article>

      <CommentSection
        comments={comments}
        viewer={viewer}
        viewerId={viewerId}
        onSubmit={submitComment}
        onDelete={deleteComment}
        canDelete={(c) => (c.user?.id ?? c.userId) === viewerId || isOwner}
        placeholder="Share your take..."
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit thread</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
            <Textarea rows={8} value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} />
            <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="Tags, comma separated" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdits}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this thread</DialogTitle>
          </DialogHeader>
          <Textarea rows={4} value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="What's wrong with this post?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReport} disabled={!reportReason.trim()}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
