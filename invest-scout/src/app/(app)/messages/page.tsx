"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NAV_BADGE_KEYS, markNavSeen } from "@/lib/nav-badges";

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

type Opportunity = { id: string; title: string };

type Group = {
  id: string;
  name: string;
  imageUrl?: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
};

type Conversation = {
  partnerId: string;
  partnerIdentifier: string;
  partnerName: string;
  partnerSubtitle: string;
  imageUrl?: string;
  lastMessage: Message;
  lastAt: string;
};

const GROUPS_KEY = "invesco-message-groups";

function formatPartnerLabel(user?: UserSummary | null) {
  const name = user?.profile?.username || user?.profile?.name || user?.email || "Unknown";
  const subtitle = user?.profile?.username ? `@${user.profile.username}` : user?.email || "";
  const identifier = user?.profile?.username || user?.email || "";
  return { name, subtitle, identifier, imageUrl: user?.profile?.imageUrl };
}

function buildThreads(messages: Message[], currentUserId: string | null) {
  if (!currentUserId) return [] as Conversation[];
  const map = new Map<string, Conversation>();
  for (const msg of messages) {
    const partner = msg.fromUserId === currentUserId ? msg.toUser : msg.fromUser;
    if (!partner) continue;
    const { name, subtitle, identifier, imageUrl } = formatPartnerLabel(partner);
    if (!identifier) continue;
    if (!map.has(partner.id)) {
      map.set(partner.id, {
        partnerId: partner.id,
        partnerIdentifier: identifier,
        partnerName: name,
        partnerSubtitle: subtitle,
        imageUrl,
        lastMessage: msg,
        lastAt: msg.createdAt,
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );
}

export default function MessagesPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", imageUrl: "", members: "" });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessage, setGroupMessage] = useState("");
  const [newMember, setNewMember] = useState("");
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [threadSearch, setThreadSearch] = useState("");
  const [newRecipient, setNewRecipient] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  async function loadMessages(currentIdentifier = identifier) {
    if (!currentIdentifier.trim()) {
      setMessages([]);
      return;
    }
    const res = await fetch(`/api/user/messages?partner=${encodeURIComponent(currentIdentifier)}`, {
      credentials: "include",
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data?.error ?? "Failed to load messages");
      return;
    }
    setMessages(data.messages ?? []);
    setCurrentUserId(data.currentUserId ?? null);
  }

  async function loadThreads() {
    try {
      const res = await fetch("/api/user/messages", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load conversations");
      const nextThreads = buildThreads(data.messages ?? [], data.currentUserId ?? null);
      setThreads(nextThreads);
      setCurrentUserId(data.currentUserId ?? null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load conversations");
    }
  }

  useEffect(() => {
    markNavSeen(NAV_BADGE_KEYS.messages);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/opportunities", { cache: "no-store", credentials: "include" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json().catch(() => ({}));
        setOpportunities((data.opportunities ?? []).slice(0, 50));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load opportunities");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(GROUPS_KEY);
    if (!stored) return;
    try {
      setGroups(JSON.parse(stored) as Group[]);
    } catch (e) {
      console.error("Failed to load message groups", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    const partner = searchParams.get("partner");
    if (partner) {
      setIdentifier(partner);
      setSelectedPartnerId(null);
      loadMessages(partner);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedPartnerId && threads.length > 0) {
      const first = threads[0];
      setSelectedPartnerId(first.partnerId);
      setIdentifier(first.partnerIdentifier);
      loadMessages(first.partnerIdentifier);
    }
  }, [threads, selectedPartnerId]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages]);

  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) =>
      `${thread.partnerName} ${thread.partnerSubtitle}`.toLowerCase().includes(q)
    );
  }, [threads, threadSearch]);

  async function send() {
    if (!identifier.trim() || !message.trim()) {
      toast.error("Add a recipient and message");
      return;
    }
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      body: message,
      createdAt: new Date().toISOString(),
      fromUserId: currentUserId ?? "me",
      toUserId: selectedPartnerId ?? "unknown",
      opportunity: opportunityId
        ? opportunities.find((opp) => opp.id === opportunityId) ?? null
        : null,
    };
    const previousMessage = message;
    setMessages((prev) => [...prev, optimisticMessage]);
    setMessage("");
    setOpportunityId(null);
    setSending(true);
    try {
      const res = await fetch("/api/user/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identifier,
          body: message,
          opportunityId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to send message");
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
        setMessage(previousMessage);
        return;
      }
      await loadMessages(identifier);
      await loadThreads();
      toast.success("Message sent");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      setMessage(previousMessage);
    } finally {
      setSending(false);
    }
  }

  async function ensureMutual(identifierValue: string) {
    const res = await fetch(`/api/user/mutuals?identifier=${encodeURIComponent(identifierValue)}`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.mutual) {
      return false;
    }
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
      toast.error("Add at least one group member");
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
      imageUrl: groupForm.imageUrl.trim() || undefined,
      members: allowed,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setGroups((prev) => [next, ...prev]);
    setGroupForm({ name: "", imageUrl: "", members: "" });
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
            opportunityId,
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

  const activeThread = threads.find((thread) => thread.partnerId === selectedPartnerId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Find a chat</Label>
              <Input
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder="Search name or username"
              />
            </div>
            <div className="space-y-2">
              <Label>Start a new chat</Label>
              <div className="flex flex-col gap-2">
                <Input
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="email or username"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!newRecipient.trim()) {
                      toast.error("Enter a recipient");
                      return;
                    }
                    setIdentifier(newRecipient.trim());
                    setSelectedPartnerId(null);
                    loadMessages(newRecipient.trim());
                  }}
                >
                  Start chat
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {filteredThreads.length === 0 && (
                <div className="text-sm text-muted-foreground">No conversations yet.</div>
              )}
              {filteredThreads.map((thread) => (
                <button
                  key={thread.partnerId}
                  type="button"
                  onClick={() => {
                    setSelectedPartnerId(thread.partnerId);
                    setIdentifier(thread.partnerIdentifier);
                    loadMessages(thread.partnerIdentifier);
                  }}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition hover:bg-muted ${
                    selectedPartnerId === thread.partnerId ? "border-primary bg-muted" : "border-transparent"
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={thread.imageUrl} alt={thread.partnerName} />
                    <AvatarFallback>{thread.partnerName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{thread.partnerName}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {thread.lastMessage.body}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(thread.lastAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="text-base">Conversation</CardTitle>
              <div className="text-sm text-muted-foreground">
                {activeThread ? (
                  <span className="flex items-center gap-2">
                    {activeThread.partnerName}
                    {activeThread.partnerSubtitle && <span>• {activeThread.partnerSubtitle}</span>}
                  </span>
                ) : identifier ? (
                  <span>{identifier}</span>
                ) : (
                  <span>Select or start a chat.</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[380px] space-y-3 overflow-y-auto pr-2">
                {identifier.trim() === "" && (
                  <div className="text-sm text-muted-foreground">Choose a conversation to view messages.</div>
                )}
                {identifier.trim() !== "" && sortedMessages.length === 0 && (
                  <div className="text-sm text-muted-foreground">No messages yet.</div>
                )}
                {sortedMessages.map((msg) => {
                  const isMine = currentUserId && msg.fromUserId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] space-y-2 rounded-2xl border px-3 py-2 ${
                        isMine ? "bg-primary text-primary-foreground" : "bg-muted/40"
                      }`}>
                        <div className="text-xs opacity-70">
                          {new Date(msg.createdAt).toLocaleString()}
                        </div>
                        <div className="text-sm">{msg.body}</div>
                        {msg.opportunity && (
                          <Link
                            href={`/opportunities/${msg.opportunity.id}`}
                            className={`text-xs underline ${isMine ? "text-primary-foreground" : "text-primary"}`}
                          >
                            Shared: {msg.opportunity.title}
                          </Link>
                        )}
                        {currentUserId && isMine && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={async () => {
                              if (!window.confirm("Unsend this message?")) return;
                              const res = await fetch(`/api/user/messages/${msg.id}`, { method: "DELETE" });
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                toast.error(data?.error ?? "Failed to unsend");
                                return;
                              }
                              await loadMessages(identifier);
                              await loadThreads();
                            }}
                          >
                            Unsend
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label>Attach opportunity (optional)</Label>
                  <Select
                    value={opportunityId ?? "__none__"}
                    onValueChange={(v) => setOpportunityId(v === "__none__" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Loading..." : "Select opportunity"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No attachment</SelectItem>
                      {opportunities.map((opp) => (
                        <SelectItem key={opp.id} value={opp.id}>
                          {opp.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message..."
                    rows={4}
                  />
                </div>
                <div className="flex items-center justify-end">
                  <Button onClick={send} disabled={sending || !identifier.trim()}>
                    {sending ? "Sending..." : "Send message"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium">Group messaging</summary>
            <div className="mt-4 space-y-4">
              <Card className="border-none shadow-none">
                <CardHeader className="flex flex-row items-center justify-between gap-3 px-0">
                  <CardTitle className="text-base">Groups</CardTitle>
                  <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Create group</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create a group</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input
                          placeholder="Group name"
                          value={groupForm.name}
                          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                        />
                        <Input
                          placeholder="Group image URL (optional)"
                          value={groupForm.imageUrl}
                          onChange={(e) => setGroupForm({ ...groupForm, imageUrl: e.target.value })}
                        />
                        <Textarea
                          placeholder="Members (comma-separated usernames or emails)"
                          value={groupForm.members}
                          onChange={(e) => setGroupForm({ ...groupForm, members: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button>
                        <Button onClick={createGroup}>Create group</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-3 px-0">
                  {groups.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No groups yet.</div>
                  ) : (
                    groups.map((group) => (
                      <div key={group.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
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
                </CardContent>
              </Card>

              {selectedGroupId && (
                <Card className="border-none shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle className="text-base">Group composer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-0">
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
                  </CardContent>
                </Card>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
