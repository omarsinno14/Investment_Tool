"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { NAV_BADGE_KEYS, markNavSeen } from "@/lib/nav-badges";
import { encodeCursor } from "@/lib/pagination";
import { Search } from "lucide-react";

type UserSummary = {
  id: string;
  email: string;
  profile?: { name?: string | null; username?: string | null; imageUrl?: string | null } | null;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: UserSummary | null;
  toUser?: UserSummary | null;
  opportunity?: { id: string; title: string } | null;
};

type Conversation = {
  id: string;
  partner?: { user: UserSummary } | null;
  lastMessage?: Message | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
};

type Group = {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
};

type ChatItem =
  | { type: "day"; id: string; label: string }
  | { type: "message"; id: string; message: Message; showTimestamp: boolean };

const GROUPS_KEY = "invesco-message-groups";

function formatPartnerLabel(user?: UserSummary | null) {
  const name = user?.profile?.username || user?.profile?.name || user?.email || "Unknown";
  const subtitle = user?.profile?.username ? `@${user.profile.username}` : user?.email || "";
  return { name, subtitle, imageUrl: user?.profile?.imageUrl };
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function buildChatItems(messages: Message[]) {
  const items: ChatItem[] = [];
  let lastDay = "";
  let lastSender = "";
  let lastTime = 0;
  for (const message of messages) {
    const created = new Date(message.createdAt);
    const day = created.toDateString();
    if (day !== lastDay) {
      items.push({ type: "day", id: `day-${day}`, label: formatDayLabel(created) });
      lastDay = day;
      lastSender = "";
      lastTime = 0;
    }
    const showTimestamp = message.fromUserId !== lastSender || created.getTime() - lastTime > 5 * 60 * 1000;
    items.push({ type: "message", id: message.id, message, showTimestamp });
    lastSender = message.fromUserId;
    lastTime = created.getTime();
  }
  return items;
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showThreadList, setShowThreadList] = useState(true);
  const [newMessageIndicator, setNewMessageIndicator] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", members: "" });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessage, setGroupMessage] = useState("");
  const [newMember, setNewMember] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const chatItems = useMemo(() => buildChatItems(messages), [messages]);

  const virtualizer = useVirtualizer({
    count: chatItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  useEffect(() => {
    markNavSeen(NAV_BADGE_KEYS.messages);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(GROUPS_KEY);
    if (!stored) return;
    try {
      setGroups(JSON.parse(stored) as Group[]);
    } catch (e) {
      console.error("Failed to load groups", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  }, [groups]);

  async function loadConversations() {
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/user/conversations", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load conversations");
      setConversations(data.conversations ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load conversations");
    } finally {
      setConversationsLoading(false);
    }
  }

  async function loadMessages(conversationId: string, cursor?: string | null, direction: "backward" | "forward" = "backward") {
    if (!conversationId) return;
    if (direction === "backward") {
      setLoadingOlder(true);
    } else {
      setMessagesLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      params.set("direction", direction);
      const res = await fetch(`/api/user/conversations/${conversationId}/messages?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load messages");

      if (direction === "backward") {
        setMessages((prev) => [...(data.messages ?? []), ...prev]);
      } else {
        setMessages(data.messages ?? []);
      }
      setNextCursor(data.nextCursor ?? null);
      setCurrentUserId(data.currentUserId ?? currentUserId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
      setLoadingOlder(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const partner = searchParams.get("partner");
    if (!partner) return;
    (async () => {
      const res = await fetch("/api/user/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: partner }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Unable to start chat");
        return;
      }
      setActiveConversationId(data.conversationId);
      setShowThreadList(false);
      await loadMessages(data.conversationId, null, "forward");
    })();
  }, [searchParams]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    setMessages([]);
    setNextCursor(null);
    loadMessages(activeConversationId, null, "forward");
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const latest = messages[messages.length - 1];
      if (!latest) return;
      const cursor = encodeCursor({ id: latest.id, ts: latest.createdAt });
      const res = await fetch(
        `/api/user/conversations/${activeConversationId}/messages?direction=forward&cursor=${encodeURIComponent(cursor)}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.messages?.length) {
        setMessages((prev) => [...prev, ...(data.messages ?? [])]);
        loadConversations();
      }
    }, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConversationId, messages]);

  useEffect(() => {
    const handler = window.setTimeout(async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Search failed");
        setSearchResults(data.users ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearTop = el.scrollTop < 120;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (nearTop && nextCursor && !loadingOlder) {
        loadMessages(activeConversationId ?? "", nextCursor, "backward");
      }
      setNewMessageIndicator(!nearBottom);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [nextCursor, loadingOlder, activeConversationId]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(chatItems.length - 1, { align: "end" });
      });
      setNewMessageIndicator(false);
    } else {
      setNewMessageIndicator(true);
    }
  }, [chatItems.length, virtualizer]);

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const partner = conv.partner?.user;
      const label = partner?.profile?.username || partner?.profile?.name || partner?.email || "";
      return label.toLowerCase().includes(q);
    });
  }, [conversations, searchTerm]);

  async function startChat(identifier: string) {
    const res = await fetch("/api/user/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data?.error ?? "Unable to start chat");
      return;
    }
    setActiveConversationId(data.conversationId);
    setShowThreadList(false);
    await loadConversations();
  }

  async function ensureMutual(identifierValue: string) {
    const res = await fetch(`/api/user/mutuals?identifier=${encodeURIComponent(identifierValue)}`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.mutual) return false;
    return true;
  }

  async function createGroup() {
    if (!groupForm.name.trim()) {
      toast.error("Add a group name");
      return;
    }
    const members = groupForm.members
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    if (members.length === 0) {
      toast.error("Add at least one member");
      return;
    }
    const allowed: string[] = [];
    for (const member of members) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await ensureMutual(member);
      if (!ok) {
        toast.error(`${member} must be a mutual follower`);
        continue;
      }
      allowed.push(member);
    }
    if (allowed.length === 0) return;
    const timestamp = new Date().toISOString();
    const next: Group = {
      id: `grp-${Date.now()}`,
      name: groupForm.name.trim(),
      members: allowed,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setGroups((prev) => [next, ...prev]);
    setGroupForm({ name: "", members: "" });
    setGroupOpen(false);
    toast.success("Group created");
  }

  function selectedGroup() {
    return groups.find((group) => group.id === selectedGroupId) ?? null;
  }

  async function addGroupMember() {
    const group = selectedGroup();
    if (!group || !newMember.trim()) return;
    const nextIdentifier = newMember.trim();
    const ok = await ensureMutual(nextIdentifier);
    if (!ok) {
      toast.error(`${nextIdentifier} must be a mutual follower`);
      return;
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.id === group.id && !g.members.includes(nextIdentifier)
          ? { ...g, members: [...g.members, nextIdentifier], updatedAt: new Date().toISOString() }
          : g
      )
    );
    setNewMember("");
  }

  function removeGroupMember(identifierValue: string) {
    const group = selectedGroup();
    if (!group) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === group.id
          ? { ...g, members: g.members.filter((m) => m !== identifierValue), updatedAt: new Date().toISOString() }
          : g
      )
    );
  }

  async function sendGroupMessage() {
    const group = selectedGroup();
    if (!group) return;
    if (!groupMessage.trim()) {
      toast.error("Write a group message");
      return;
    }
    setSending(true);
    try {
      for (const member of group.members) {
        // eslint-disable-next-line no-await-in-loop
        await fetch("/api/user/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            identifier: member,
            body: groupMessage,
          }),
        });
      }
      toast.success("Group message sent");
      setGroupMessage("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send group message");
    } finally {
      setSending(false);
    }
  }

  function removeGroup(id: string) {
    setGroups((prev) => prev.filter((group) => group.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
  }

  async function sendMessage() {
    if (!activeConversationId || !messageDraft.trim()) return;
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      body: messageDraft,
      createdAt: new Date().toISOString(),
      fromUserId: currentUserId ?? "me",
      toUserId: "",
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessageDraft("");
    setSending(true);
    try {
      const res = await fetch(`/api/user/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: optimistic.body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to send");
      }
      await loadConversations();
    } catch (e) {
      console.error(e);
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((msg) => msg.id !== optimistic.id));
      setMessageDraft(optimistic.body);
    } finally {
      setSending(false);
    }
  }

  const activeConversation = conversations.find((conv) => conv.id === activeConversationId);
  const partner = activeConversation?.partner?.user;
  const partnerLabel = formatPartnerLabel(partner);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">Private conversations with smooth, IG-style chat.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div
          className={`flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border bg-card ${
            showThreadList ? "flex" : "hidden"
          } md:flex`}
        >
          <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold">Inbox</div>
            <div className="text-xs text-muted-foreground">
              {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search or start a chat"
                className="pl-9"
              />
            </div>
          </div>

          <div className="border-b px-4 py-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Start a chat</Label>
            {searching ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {searchResults.length === 0 && searchTerm.trim() && (
                  <div className="text-xs text-muted-foreground">No users found.</div>
                )}
                {searchResults.map((user) => {
                  const label = formatPartnerLabel(user);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => startChat(user.profile?.username || user.email)}
                      className="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition hover:bg-muted"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={label.imageUrl} alt={label.name} />
                        <AvatarFallback>{label.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{label.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{label.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-2 py-3">
            {conversationsLoading ? (
              <div className="space-y-3 px-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-3 text-sm text-muted-foreground">No conversations yet.</div>
            ) : (
              filteredConversations.map((thread) => {
                const threadPartner = thread.partner?.user;
                const label = formatPartnerLabel(threadPartner);
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(thread.id);
                      setShowThreadList(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-muted ${
                      activeConversationId === thread.id ? "bg-muted" : ""
                    }`}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={label.imageUrl} alt={label.name} />
                      <AvatarFallback>{label.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{label.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {thread.lastMessage?.body ?? "No messages yet"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-[10px] text-muted-foreground">
                        {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString() : ""}
                      </div>
                      {thread.unreadCount ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div
          className={`flex min-h-[520px] flex-col overflow-hidden rounded-2xl border bg-card ${
            showThreadList ? "hidden" : "flex"
          } md:flex`}
        >
          <div className="border-b px-4 py-3">
            {partner ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setShowThreadList(true)}
                  aria-label="Back to inbox"
                >
                  ←
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={partnerLabel.imageUrl} alt={partnerLabel.name} />
                  <AvatarFallback>{partnerLabel.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold">{partnerLabel.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {partnerLabel.subtitle || "Active now"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Select or start a chat.</div>
            )}
          </div>

          <div ref={listRef} className="relative flex-1 overflow-y-auto bg-muted/30 px-4 py-4">
            {loadingOlder && (
              <div className="mb-3 text-center text-xs text-muted-foreground">Loading older messages...</div>
            )}
            {messagesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : chatItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No messages yet.</div>
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const item = chatItems[virtualRow.index];
                  if (!item) return null;
                  return (
                    <div
                      key={item.id}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {item.type === "day" ? (
                        <div className="my-4 flex items-center justify-center">
                          <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                            {item.label}
                          </span>
                        </div>
                      ) : (
                        <MessageBubble
                          message={item.message}
                          currentUserId={currentUserId}
                          showTimestamp={item.showTimestamp}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {newMessageIndicator && (
              <div className="absolute bottom-4 right-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => virtualizer.scrollToIndex(chatItems.length - 1, { align: "end" })}
                >
                  New messages
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t bg-card px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                placeholder="Message..."
                rows={2}
                className="min-h-[44px] flex-1 resize-none rounded-2xl"
              />
              <Button onClick={sendMessage} disabled={sending || !activeConversationId || !messageDraft.trim()}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Need a quick intro? Share an opportunity from your <Link href="/opportunities" className="underline">portfolio</Link>.
            </p>
          </div>
        </div>
      </div>

      <details className="rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer text-sm font-semibold">Group messaging</summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">Broadcast a message to a saved group.</div>
              <Button size="sm" variant="outline" onClick={() => setGroupOpen(true)}>
                New group
              </Button>
            </div>
            {groups.length === 0 ? (
              <div className="text-sm text-muted-foreground">No groups yet.</div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">{group.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.members.length} members
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedGroupId(group.id)}>
                      Open
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeGroup(group.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {groupOpen && (
            <div className="rounded-2xl border bg-background p-4">
              <div className="space-y-3">
                <Input
                  placeholder="Group name"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                />
                <Textarea
                  placeholder="Members (comma-separated usernames or emails)"
                  value={groupForm.members}
                  onChange={(e) => setGroupForm({ ...groupForm, members: e.target.value })}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setGroupOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createGroup}>Create</Button>
                </div>
              </div>
            </div>
          )}

          {selectedGroupId && (
            <div className="space-y-3 rounded-2xl border bg-background p-4">
              <div className="text-sm text-muted-foreground">
                Messaging group: {selectedGroup()?.name}
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Members</div>
                <div className="flex flex-wrap gap-2">
                  {selectedGroup()?.members.map((member) => (
                    <span key={member} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                      {member}
                      <button type="button" onClick={() => removeGroupMember(member)} className="text-muted-foreground">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Add member by username/email"
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button size="sm" variant="outline" onClick={addGroupMember}>
                    Add member
                  </Button>
                </div>
              </div>
              <Textarea
                value={groupMessage}
                onChange={(e) => setGroupMessage(e.target.value)}
                placeholder="Share updates with the group..."
                rows={4}
              />
              <div className="flex items-center justify-end">
                <Button onClick={sendGroupMessage} disabled={sending}>
                  {sending ? "Sending..." : "Send group message"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function MessageBubble({
  message,
  currentUserId,
  showTimestamp,
}: {
  message: Message;
  currentUserId: string | null;
  showTimestamp: boolean;
}) {
  const isMine = currentUserId && message.fromUserId === currentUserId;
  return (
    <div className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] space-y-2 rounded-2xl px-4 py-2 text-sm shadow-sm break-words ${
          isMine ? "bg-primary text-primary-foreground" : "border border-border/60 bg-background"
        }`}
      >
        {showTimestamp && (
          <div className="text-[10px] opacity-70">
            {new Date(message.createdAt).toLocaleString()}
          </div>
        )}
        <div>{message.body}</div>
        {message.opportunity && (
          <Link
            href={`/opportunities/${message.opportunity.id}`}
            className={`text-xs underline ${isMine ? "text-primary-foreground" : "text-primary"}`}
          >
            Shared: {message.opportunity.title}
          </Link>
        )}
      </div>
    </div>
  );
}
