

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
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
const OPPORTUNITY_TYPES = new Set(["OPPORTUNITY_MATCH", "OPPORTUNITY_TRENDING", "NEWS_BREAKING"]);
const FORUM_TYPES = new Set(["FORUM_REACTION", "FORUM_COMMENT"]);
const JOURNAL_TYPES = new Set(["JOURNAL_INVITE", "JOURNAL_INVITE_ACCEPTED"]);

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchOpps, setMatchOpps] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [activeTab, setActiveTab] = useState<"NOTIFICATIONS" | "REQUESTS">("NOTIFICATIONS");
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [res, oppRes, forumRes, requestsRes] = await Promise.all([
        fetch("/api/user/notifications", { credentials: "include" }),
        fetch("/api/opportunities?type=community", { credentials: "include", cache: "no-store" }),
        fetch("/api/forums", { credentials: "include" }),
        fetch("/api/user/follow-requests", { credentials: "include" }),
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

      const requestsData = await requestsRes.json().catch(() => ({}));
      if (requestsRes.ok) {
        setIncomingRequests(requestsData.incoming ?? []);
        setOutgoingRequests(requestsData.outgoing ?? []);
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

  async function markAllRead() {
    try {
      const res = await fetch("/api/user/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ markAll: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to mark all read");
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch (e) {
      console.error(e);
      toast.error("Failed to update notifications");
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

  async function handleRequestAction(id: string, action: "accept" | "decline") {
    try {
      const res = await fetch(`/api/user/follow-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId: id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to update request");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update follow request");
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border bg-background p-1">
            <button
              type="button"
              onClick={() => setActiveTab("NOTIFICATIONS")}
              className={`rounded-full px-4 py-1 text-sm transition ${
                activeTab === "NOTIFICATIONS" ? "bg-muted" : "text-muted-foreground"
              }`}
            >
              Notifications
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("REQUESTS")}
              className={`rounded-full px-4 py-1 text-sm transition ${
                activeTab === "REQUESTS" ? "bg-muted" : "text-muted-foreground"
              }`}
            >
              Follow requests
              {incomingRequests.length > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>
          {activeTab === "NOTIFICATIONS" && (
            <>
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
              <Button variant="outline" size="sm" onClick={markAllRead}>
                Mark all as read
              </Button>
            </>
          )}
        </div>
      </div>

      {activeTab === "NOTIFICATIONS" && (
        <>
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl border bg-muted/30" />
              ))}
            </div>
          )}
          {!loading && filteredNotifications.length === 0 && (
            <div className="rounded-2xl border bg-card py-10 text-center text-muted-foreground">
              No notifications yet.
            </div>
          )}

          {!loading && filteredNotifications.length > 0 && (
            <div className="divide-y rounded-2xl border bg-card">
              {filteredNotifications.map((note) => {
                const fromUser = note.fromUser;
                const username = fromUser?.profile?.username;
                const displayName = username || fromUser?.profile?.name || fromUser?.email || "User";
                const isFollowNotification = FOLLOW_TYPES.has(note.type);
                const isUnread = !note.readAt;
                const title = note.type === "MESSAGE"
                  ? `New message from ${displayName}`
                  : note.type === "FOLLOW_REQUEST"
                    ? `${displayName} requested to follow you`
                    : note.type === "FOLLOW_ACCEPTED"
                      ? `${displayName} accepted your follow request`
                      : note.type === "FORUM_REACTION"
                        ? `${displayName} liked your discussion post`
                        : note.type === "FORUM_COMMENT"
                          ? `${displayName} commented on your post`
                          : note.type === "OPPORTUNITY_MATCH"
                            ? "New opportunity match"
                            : note.type === "OPPORTUNITY_TRENDING"
                              ? "Trending opportunity"
                              : note.type === "JOURNAL_INVITE"
                                ? `${displayName} invited you to a journal`
                                : note.type === "JOURNAL_INVITE_ACCEPTED"
                                  ? `${displayName} accepted your journal invite`
                                  : note.type === "NEWS_BREAKING"
                                    ? "Breaking news"
                                    : note.type.replace(/_/g, " ");
                const content =
                  note.type === "NEWS_BREAKING"
                    ? `From ${note.data?.source ?? "News"}: ${note.data?.headline ?? "New story"} — tap to read more`
                    : note.type === "FORUM_COMMENT" && note.data?.snippet
                      ? `“${note.data.snippet}”`
                      : "";
                const link =
                  note.type === "NEWS_BREAKING"
                    ? note.data?.url || (note.data?.opportunityId ? `/opportunities/${note.data.opportunityId}` : "#")
                    : note.type === "MESSAGE"
                      ? "/messages"
                      : note.data?.opportunityId
                        ? `/opportunities/${note.data.opportunityId}`
                        : note.data?.postId
                          ? `/forums/${note.data.postId}`
                          : note.data?.fromUserId
                            ? `/users/${note.data.fromUserId}`
                            : note.data?.entryId
                              ? `/journal?entry=${note.data.entryId}`
                              : "#";

                const isExternal = typeof link === "string" && link.startsWith("http");
                return (
                  <div
                    key={note.id}
                    className={`flex flex-col gap-3 px-4 py-4 text-sm ${isUnread ? "bg-muted/40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {fromUser ? (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={fromUser.profile?.imageUrl || undefined} alt={displayName} />
                            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs">
                            !
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground">{title}</div>
                          {content && <div className="text-xs text-muted-foreground">{content}</div>}
                          <div className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {!note.readAt && (
                        <Button size="sm" variant="ghost" onClick={() => markRead(note.id)}>
                          Mark read
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {link !== "#" && (
                        <Button asChild size="sm" variant="outline">
                          {isExternal ? (
                            <a href={link} target="_blank" rel="noreferrer">
                              View details
                            </a>
                          ) : (
                            <Link href={link}>View details</Link>
                          )}
                        </Button>
                      )}
                      {isFollowNotification && fromUser && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "REQUESTS" && (
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Follow requests</div>
              <div className="text-xs text-muted-foreground">
                {incomingRequests.length} incoming • {outgoingRequests.length} outgoing
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setRequestsLoading(true);
                await load();
                setRequestsLoading(false);
              }}
            >
              {requestsLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="divide-y">
            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No follow requests right now.</div>
            )}
            {incomingRequests.map((req) => {
              const person = req.follower;
              const displayName =
                person?.profile?.username || person?.profile?.name || person?.email || "User";
              return (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={person?.profile?.imageUrl || undefined} alt={displayName} />
                      <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link href={`/users/${person?.id}`} className="font-medium hover:underline">
                        {displayName}
                      </Link>
                      {person?.profile?.username && (
                        <div className="text-xs text-muted-foreground">@{person.profile.username}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRequestAction(req.id, "accept")}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRequestAction(req.id, "decline")}>
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
            {outgoingRequests.map((req) => {
              const person = req.following;
              const displayName =
                person?.profile?.username || person?.profile?.name || person?.email || "User";
              return (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={person?.profile?.imageUrl || undefined} alt={displayName} />
                      <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link href={`/users/${person?.id}`} className="font-medium hover:underline">
                        {displayName}
                      </Link>
                      {person?.profile?.username && (
                        <div className="text-xs text-muted-foreground">@{person.profile.username}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Pending approval</span>
                </div>
              );
            })}
          </div>
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
