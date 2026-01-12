"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RequestFilter = "INCOMING" | "OUTGOING";

export default function FollowRequestsPage() {
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [filter, setFilter] = useState<RequestFilter>("INCOMING");

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

  const activeList = useMemo(() => (filter === "INCOMING" ? incoming : outgoing), [filter, incoming, outgoing]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Follow requests</h1>
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as RequestFilter)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCOMING">Incoming requests</SelectItem>
            <SelectItem value="OUTGOING">Outgoing requests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filter === "INCOMING" ? "Incoming requests" : "Outgoing requests"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeList.length === 0 && (
            <div className="text-muted-foreground">No requests to review.</div>
          )}
          {activeList.map((req) => {
            const person = filter === "INCOMING" ? req.follower : req.following;
            const name = person?.profile?.username || person?.profile?.name || person?.email;
            return (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={person?.profile?.imageUrl || undefined} alt={name} />
                    <AvatarFallback>{name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/users/${person?.id}`} className="font-medium hover:underline">
                      {name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {person?.profile?.username ? `@${person.profile.username}` : person?.email}
                    </div>
                  </div>
                </div>
                {filter === "INCOMING" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAction(req.id, "accept")}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(req.id, "decline")}>Decline</Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Pending</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
