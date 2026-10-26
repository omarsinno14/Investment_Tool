import { Link, useParams } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Flag, Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CommentSection, type CommentItem } from "@/components/social/CommentSection";
import { RichText } from "@/components/social/RichText";
import { UserAvatar, displayName, profileHref } from "@/components/social/UserAvatar";
import { useViewer } from "@/components/social/useViewer";
import { fullDate, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type HubPost = {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  authorUserId: string;
  newsHeadline?: string | null;
  newsUrl?: string | null;
  newsSource?: string | null;
  opportunityId?: string | null;
  author?: { id: string; profile?: { name?: string | null; username?: string | null; imageUrl?: string | null } | null };
  hub?: { id: string; name: string; slug: string; ownerUserId: string };
  comments?: CommentItem[];
  reactions?: { id: string; type: string; userId: string }[];
};

export default function HubPostDetailPage() {
  const params = useParams<{ slug: string; postId: string }>();
  const viewer = useViewer();
  const [post, setPost] = useState<HubPost | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const base = `/api/hubs/${params.slug}/posts/${params.postId}`;

  async function load() {
    const res = await fetch(base, { credentials: "include" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error ?? "Unable to load post");
      setStatus("error");
      return;
    }
    setPost(data.post);
    setComments(data.post.comments ?? []);
    setViewerId(data.viewerId ?? null);
    setStatus("ready");
  }

  useEffect(() => {
    load();
  }, [params.slug, params.postId]);

  const likes = useMemo(() => (post?.reactions ?? []).filter((r) => r.type === "LIKE"), [post]);
  const liked = likes.some((r) => r.userId === viewerId);

  async function toggleLike() {
    if (!post || !viewerId) return;
    const previous = post;
    setPost({
      ...post,
      reactions: liked
        ? (post.reactions ?? []).filter((r) => !(r.type === "LIKE" && r.userId === viewerId))
        : [...(post.reactions ?? []), { id: "local", type: "LIKE", userId: viewerId }],
    });
    const res = await fetch(`${base}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "LIKE" }),
    }).catch(() => null);
    if (!res?.ok) {
      setPost(previous);
      toast.error("Couldn't update your like");
    }
  }

  async function submitComment(body: string) {
    const res = await fetch(`${base}/comments`, {
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
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    const res = await fetch(`${base}/comments/${comment.id}`, { method: "DELETE", credentials: "include" }).catch(() => null);
    if (!res?.ok) {
      setComments(previous);
      toast.error("Couldn't delete comment");
    }
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: post?.title, url }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success("Link copied");
    }
  }

  async function reportPost() {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetType: "HUB_POST", targetId: params.postId, reason: reportReason }),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't submit report");
      return;
    }
    toast.success("Thanks. Our team will review it.");
    setReportReason("");
    setReportOpen(false);
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (status === "error" || !post) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-2xl border bg-card py-16 text-center">
        <p className="font-semibold">{error ?? "Post not found"}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/hubs/${params.slug}`}>Back to circle</Link>
        </Button>
      </div>
    );
  }

  const moderator = viewerId && (viewerId === post.authorUserId || viewerId === post.hub?.ownerUserId);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/hubs/${params.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {post.hub?.name ?? "Circle"}
      </Link>

      <article className="rounded-2xl border bg-card">
        <header className="flex items-center gap-3 px-4 pt-4 sm:px-5">
          <Link href={profileHref(post.author)}>
            <UserAvatar user={post.author} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm">
              <Link href={profileHref(post.author)} className="font-semibold hover:underline">
                {displayName(post.author)}
              </Link>
              <span className="text-muted-foreground">in</span>
              <Link href={`/hubs/${params.slug}`} className="truncate font-medium hover:underline">
                {post.hub?.name}
              </Link>
            </div>
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
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Flag className="mr-2 h-4 w-4" /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="space-y-3 px-4 pb-2 pt-3 sm:px-5">
          <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{post.title}</h1>
          <RichText text={post.body} className="block text-[15px] leading-relaxed text-foreground/90" />
          {post.newsUrl && (
            <a
              href={post.newsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3 transition hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{post.newsSource ?? "News"}</div>
                <div className="line-clamp-2 text-sm font-medium">{post.newsHeadline ?? post.newsUrl}</div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )}
          {post.opportunityId && (
            <Link href={`/opportunities/${post.opportunityId}`} className="inline-flex text-sm font-medium text-primary hover:underline">
              View the linked opportunity
            </Link>
          )}
        </div>

        <footer className="flex items-center gap-1 border-t px-2 py-1.5 sm:px-3">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
              liked ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            {likes.length > 0 ? <span className="tabular-nums">{likes.length}</span> : <span>Like</span>}
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{comments.length}</span>
          </span>
          <Button variant="ghost" size="icon" className="ml-auto h-9 w-9 rounded-full text-muted-foreground" onClick={share} aria-label="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        </footer>
      </article>

      <CommentSection
        comments={comments}
        viewer={viewer}
        viewerId={viewerId}
        onSubmit={submitComment}
        onDelete={deleteComment}
        canDelete={(c) => (c.user?.id ?? c.userId) === viewerId || Boolean(moderator)}
        placeholder="Add to the discussion..."
      />

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this post</DialogTitle>
          </DialogHeader>
          <Textarea rows={4} value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="What's wrong with this post?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={reportPost} disabled={!reportReason.trim()}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
