import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  AtSign,
  Bell,
  BookOpen,
  CheckCheck,
  ChevronRight,
  CreditCard,
  Heart,
  MessageCircle,
  Newspaper,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar, displayName, profileHref, type SocialUser } from "@/components/social/UserAvatar";
import { NAV_BADGE_KEYS, markNavSeen } from "@/lib/nav-badges";
import { fullDate, recencyBucket, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  data?: Record<string, any> | null;
  readAt?: string | null;
  createdAt: string;
  fromUser?: (NonNullable<SocialUser> & { id: string }) | null;
  isFollowingFromUser?: boolean;
  followRequestStatus?: string | null;
};

type FollowRequest = {
  id: string;
  follower?: NonNullable<SocialUser> & { id: string };
  following?: NonNullable<SocialUser> & { id: string };
};

type Filter = "ALL" | "UNREAD" | "SOCIAL" | "DEALS" | "OTHER";

const SOCIAL = new Set(["FOLLOW_ACCEPTED", "FOLLOW_REQUEST", "FORUM_REACTION", "FORUM_COMMENT", "FORUM_MENTION", "HUB_MENTION", "OPPORTUNITY_COMMENT"]);
const DEALS = new Set(["OPPORTUNITY_MATCH", "OPPORTUNITY_TRENDING", "NEWS_BREAKING", "DEAL_CLOSING_SOON", "SAVED_DEAL_UPDATED", "PREMIUM_OPPORTUNITY"]);

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "UNREAD", label: "Unread" },
  { key: "SOCIAL", label: "People" },
  { key: "DEALS", label: "Deals and news" },
  { key: "OTHER", label: "Account" },
];

/** Small icon badge shown on the avatar, plus the sentence describing what happened. */
function describe(note: NotificationItem): { icon: typeof Bell; action: string; detail?: string; system: boolean } {
  const d = note.data ?? {};
  switch (note.type) {
    case "FOLLOW_REQUEST":
      return { icon: UserPlus, action: "requested to follow you", system: false };
    case "FOLLOW_ACCEPTED":
      return { icon: UserPlus, action: d.title?.toLowerCase().includes("accepted") ? "accepted your follow request" : "started following you", system: false };
    case "FORUM_REACTION":
      return { icon: Heart, action: "reacted to your thread", system: false };
    case "FORUM_COMMENT":
      return { icon: MessageCircle, action: d.targetType === "HUB_POST" ? "commented on your hub post" : "commented on your thread", detail: d.snippet ?? d.body, system: false };
    case "OPPORTUNITY_COMMENT":
      return { icon: MessageCircle, action: "commented on your deal", detail: d.body, system: false };
    case "FORUM_MENTION":
    case "HUB_MENTION":
      return { icon: AtSign, action: "mentioned you", detail: d.body ?? d.snippet, system: false };
    case "JOURNAL_INVITE":
      return { icon: BookOpen, action: "invited you to collaborate on a journal entry", detail: d.body, system: false };
    case "JOURNAL_INVITE_ACCEPTED":
      return { icon: BookOpen, action: "accepted your journal invite", system: false };
    case "MESSAGE":
      return { icon: MessageCircle, action: "sent you a message", detail: d.body, system: false };
    case "OPPORTUNITY_MATCH":
      return { icon: Sparkles, action: d.title ?? "A new deal matches your interests", detail: d.body, system: true };
    case "OPPORTUNITY_TRENDING":
      return { icon: TrendingUp, action: d.title ?? "A deal is trending", detail: d.body, system: true };
    case "NEWS_BREAKING":
      return { icon: Newspaper, action: d.headline ?? d.title ?? "Breaking news", detail: d.source, system: true };
    case "DEAL_CLOSING_SOON":
    case "SAVED_DEAL_UPDATED":
    case "PREMIUM_OPPORTUNITY":
      return { icon: TrendingUp, action: d.title ?? "Update on a deal you follow", detail: d.body, system: true };
    case "VERIFICATION_UPDATE":
      return { icon: ShieldCheck, action: d.title ?? "Your verification status changed", detail: d.body, system: true };
    case "PAYMENT":
      return { icon: CreditCard, action: d.title ?? "Billing update", detail: d.body, system: true };
    default:
      return { icon: Bell, action: d.title ?? note.type.replace(/_/g, " ").toLowerCase(), detail: d.body, system: true };
  }
}

