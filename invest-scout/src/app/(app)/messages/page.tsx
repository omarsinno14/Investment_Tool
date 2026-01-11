"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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

type Message = {
  id: string;
  body: string;
  createdAt: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: { email?: string | null };
  toUser?: { email?: string | null };
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

const GROUPS_KEY = "invesco-message-groups";

export default function MessagesPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(true);
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", imageUrl: "", members: "" });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessage, setGroupMessage] = useState("");
  const [newMember, setNewMember] = useState("");

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
      loadMessages(partner);
    }
  }, [searchParams]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages]);

  async function send() {
    if (!identifier.trim() || !message.trim()) {
      toast.error("Add a recipient and message");
      return;
    }
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
        return;
      }
      setMessage("");
      setOpportunityId(null);
      await loadMessages(identifier);
      toast.success("Message sent");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function ensureMutual(identifier: string) {
    const res = await fetch(`/api/user/mutuals?identifier=${encodeURIComponent(identifier)}`, {
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
    const identifier = newMember.trim();
    const ok = await ensureMutual(identifier);
    if (!ok) {
      toast.error(`${identifier} must be a mutual follower`);
      return;
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.id === group.id && !g.members.includes(identifier)
          ? { ...g, members: [...g.members, identifier], updatedAt: new Date().toISOString() }
          : g
      )
    );
    setNewMember("");
  }

  function removeGroupMember(identifier: string) {
    const group = selectedGroup();
    if (!group) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === group.id
          ? { ...g, members: g.members.filter((m) => m !== identifier), updatedAt: new Date().toISOString() }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Share opportunities with teammates or friends by email, username, or phone.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Start a conversation</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowComposer((prev) => !prev)}>
            {showComposer ? "Hide" : "Show"}
          </Button>
        </CardHeader>
        {showComposer && (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Recipient</Label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onBlur={() => loadMessages()}
                placeholder="email, username, or phone"
              />
            </div>
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
            <div className="space-y-2 md:col-span-2">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add context, why this matters, next steps..."
                rows={4}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Messages are private to you and the recipient.</span>
              <Button onClick={send} disabled={sending}>
                {sending ? "Sending..." : "Send message"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Groups</CardTitle>
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
                <div className="text-xs text-muted-foreground">
                  Only mutual followers can be added to groups.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button>
                <Button onClick={createGroup}>Create group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
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
        <Card>
          <CardHeader>
            <CardTitle>Group composer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Messages send to all group members.</span>
              <Button onClick={sendGroupMessage} disabled={sending}>
                {sending ? "Sending..." : "Send group message"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {identifier.trim() === "" && (
            <div className="text-sm text-muted-foreground">Enter a recipient to see messages.</div>
          )}
          {identifier.trim() !== "" && sortedMessages.length === 0 && (
            <div className="text-sm text-muted-foreground">No messages yet.</div>
          )}
          {sortedMessages.map((msg) => {
            return (
              <div
                key={msg.id}
                className="rounded-lg border p-3 space-y-2 bg-muted/30"
              >
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    {msg.opportunity && <span>Shared: {msg.opportunity.title}</span>}
                    {currentUserId && msg.fromUserId === currentUserId && (
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
                        }}
                      >
                        Unsend
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-sm">{msg.body}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
