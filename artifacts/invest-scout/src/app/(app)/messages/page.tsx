import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { ArrowLeft, Info, MessageCircle, MoreHorizontal, Megaphone, PenSquare, Search, SendHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RichText } from "@/components/social/RichText";
import { UserAvatar, displayName, profileHref, type SocialUser } from "@/components/social/UserAvatar";
import { NAV_BADGE_KEYS, markNavSeen } from "@/lib/nav-badges";
import { fetchProfile } from "@/lib/profile-cache";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type UserSummary = NonNullable<SocialUser> & { id: string };

type Message = {
  id: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  fromUserId: string;
  toUserId: string;
  fromUser?: UserSummary | null;
  opportunity?: { id: string; title: string } | null;
};

type Conversation = {
  id: string;
  partner?: { user: UserSummary } | null;
  lastMessage?: Message | null;
  lastMessageAt?: string | null;
  partnerLastReadAt?: string | null;
  myLastReadAt?: string | null;
  unreadCount?: number;
};

type Group = { id: string; name: string; members: string[]; createdAt: string; updatedAt: string };

/** A rendered row: a centered time divider, or a bubble with its position inside a sender run. */
type ChatItem =
  | { type: "divider"; id: string; label: string }
  | { type: "message"; id: string; message: Message; first: boolean; last: boolean };

const GROUPS_KEY = "vertica-message-groups";
const MESSAGE_POLL_MS = 4000;
const INBOX_POLL_MS = 12000;
/** Consecutive messages from one sender within this window render as one run. */
const RUN_GAP_MS = 5 * 60 * 1000;
/** A gap this long gets its own time divider. */
const DIVIDER_GAP_MS = 60 * 60 * 1000;

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

function dividerLabel(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = date.getTime();
  if (t >= startOfToday) return `Today ${timeFormatter.format(date)}`;
  if (t >= startOfToday - 86_400_000) return `Yesterday ${timeFormatter.format(date)}`;
  if (t >= startOfToday - 6 * 86_400_000) return `${dayFormatter.format(date)} ${timeFormatter.format(date)}`;
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

function buildChatItems(messages: Message[]): ChatItem[] {
  const items: ChatItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const t = new Date(m.createdAt).getTime();
    const needsDivider = !prev || t - new Date(prev.createdAt).getTime() > DIVIDER_GAP_MS || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
    if (needsDivider) items.push({ type: "divider", id: `div-${m.id}`, label: dividerLabel(new Date(m.createdAt)) });
    const joinsPrev = !needsDivider && prev && prev.fromUserId === m.fromUserId && t - new Date(prev.createdAt).getTime() < RUN_GAP_MS;
    const nextT = next ? new Date(next.createdAt).getTime() : 0;
    const joinsNext =
      next &&
      next.fromUserId === m.fromUserId &&
      nextT - t < RUN_GAP_MS &&
      nextT - t <= DIVIDER_GAP_MS &&
      new Date(next.createdAt).toDateString() === new Date(m.createdAt).toDateString();
    items.push({ type: "message", id: m.id, message: m, first: !joinsPrev, last: !joinsNext });
  }
  return items;
}

function errorText(data: any, fallback: string) {
  return data?.message || (data?.error && data.error !== "upgrade_required" ? data.error : null) || fallback;
}

function isTemp(id: string) {
  return id.startsWith("temp-");
}

