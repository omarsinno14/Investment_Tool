"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NAV_BADGE_KEYS, markNavSeen } from "@/lib/nav-badges";

type NotificationItem = {
  id: string;
  type: string;
  data?: any;
  readAt?: string | null;
  createdAt: string;
  fromUser?: {
    id: string;
    email: string;
    profile?: { name?: string | null; username?: string | null; imageUrl?: string | null } | null;
  } | null;
  isFollowingFromUser?: boolean;
  followRequestStatus?: string | null;
};

type NotificationFilter = "ALL" | "FOLLOWS" | "MESSAGES" | "OPPORTUNITIES" | "FORUMS" | "JOURNAL";

const FOLLOW_TYPES = new Set(["FOLLOW_ACCEPTED", "FOLLOW_REQUEST"]);
const MESSAGE_TYPES = new Set(["MESSAGE"]);
const OPPORTUNITY_TYPES = new Set(["OPPORTUNITY_MATCH", "OPPORTUNITY_TRENDING"]);
const FORUM_TYPES = new Set(["FORUM_REACTION", "FORUM_COMMENT"]);
const JOURNAL_TYPES = new Set(["JOURNAL_INVITE", "JOURNAL_INVITE_ACCEPTED"]);

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchOpps, setMatchOpps] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");

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

  async function followBack(notification: NotificationItem) {
    if (!notification.fromUser?.id) return;
    try {
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: notification.fromUser.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to follow");
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isFollowingFromUser: Boolean(data.following),
                followRequestStatus: data.followRequestStatus ?? item.followRequestStatus ?? null,
              }
            : item
        )
      );
      toast.success(data.followRequestStatus ? "Follow request sent" : "Follow updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to follow back");
    }
  }

  useEffect(() => {
    markNavSeen(NAV_BADGE_KEYS.notifications);
    load();
  }, []);

  const filteredNotifications = useMemo(() => {
    if (filter === "ALL") return notifications;
    return notifications.filter((note) => {
      if (filter === "FOLLOWS") return FOLLOW_TYPES.has(note.type);
      if (filter === "MESSAGES") return MESSAGE_TYPES.has(note.type);
      if (filter === "OPPORTUNITIES") return OPPORTUNITY_TYPES.has(note.type);
      if (filter === "FORUMS") return FORUM_TYPES.has(note.type);
      if (filter === "JOURNAL") return JOURNAL_TYPES.has(note.type);
      return true;
    });
  }, [notifications, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All notifications</SelectItem>
            <SelectItem value="FOLLOWS">Follows</SelectItem>
            <SelectItem value="MESSAGES">Messages</SelectItem>
            <SelectItem value="OPPORTUNITIES">Opportunities</SelectItem>
            <SelectItem value="FORUMS">Forums</SelectItem>
            <SelectItem value="JOURNAL">Journal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <div>Loading...</div>}
      {!loading && filteredNotifications.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      )}

      {!loading && filteredNotifications.length > 0 && (
        <div className="space-y-3">
          {filteredNotifications.map((note) => {
            const fromUser = note.fromUser;
            const displayName =
              fromUser?.profile?.username || fromUser?.profile?.name || fromUser?.email || "User";
            const isFollowNotification = FOLLOW_TYPES.has(note.type);
            return (
              <Card key={note.id} className={note.readAt ? "opacity-70" : ""}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{note.type.replace(/_/g, " ")}</CardTitle>
                  {!note.readAt && (
                    <Button size="sm" variant="outline" onClick={() => markRead(note.id)}>
                      Mark read
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>{new Date(note.createdAt).toLocaleString()}</div>
                  {isFollowNotification && fromUser && (
                    <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={fromUser.profile?.imageUrl || undefined} alt={displayName} />
                          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{displayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {fromUser.profile?.username ? `@${fromUser.profile.username}` : fromUser.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/users/${fromUser.id}`}>View profile</Link>
                        </Button>
                        {note.isFollowingFromUser ? (
                          <Button size="sm" variant="secondary" disabled>
                            Following
                          </Button>
                        ) : note.followRequestStatus === "PENDING" ? (
                          <Button size="sm" variant="secondary" disabled>
                            Requested
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => followBack(note)}>
                            Follow back
                          </Button>
                        )}
                        {note.type === "FOLLOW_REQUEST" && (
                          <Button asChild size="sm" variant="ghost">
                            <Link href="/follow-requests">Review request</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
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
                  {note.data?.fromUserId && !isFollowNotification && (
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
            );
          })}
        </div>
      )}

      {!loading && (matchOpps.length > 0 || trendingPosts.length > 0) && (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">Explore highlights</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
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
        </details>
      )}
    </div>
  );
}
