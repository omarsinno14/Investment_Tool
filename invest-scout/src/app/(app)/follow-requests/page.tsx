"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FollowRequestsPage() {
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch("/api/user/follow-requests", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load requests");
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load requests");
    }
  }

  async function handleAction(id: string, action: "accept" | "decline") {
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
      toast.error("Failed to update request");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Follow requests</h1>
        <p className="text-muted-foreground">Approve or decline new followers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incoming requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {incoming.length === 0 && <div className="text-muted-foreground">No incoming requests.</div>}
          {incoming.map((req) => {
            const name = req.follower?.profile?.username || req.follower?.profile?.name || req.follower?.email;
            return (
              <div key={req.id} className="flex items-center justify-between gap-2">
                <Link href={`/users/${req.follower?.id}`} className="hover:underline">
                  {name}
                </Link>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAction(req.id, "accept")}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(req.id, "decline")}>Decline</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outgoing requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {outgoing.length === 0 && <div className="text-muted-foreground">No outgoing requests.</div>}
          {outgoing.map((req) => {
            const name = req.following?.profile?.username || req.following?.profile?.name || req.following?.email;
            return (
              <div key={req.id} className="flex items-center justify-between gap-2">
                <Link href={`/users/${req.following?.id}`} className="hover:underline">
                  {name}
                </Link>
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