export default function MessagesPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [inboxFilter, setInboxFilter] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [showThreadList, setShowThreadList] = useState(true);
  const [newMessageIndicator, setNewMessageIndicator] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [partnerReadAtRaw, setPartnerReadAtRaw] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const scrollToEndOnLoad = useRef(true);
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);
  messagesRef.current = messages;
  activeIdRef.current = activeConversationId;

  const chatItems = useMemo(() => buildChatItems(messages), [messages]);

  const virtualizer = useVirtualizer({
    count: chatItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: (i) => (chatItems[i]?.type === "divider" ? 44 : 40),
    overscan: 10,
  });

  useEffect(() => {
    markNavSeen(NAV_BADGE_KEYS.messages);
    let active = true;
    fetchProfile()
      .then(({ ok, data }) => {
        if (!ok || !active) return;
        setCurrentUsername(data?.profile?.username ?? null);
        if (data?.profile?.userId) setCurrentUserId(data.profile.userId);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const loadConversations = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setConversationsLoading(true);
    try {
      const res = await fetch("/api/user/conversations", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load conversations");
      const next: Conversation[] = data.conversations ?? [];
      // The open thread is being read right now, so it has no unread messages.
      setConversations(next.map((c) => (c.id === activeIdRef.current ? { ...c, unreadCount: 0 } : c)));
      if (data.currentUserId) setCurrentUserId(data.currentUserId);
    } catch (e) {
      console.error(e);
      if (!options.silent) toast.error("Couldn't load your inbox");
    } finally {
      if (!options.silent) setConversationsLoading(false);
    }
  }, []);

  /** Load the newest page of a thread, or (with `before`) the page of older messages. */
  async function loadMessages(conversationId: string, before?: string | null) {
    if (before) setLoadingOlder(true);
    else setMessagesLoading(true);
    try {
      const params = new URLSearchParams();
      if (before) params.set("before", before);
      const res = await fetch(`/api/user/conversations/${conversationId}/messages?${params}`, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(data, "Failed to load messages"));
      if (activeIdRef.current !== conversationId) return;

      const incoming: Message[] = data.messages ?? [];
      if (before) {
        const el = listRef.current;
        if (el) prependAnchor.current = { height: el.scrollHeight, top: el.scrollTop };
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...incoming.filter((m) => !seen.has(m.id)), ...prev];
        });
      } else {
        setMessages(incoming);
        // Opening a thread marks it read server-side; refresh the nav badge.
        window.dispatchEvent(new Event("nav:refresh"));
      }
      setNextCursor(data.nextCursor ?? null);
      if (data.currentUserId) setCurrentUserId(data.currentUserId);
      setPartnerReadAtRaw(data.partnerLastReadAt ?? null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load messages");
    } finally {
      setMessagesLoading(false);
      setLoadingOlder(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const conversationParam = searchParams.get("c");
    if (conversationParam) {
      openConversation(conversationParam);
      return;
    }
    const partner = searchParams.get("partner");
    if (partner) startChat(partner);
  }, [searchString]);

  // Desktop: open the most recent thread by default.
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0 && window.matchMedia("(min-width: 768px)").matches) {
      setActiveConversationId(conversations[0]!.id);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    scrollToEndOnLoad.current = true;
    setMessages([]);
    setNextCursor(null);
    setPartnerReadAtRaw(null);
    setEditingId(null);
    setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c)));
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  // Poll the open thread for new messages (and the partner's read receipt).
  useEffect(() => {
    if (!activeConversationId) return;
    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      const latest = [...messagesRef.current].reverse().find((m) => !isTemp(m.id));
      inFlight = true;
      try {
        const params = latest ? `after=${encodeURIComponent(latest.id)}` : "";
        const res = await fetch(`/api/user/conversations/${activeConversationId}/messages?${params}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || activeIdRef.current !== activeConversationId) return;
        setPartnerReadAtRaw(data.partnerLastReadAt ?? null);
        const incoming: Message[] = data.messages ?? [];
        if (incoming.length === 0) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const fresh = incoming.filter((m) => !seen.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        loadConversations({ silent: true });
      } catch {
        /* transient network error; next tick retries */
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(tick, MESSAGE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeConversationId, loadConversations]);

  // Refresh the inbox in the background so new threads and unread counts appear.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadConversations({ silent: true });
    }, INBOX_POLL_MS);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearTop = el.scrollTop < 120;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearTop && nextCursor && !loadingOlder && activeConversationId) {
        const oldest = messagesRef.current.find((m) => !isTemp(m.id));
        if (oldest) loadMessages(activeConversationId, oldest.id);
      }
      if (nearBottom) setNewMessageIndicator(false);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [nextCursor, loadingOlder, activeConversationId, messagesLoading]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Older messages were prepended: keep the reader's place instead of jumping.
    if (prependAnchor.current) {
      const anchor = prependAnchor.current;
      prependAnchor.current = null;
      requestAnimationFrame(() => {
        el.scrollTop = anchor.top + (el.scrollHeight - anchor.height);
      });
      return;
    }
    // A freshly opened thread always starts at the latest message.
    if (scrollToEndOnLoad.current && chatItems.length > 0) {
      scrollToEndOnLoad.current = false;
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(chatItems.length - 1, { align: "end" });
        requestAnimationFrame(() => virtualizer.scrollToIndex(chatItems.length - 1, { align: "end" }));
      });
      setNewMessageIndicator(false);
      return;
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    const lastIsMine = messagesRef.current[messagesRef.current.length - 1]?.fromUserId === currentUserId;
    if (nearBottom || lastIsMine) {
      requestAnimationFrame(() => virtualizer.scrollToIndex(chatItems.length - 1, { align: "end" }));
      setNewMessageIndicator(false);
    } else if (chatItems.length > 0) {
      setNewMessageIndicator(true);
    }
  }, [chatItems.length, virtualizer]);

  function openConversation(id: string) {
    setActiveConversationId(id);
    setShowThreadList(false);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function startChat(identifier: string) {
    try {
      const res = await fetch("/api/user/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(errorText(data, "Unable to start chat"), {
          action: data?.error === "upgrade_required" ? { label: "Upgrade", onClick: () => (window.location.href = "/billing") } : undefined,
        });
        return false;
      }
      setInboxFilter("");
      openConversation(data.conversationId);
      await loadConversations({ silent: true });
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Unable to start chat");
      return false;
    }
  }

  async function sendMessage() {
    const conversationId = activeConversationId;
    const text = messageDraft.trim();
    if (!conversationId || !text || sending) return;
    if (!currentUsername) {
      toast.error("Set a username in Settings before sending messages.");
      window.location.href = "/settings";
      return;
    }
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      body: text,
      createdAt: new Date().toISOString(),
      fromUserId: currentUserId ?? "me",
      toUserId: "",
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessageDraft("");
    setSending(true);
    try {
      const res = await fetch(`/api/user/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorText(data, "Failed to send message"));
      const saved: Message = data.message;
      // Swap the optimistic bubble for the server copy (the poller may already have added it).
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== optimistic.id);
        return without.some((m) => m.id === saved.id) ? without : [...without, saved];
      });
      setConversations((prev) => {
        const current = prev.find((c) => c.id === conversationId);
        if (!current) return prev;
        return [{ ...current, lastMessage: saved, lastMessageAt: saved.createdAt }, ...prev.filter((c) => c.id !== conversationId)];
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to send message");
      setMessages((prev) => prev.filter((msg) => msg.id !== optimistic.id));
      setMessageDraft(text);
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  }

  async function unsendMessage(messageId: string) {
    const previous = messagesRef.current;
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, body: "", deletedAt: new Date().toISOString() } : msg)));
    const res = await fetch(`/api/user/messages/${messageId}`, { method: "DELETE", credentials: "include" }).catch(() => null);
    if (!res?.ok) {
      setMessages(previous);
      toast.error("Unable to unsend message");
      return;
    }
    loadConversations({ silent: true });
  }

  async function saveEdit(messageId: string) {
    const body = editingBody.trim();
    if (!body) {
      toast.error("Message cannot be empty");
      return;
    }
    const res = await fetch(`/api/user/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(data?.error ?? "Unable to edit message");
      return;
    }
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, body: data.message?.body ?? body, editedAt: data.message?.editedAt ?? new Date().toISOString() } : msg))
    );
    setEditingId(null);
    setEditingBody("");
  }

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [messageDraft]);

  const filteredConversations = useMemo(() => {
    const q = inboxFilter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const p = conv.partner?.user;
      return `${p?.profile?.username ?? ""} ${p?.profile?.name ?? ""}`.toLowerCase().includes(q);
    });
  }, [conversations, inboxFilter]);

  const latestOutgoingId = useMemo(() => {
    if (!currentUserId) return null;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i]!.fromUserId === currentUserId) return messages[i]!.id;
    return null;
  }, [messages, currentUserId]);

  const activeConversation = conversations.find((conv) => conv.id === activeConversationId);
  const partner = activeConversation?.partner?.user;
  const partnerReadSource = partnerReadAtRaw ?? activeConversation?.partnerLastReadAt ?? null;
  const partnerReadAt = partnerReadSource ? new Date(partnerReadSource) : null;
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <div className="-mx-4 -mt-6 md:mx-0 md:mt-0">
      <div className="flex h-[calc(100dvh-140px)] min-h-[420px] overflow-hidden border-y bg-card md:h-[calc(100vh-7rem)] md:rounded-2xl md:border">
        {/* Inbox */}
        <aside className={cn("w-full flex-col border-r md:flex md:w-[340px] md:shrink-0", showThreadList ? "flex" : "hidden")}>
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
              <p className="text-xs text-muted-foreground">{totalUnread > 0 ? `${totalUnread} unread` : "Private member conversations"}</p>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="More">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setBroadcastOpen(true)}>
                    <Megaphone className="mr-2 h-4 w-4" /> Broadcast to a group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="New message" onClick={() => setNewChatOpen(true)}>
                <PenSquare className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={inboxFilter} onChange={(e) => setInboxFilter(e.target.value)} placeholder="Search" className="h-9 rounded-full border-0 bg-muted pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {conversationsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))
            ) : filteredConversations.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {inboxFilter ? "No conversations match." : "No conversations yet."}
                {!inboxFilter && (
                  <div className="mt-3">
                    <Button size="sm" className="rounded-full" onClick={() => setNewChatOpen(true)}>
                      Start a conversation
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              filteredConversations.map((thread) => {
                const p = thread.partner?.user;
                const unread = (thread.unreadCount ?? 0) > 0;
                const last = thread.lastMessage;
                const preview = last
                  ? last.deletedAt
                    ? "Message unsent"
                    : `${last.fromUserId === currentUserId ? "You: " : ""}${last.body}`
                  : "Say hello";
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => openConversation(thread.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      activeConversationId === thread.id ? "bg-muted" : "hover:bg-muted/60"
                    )}
                  >
                    <UserAvatar user={p} size="xl" />
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>{displayName(p)}</div>
                      <div className={cn("flex items-center gap-1 text-xs", unread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        <span className="truncate">{preview}</span>
                        {thread.lastMessageAt && (
                          <span className="shrink-0 font-normal text-muted-foreground">· {timeAgo(thread.lastMessageAt)}</span>
                        )}
                      </div>
                    </div>
                    {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label={`${thread.unreadCount} unread`} />}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={cn("min-w-0 flex-1 flex-col md:flex", showThreadList ? "hidden" : "flex")}>
          {!activeConversationId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-foreground/80">
                <MessageCircle className="h-9 w-9" />
              </div>
              <div>
                <p className="text-lg font-semibold">Your messages</p>
                <p className="mt-1 text-sm text-muted-foreground">Send private messages to members you know.</p>
              </div>
              <Button className="rounded-full" onClick={() => setNewChatOpen(true)}>
                Send message
              </Button>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full md:hidden" onClick={() => setShowThreadList(true)} aria-label="Back to inbox">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {partner ? (
                  <Link href={profileHref(partner)} className="flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar user={partner} size="md" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{displayName(partner)}</div>
                      {partner.profile?.name && partner.profile.username && (
                        <div className="truncate text-xs text-muted-foreground">{partner.profile.name}</div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <Skeleton className="h-10 w-40 rounded-full" />
                )}
                {partner && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild aria-label="View profile">
                    <Link href={profileHref(partner)}>
                      <Info className="h-5 w-5" />
                    </Link>
                  </Button>
                )}
              </header>

              <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
                {loadingOlder && <div className="pb-3 text-center text-xs text-muted-foreground">Loading earlier messages...</div>}
                {!nextCursor && !messagesLoading && partner && (
                  <div className="flex flex-col items-center gap-2 pb-6 pt-4 text-center">
                    <UserAvatar user={partner} size="xl" className="h-20 w-20 text-lg" />
                    <div>
                      <div className="text-base font-semibold">{partner.profile?.name || displayName(partner)}</div>
                      {partner.profile?.username && <div className="text-sm text-muted-foreground">{partner.profile.username} · Vertica member</div>}
                    </div>
                    <Button variant="secondary" size="sm" className="mt-1 rounded-lg" asChild>
                      <Link href={profileHref(partner)}>View profile</Link>
                    </Button>
                  </div>
                )}
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[40, 60, 30, 55, 45].map((w, i) => (
                      <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                        <Skeleton className="h-9 rounded-full" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                    {virtualizer.getVirtualItems().map((row) => {
                      const item = chatItems[row.index];
                      if (!item) return null;
                      return (
                        <div
                          key={item.id}
                          data-index={row.index}
                          ref={virtualizer.measureElement}
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start}px)` }}
                        >
                          {item.type === "divider" ? (
                            <div className="py-3 text-center text-[11px] font-medium text-muted-foreground">{item.label}</div>
                          ) : (
                            <MessageBubble
                              message={item.message}
                              first={item.first}
                              last={item.last}
                              mine={Boolean(currentUserId && item.message.fromUserId === currentUserId)}
                              partner={partner}
                              receipt={
                                item.message.id === latestOutgoingId
                                  ? isTemp(item.message.id)
                                    ? "Sending..."
                                    : partnerReadAt && partnerReadAt >= new Date(item.message.createdAt)
                                      ? "Seen"
                                      : "Sent"
                                  : null
                              }
                              editing={editingId === item.message.id}
                              editingBody={editingBody}
                              onEditingBodyChange={setEditingBody}
                              onStartEdit={() => {
                                setEditingId(item.message.id);
                                setEditingBody(item.message.body);
                              }}
                              onCancelEdit={() => {
                                setEditingId(null);
                                setEditingBody("");
                              }}
                              onSaveEdit={() => saveEdit(item.message.id)}
                              onUnsend={() => unsendMessage(item.message.id)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {newMessageIndicator && (
                <div className="pointer-events-none relative">
                  <button
                    type="button"
                    onClick={() => virtualizer.scrollToIndex(chatItems.length - 1, { align: "end" })}
                    className="pointer-events-auto absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium shadow-md"
                  >
                    New messages
                  </button>
                </div>
              )}

              <div className="px-3 pb-3 pt-2 sm:px-4">
                <div className="flex items-end gap-2 rounded-3xl border bg-background px-4 py-1.5 transition focus-within:border-primary/50">
                  <textarea
                    ref={composerRef}
                    rows={1}
                    value={messageDraft}
                    maxLength={4000}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Message..."
                    className="max-h-[140px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {messageDraft.trim() ? (
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={sending}
                      className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                      aria-label="Send"
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} onPick={async (user) => (await startChat(user.id)) && setNewChatOpen(false)} />
      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} currentUsername={currentUsername} onSent={() => loadConversations({ silent: true })} />
    </div>
  );
}

