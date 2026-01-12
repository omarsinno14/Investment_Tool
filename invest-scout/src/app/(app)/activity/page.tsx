"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ActivityPage() {
  const [reactions, setReactions] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [saves, setSaves] = useState<any[]>([]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your activity</h1>
        <p className="text-muted-foreground">Likes, comments, and saves only you can see.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent likes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {reactions.length === 0 && <div>No reactions yet.</div>}
            {reactions.map((item) => (
              <Link key={item.id} href={`/forums/${item.post?.id}`} className="block hover:underline">
                {item.post?.title ?? "Forum post"}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {comments.length === 0 && <div>No comments yet.</div>}
            {comments.map((item) => (
              <Link key={item.id} href={`/forums/${item.post?.id}`} className="block hover:underline">
                {item.post?.title ?? "Forum post"}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {saves.length === 0 && <div>No saves yet.</div>}
            {saves.map((item) => (
              <Link key={item.id} href={`/forums/${item.post?.id}`} className="block hover:underline">
                {item.post?.title ?? "Forum post"}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
