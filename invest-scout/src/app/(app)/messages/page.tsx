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

export default function MessagesPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const searchParams = useSearchParams();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Share opportunities with teammates or friends by email, username, or phone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start a conversation</CardTitle>
        </CardHeader>
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
      </Card>

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
                  {msg.opportunity && <span>Shared: {msg.opportunity.title}</span>}
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