function MessageBubble({
  message,
  first,
  last,
  mine,
  partner,
  receipt,
  editing,
  editingBody,
  onEditingBodyChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUnsend,
}: {
  message: Message;
  first: boolean;
  last: boolean;
  mine: boolean;
  partner?: UserSummary;
  receipt: string | null;
  editing: boolean;
  editingBody: string;
  onEditingBodyChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUnsend: () => void;
}) {
  const pending = isTemp(message.id);
  const deleted = Boolean(message.deletedAt);
  // Corners: tight on the sender's side between bubbles of the same run.
  const shape = mine
    ? cn("rounded-[20px]", !first && "rounded-tr-md", !last && "rounded-br-md")
    : cn("rounded-[20px]", !first && "rounded-tl-md", !last && "rounded-bl-md");

  return (
    <div className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start", last ? "mb-2" : "mb-0.5")}>
      {!mine && <div className="w-7 shrink-0">{last && <UserAvatar user={partner} size="xs" className="h-7 w-7" />}</div>}

      {mine && !deleted && !pending && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mb-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-100 transition hover:bg-muted md:opacity-0 md:group-hover:opacity-100"
              aria-label="Message options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onStartEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onUnsend}>
              Unsend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className={cn("flex max-w-[78%] flex-col sm:max-w-[65%]", mine ? "items-end" : "items-start")}>
        {editing ? (
          <div className="w-72 max-w-full space-y-2 rounded-2xl border bg-background p-2">
            <Textarea
              value={editingBody}
              autoFocus
              onChange={(e) => onEditingBodyChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSaveEdit();
                }
                if (e.key === "Escape") onCancelEdit();
              }}
              rows={2}
              className="min-h-[60px] resize-none rounded-xl border-0 bg-muted/50 focus-visible:ring-0"
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" className="h-7" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" className="h-7" onClick={onSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : deleted ? (
          <div className={cn(shape, "border px-3.5 py-2 text-sm italic text-muted-foreground")}>Message unsent</div>
        ) : (
          <div
            title={new Date(message.createdAt).toLocaleString()}
            className={cn(
              shape,
              "px-3.5 py-2 text-[14.5px] leading-snug",
              mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              pending && "opacity-70"
            )}
          >
            <RichText text={message.body} className={cn(mine && "[&_a]:text-primary-foreground [&_a]:underline")} />
            {message.opportunity && (
              <Link
                href={`/opportunities/${message.opportunity.id}`}
                className={cn(
                  "mt-2 block rounded-xl px-3 py-2 text-xs font-medium",
                  mine ? "bg-primary-foreground/15 text-primary-foreground" : "bg-background text-foreground"
                )}
              >
                Shared deal: {message.opportunity.title}
              </Link>
            )}
          </div>
        )}
        {(message.editedAt && !deleted && last) || receipt ? (
          <div className="mt-1 px-1 text-[11px] text-muted-foreground">
            {message.editedAt && !deleted ? "Edited" : ""}
            {message.editedAt && !deleted && receipt ? " · " : ""}
            {receipt}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NewChatDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (user: UserSummary) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" }).catch(() => null);
      const data = await res?.json().catch(() => ({}));
      setResults(res?.ok ? data.users ?? [] : []);
      setSearching(false);
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-center text-base">New message</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 border-b px-5 py-2.5">
          <span className="text-sm font-semibold">To:</span>
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="max-h-[50vh] min-h-[200px] overflow-y-auto py-2">
          {searching ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2">
                <Skeleton className="h-11 w-11 rounded-full" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))
          ) : results.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">{query.trim() ? "No members found." : "Search by name or username."}</p>
          ) : (
            results.map((user) => (
              <button key={user.id} type="button" onClick={() => onPick(user)} className="flex w-full items-center gap-3 px-5 py-2 text-left transition hover:bg-muted/60">
                <UserAvatar user={user} size="md" className="h-11 w-11" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{displayName(user)}</div>
                  {user.profile?.name && user.profile.username && <div className="truncate text-xs text-muted-foreground">{user.profile.name}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BroadcastDialog({
  open,
  onOpenChange,
  currentUsername,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUsername: string | null;
  onSent: () => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", members: "" });
  const [newMember, setNewMember] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GROUPS_KEY);
      if (stored) setGroups(JSON.parse(stored) as Group[]);
    } catch {
      /* ignore corrupt local data */
    }
  }, []);

  function persist(next: Group[]) {
    setGroups(next);
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  async function isMutual(identifier: string) {
    const res = await fetch(`/api/user/mutuals?identifier=${encodeURIComponent(identifier)}`, { credentials: "include" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    return Boolean(res?.ok && data.mutual);
  }

  async function createGroup() {
    const members = form.members.split(",").map((m) => m.trim().replace(/^@/, "")).filter(Boolean);
    if (!form.name.trim() || members.length === 0) {
      toast.error("Add a group name and at least one member");
      return;
    }
    setBusy(true);
    const checks = await Promise.all(members.map(isMutual));
    setBusy(false);
    const allowed = members.filter((_, i) => checks[i]);
    const rejected = members.filter((_, i) => !checks[i]);
    if (rejected.length) toast.error(`Only mutual followers can be added: ${rejected.join(", ")}`);
    if (allowed.length === 0) return;
    const now = new Date().toISOString();
    const group: Group = { id: `grp-${Date.now()}`, name: form.name.trim(), members: allowed, createdAt: now, updatedAt: now };
    persist([group, ...groups]);
    setSelectedId(group.id);
    setForm({ name: "", members: "" });
  }

  async function addMember() {
    const group = groups.find((g) => g.id === selectedId);
    const handle = newMember.trim().replace(/^@/, "");
    if (!group || !handle) return;
    if (!(await isMutual(handle))) {
      toast.error(`${handle} must be a mutual follower`);
      return;
    }
    persist(groups.map((g) => (g.id === group.id && !g.members.includes(handle) ? { ...g, members: [...g.members, handle] } : g)));
    setNewMember("");
  }

  async function send() {
    const group = groups.find((g) => g.id === selectedId);
    if (!group || !message.trim()) return;
    if (!currentUsername) {
      toast.error("Set a username in Settings before sending messages.");
      return;
    }
    setBusy(true);
    const results = await Promise.all(
      group.members.map((member) =>
        fetch("/api/user/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ identifier: member, body: message.trim() }),
        }).then((r) => r.ok, () => false)
      )
    );
    setBusy(false);
    const failed = group.members.filter((_, i) => !results[i]);
    if (failed.length === group.members.length) {
      toast.error("Couldn't send the broadcast");
      return;
    }
    toast.success(failed.length ? `Sent, but couldn't reach: ${failed.join(", ")}` : `Sent to ${group.members.length} members`);
    setMessage("");
    onSent();
    onOpenChange(false);
  }

  const selected = groups.find((g) => g.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Broadcast to a group</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">Each member gets the message in their private inbox. Members must follow you back.</p>

        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedId(g.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition",
                  selectedId === g.id ? "border-foreground bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                {g.name} <span className="opacity-70">{g.members.length}</span>
              </button>
            ))}
          </div>
        )}

        {selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {selected.members.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                  {m}
                  <button
                    type="button"
                    aria-label={`Remove ${m}`}
                    onClick={() => persist(groups.map((g) => (g.id === selected.id ? { ...g, members: g.members.filter((x) => x !== m) } : g)))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Add member by username" className="h-9" />
              <Button variant="outline" size="sm" onClick={addMember}>
                Add
              </Button>
            </div>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder={`Message ${selected.name}...`} />
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  persist(groups.filter((g) => g.id !== selected.id));
                  setSelectedId(null);
                }}
              >
                Delete group
              </Button>
              <Button onClick={send} disabled={busy || !message.trim() || selected.members.length === 0}>
                {busy ? "Sending..." : "Send to group"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border p-3">
            <div className="text-sm font-medium">New group</div>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Group name" className="h-9" />
            <Input value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} placeholder="Usernames, comma separated" className="h-9" />
            <div className="flex justify-end">
              <Button size="sm" onClick={createGroup} disabled={busy}>
                {busy ? "Checking..." : "Create group"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
