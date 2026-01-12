"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ActivityFilter = "LIKES" | "COMMENTS" | "SAVED";

export default function ActivityPage() {
  const [reactions, setReactions] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [saves, setSaves] = useState<any[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>("LIKES");

  async function load() {
    try {
      const res = await fetch("/api/user/activity", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load activity");
      setReactions(data.reactions ?? []);
      setComments(data.comments ?? []);
      setSaves(data.saves ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load activity");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeList = useMemo(() => {
    if (filter === "LIKES") return reactions;
    if (filter === "COMMENTS") return comments;
    return saves;
  }, [filter, reactions, comments, saves]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your activity</h1>
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as ActivityFilter)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LIKES">Likes</SelectItem>
            <SelectItem value="COMMENTS">Comments</SelectItem>
            <SelectItem value="SAVED">Saved posts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filter === "LIKES" ? "Recent likes" : filter === "COMMENTS" ? "Recent comments" : "Saved posts"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {activeList.length === 0 && <div>Nothing here yet.</div>}
          {activeList.map((item) => (
            <Link key={item.id} href={`/forums/${item.post?.id}`} className="block hover:underline">
              {item.post?.title ?? "Forum post"}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