function linkFor(note: NotificationItem): string | null {
  const d = note.data ?? {};
  if (typeof d.link === "string" && d.link) return d.link;
  if (note.type === "NEWS_BREAKING" && d.url) return d.url;
  if (d.opportunityId) return `/opportunities/${d.opportunityId}`;
  if (d.postId) return `/forums/${d.postId}`;
  if (d.entryId) return "/journal";
  if (note.fromUser) return profileHref(note.fromUser);
  return null;
}

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [incoming, setIncoming] = useState<FollowRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [res, reqRes] = await Promise.all([
        fetch("/api/user/notifications?limit=40", { credentials: "include" }),
        fetch("/api/user/follow-requests", { credentials: "include" }),
      ]);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load notifications");
      setNotifications(data.notifications ?? []);
      setNextCursor(data.nextCursor ?? null);
      const reqData = await reqRes.json().catch(() => ({}));
      if (reqRes.ok) setIncoming(reqData.incoming ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load your activity");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const res = await fetch(`/api/user/notifications?limit=40&cursor=${encodeURIComponent(nextCursor)}`, { credentials: "include" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setNotifications((prev) => [...prev, ...(data.notifications ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    }
    setLoadingMore(false);
  }

  useEffect(() => {
    markNavSeen(NAV_BADGE_KEYS.notifications);
    load();
  }, []);

  function refreshBadges() {
    window.dispatchEvent(new Event("nav:refresh"));
  }

  async function markRead(note: NotificationItem) {
    if (note.readAt) return;
    setNotifications((prev) => prev.map((n) => (n.id === note.id ? { ...n, readAt: new Date().toISOString() } : n)));
    await fetch(`/api/user/notifications/${note.id}/read`, { method: "POST", credentials: "include" }).catch(() => undefined);
    refreshBadges();
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    const res = await fetch("/api/user/notifications/read-all", { method: "POST", credentials: "include" }).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't mark everything as read");
      load();
      return;
    }
    refreshBadges();
  }

  async function followBack(note: NotificationItem) {
    if (!note.fromUser?.id) return;
    const res = await fetch("/api/user/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId: note.fromUser.id }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(data?.error ?? "Couldn't follow back");
      return;
    }
    setNotifications((prev) =>
      prev.map((n) =>
        n.fromUser?.id === note.fromUser?.id
          ? { ...n, isFollowingFromUser: Boolean(data.following), followRequestStatus: data.followRequestStatus ?? null }
          : n
      )
    );
  }

  async function respondToRequest(req: FollowRequest, action: "accept" | "decline") {
    setIncoming((prev) => prev.filter((r) => r.id !== req.id));
    const res = await fetch("/api/user/follow-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ requestId: req.id, action }),
    }).catch(() => null);
    if (!res?.ok) {
      setIncoming((prev) => [req, ...prev]);
      toast.error("Couldn't update the request");
      return;
    }
    if (action === "accept") toast.success(`${displayName(req.follower)} can now follow you`);
    refreshBadges();
  }

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "UNREAD") return !n.readAt;
      if (filter === "SOCIAL") return SOCIAL.has(n.type) || n.type.startsWith("JOURNAL");
      if (filter === "DEALS") return DEALS.has(n.type);
      if (filter === "OTHER") return !SOCIAL.has(n.type) && !DEALS.has(n.type) && !n.type.startsWith("JOURNAL");
      return true;
    });
  }, [notifications, filter]);

  const groups = useMemo(() => {
    const order = ["Today", "This week", "Earlier"] as const;
    const map = new Map<string, NotificationItem[]>();
    for (const n of filtered) {
      const key = recencyBucket(n.createdAt);
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return order.filter((k) => map.has(k)).map((k) => ({ label: k, items: map.get(k)! }));
  }, [filtered]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} new since you last checked` : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition",
              filter === key ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {key === "UNREAD" && unreadCount > 0 ? <span className="ml-1.5 tabular-nums">{unreadCount}</span> : null}
          </button>
        ))}
      </div>

      {incoming.length > 0 && (
        <section className="overflow-hidden rounded-2xl border bg-card">
          <button
            type="button"
            onClick={() => setShowRequests((v) => !v)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
          >
            <div className="flex -space-x-3">
              {incoming.slice(0, 3).map((r) => (
                <UserAvatar key={r.id} user={r.follower} size="md" className="border-2 border-card" />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Follow requests</div>
              <div className="truncate text-xs text-muted-foreground">
                {displayName(incoming[0]?.follower)}
                {incoming.length > 1 ? ` and ${incoming.length - 1} other${incoming.length > 2 ? "s" : ""}` : ""}
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition", showRequests && "rotate-90")} />
          </button>
          {showRequests && (
            <ul className="divide-y border-t">
              {incoming.map((req) => (
                <li key={req.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={profileHref(req.follower)}>
                    <UserAvatar user={req.follower} size="md" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={profileHref(req.follower)} className="block truncate text-sm font-semibold hover:underline">
                      {displayName(req.follower)}
                    </Link>
                    {req.follower?.profile?.name && req.follower.profile.username && (
                      <div className="truncate text-xs text-muted-foreground">{req.follower.profile.name}</div>
                    )}
                  </div>
                  <Button size="sm" className="h-8 rounded-lg px-4" onClick={() => respondToRequest(req, "accept")}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 rounded-lg px-4" onClick={() => respondToRequest(req, "decline")}>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {loading ? (
        <div className="space-y-1 rounded-2xl border bg-card p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground/80">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">{filter === "ALL" ? "Activity on your posts and profile" : "Nothing here yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "ALL" ? "When members follow you, react or comment, you'll see it here." : "Try a different filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-1.5 px-1 text-sm font-semibold">{group.label}</h2>
              <ul className="overflow-hidden rounded-2xl border bg-card">
                {group.items.map((note) => (
                  <NotificationRow
                    key={note.id}
                    note={note}
                    onOpen={() => markRead(note)}
                    onFollowBack={() => followBack(note)}
                  />
                ))}
              </ul>
            </section>
          ))}
          {nextCursor && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="rounded-full" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Show older activity"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ note, onOpen, onFollowBack }: { note: NotificationItem; onOpen: () => void; onFollowBack: () => void }) {
  const { icon: Icon, action, detail, system } = describe(note);
  const href = linkFor(note);
  const unread = !note.readAt;
  const showFollow = (note.type === "FOLLOW_ACCEPTED" || note.type === "FOLLOW_REQUEST") && note.fromUser;
  const external = href?.startsWith("http");

  const body = (
    <>
      <div className="relative shrink-0">
        {system || !note.fromUser ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <Icon className="h-5 w-5 text-foreground/80" />
          </div>
        ) : (
          <>
            <UserAvatar user={note.fromUser} size="md" className="h-11 w-11" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-foreground text-background">
              <Icon className="h-2.5 w-2.5" />
            </span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          {!system && note.fromUser && <span className="font-semibold">{displayName(note.fromUser)} </span>}
          <span className={cn(system && "font-medium")}>{action}</span>
          <time className="ml-1.5 whitespace-nowrap text-muted-foreground" title={fullDate(note.createdAt)}>
            {timeAgo(note.createdAt)}
          </time>
        </p>
        {detail && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{detail}</p>}
      </div>
    </>
  );

  return (
    <li className={cn("flex items-center gap-2 border-b px-3 last:border-b-0 transition hover:bg-muted/40", unread && "bg-primary/[0.04]")}>
      {href ? (
        external ? (
          <a href={href} target="_blank" rel="noreferrer" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3">
            {body}
          </a>
        ) : (
          <Link href={href} onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3">
            {body}
          </Link>
        )
      ) : (
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
          {body}
        </button>
      )}
      {showFollow &&
        (note.isFollowingFromUser ? (
          <Button size="sm" variant="secondary" className="h-8 rounded-lg px-4" disabled>
            Following
          </Button>
        ) : note.followRequestStatus === "PENDING" ? (
          <Button size="sm" variant="secondary" className="h-8 rounded-lg px-4" disabled>
            Requested
          </Button>
        ) : (
          <Button size="sm" className="h-8 rounded-lg px-4" onClick={onFollowBack}>
            Follow back
          </Button>
        ))}
      {unread && !showFollow && <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
    </li>
  );
}
