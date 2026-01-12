"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationItem = {
  id: string;
  type: string;
  data?: any;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchOpps, setMatchOpps] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [res, oppRes, forumRes] = await Promise.all([
        fetch("/api/user/notifications", { credentials: "include" }),
        fetch("/api/opportunities?type=community", { credentials: "include", cache: "no-store" }),
        fetch("/api/forums", { credentials: "include" }),
      ]);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load notifications");
      setNotifications(data.notifications ?? []);

      const oppData = await oppRes.json().catch(() => ({}));
      if (oppRes.ok) {
        setMatchOpps((oppData.opportunities ?? []).slice(0, 3));
      }

      const forumData = await forumRes.json().catch(() => ({}));
      if (forumRes.ok) {
        const posts = forumData.posts ?? [];
        const ranked = posts
          .map((post: any) => ({
            ...post,
            reactionCount: (post.reactions ?? []).length + (post.comments ?? []).length,
          }))
          .sort((a: any, b: any) => b.reactionCount - a.reactionCount)
          .slice(0, 3);
        setTrendingPosts(ranked);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      const res = await fetch("/api/user/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to mark read");
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to update notification");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Messages, follows, reactions, and opportunity updates.</p>
      </div>

      {loading && <div>Loading...</div>}
      {!loading && notifications.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((note) => (
            <Card key={note.id} className={note.readAt ? "opacity-70" : ""}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{note.type.replace(/_/g, " ")}</CardTitle>
                {!note.readAt && (
                  <Button size="sm" variant="outline" onClick={() => markRead(note.id)}>
                    Mark read
                  </Button>
                )}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>{new Date(note.createdAt).toLocaleString()}</div>
                {note.data?.opportunityId && (
                  <Link href={`/opportunities/${note.data.opportunityId}`} className="underline">
                    View opportunity
                  </Link>
                )}
                {note.data?.postId && (
                  <Link href={`/forums/${note.data.postId}`} className="underline">
                    View forum post
                  </Link>
                )}
                {note.data?.fromUserId && (
                  <Link href={`/users/${note.data.fromUserId}`} className="underline">
                    View profile
                  </Link>
                )}
                {note.data?.entryId && (
                  <Link href={`/journal?entry=${note.data.entryId}`} className="underline">
                    View journal
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && (matchOpps.length > 0 || trendingPosts.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matched opportunities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {matchOpps.length === 0 && <div className="text-muted-foreground">No matches yet.</div>}
              {matchOpps.map((opp) => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`} className="block hover:underline">
                  {opp.title}
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trending forums</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {trendingPosts.length === 0 && <div className="text-muted-foreground">No trending posts yet.</div>}
              {trendingPosts.map((post) => (
                <Link key={post.id} href={`/forums/${post.id}`} className="block hover:underline">
                  {post.title}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
