"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Flag, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function HubPostDetailPage() {
  const params = useParams<{ slug: string; postId: string }>();
  const [post, setPost] = useState<any>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [reportReason, setReportReason] = useState("");

  async function load() {
    const res = await fetch(`/api/hubs/${params.slug}/posts/${params.postId}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Unable to load post");
    setPost(data.post);
    setViewerId(data.viewerId ?? null);
  }

  useEffect(() => { load(); }, [params.slug, params.postId]);

  const liked = useMemo(() => Boolean(post?.reactions?.find((r: any) => r.type === "LIKE" && r.userId === viewerId)), [post, viewerId]);

  async function toggleLike() {
    const res = await fetch(`/api/hubs/${params.slug}/posts/${params.postId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "LIKE" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Unable to react");
    load();
  }

  async function submitComment() {
    const res = await fetch(`/api/hubs/${params.slug}/posts/${params.postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body: commentDraft }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Unable to comment");
    setCommentDraft("");
    load();
  }

  async function reportPost() {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetType: "HUB_POST", targetId: params.postId, reason: reportReason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Unable to report");
    toast.success("Reported");
    setReportReason("");
  }

  if (!post) return <div className="text-sm text-muted-foreground">Loading post…</div>;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{post.title}</CardTitle>
          <div className="text-xs text-muted-foreground">in <Link href={`/hubs/${params.slug}`} className="underline">{params.slug}</Link></div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{post.body}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant={liked ? "default" : "outline"} size="sm" onClick={toggleLike}>Like ({post.reactions?.length ?? 0})</Button>
            <Button variant="outline" size="sm" onClick={async () => {
              const url = `${window.location.origin}/hubs/${params.slug}/posts/${params.postId}`;
              if (navigator.share) {
                await navigator.share({ title: post.title, url }).catch(() => undefined);
              } else {
                await navigator.clipboard.writeText(url);
                toast.success("Link copied");
              }
            }}><Share2 className="mr-1 h-3 w-3" />Share</Button>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">Report this post</div>
            <Input placeholder="Reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            <Button className="mt-2" variant="outline" size="sm" onClick={reportPost}><Flag className="mr-1 h-3 w-3" />Report</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comments ({post.comments?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="Write a comment" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
          <Button onClick={submitComment}>Post comment</Button>
          <div className="space-y-2">
            {(post.comments ?? []).map((comment: any) => (
              <div key={comment.id} className="rounded-md border p-2 text-sm">
                <div className="text-xs text-muted-foreground">{comment.user?.profile?.username || comment.user?.email} • {new Date(comment.createdAt).toLocaleString()}</div>
                <div>{comment.body}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
