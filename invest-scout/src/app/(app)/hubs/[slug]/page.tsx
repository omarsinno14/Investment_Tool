"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function HubPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const inviteToken = search.get("invite") || undefined;
  const [hub, setHub] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [tab, setTab] = useState("posts");
  const [draft, setDraft] = useState({ title: "", body: "", type: "DISCUSSION", opportunityId: "", newsHeadline: "", newsUrl: "", newsSource: "" });

  async function load() {
    const [hubRes, postsRes] = await Promise.all([
      fetch(`/api/hubs/${params.slug}`, { credentials: "include" }),
      fetch(`/api/hubs/${params.slug}/posts?tab=${tab}`, { credentials: "include" }),
    ]);
    const [hubData, postData] = await Promise.all([hubRes.json().catch(() => ({})), postsRes.json().catch(() => ({}))]);
    if (!hubRes.ok) {
      if (hubRes.status === 403 && inviteToken) {
        setHub({ pendingInvite: true, slug: params.slug });
        return;
      }
      toast.error(hubData?.error ?? "Unable to load hub");
      return;
    }
    if (!postsRes.ok && postsRes.status !== 403) {
      toast.error(postData?.error ?? "Unable to load hub posts");
    }
    setHub(hubData);
    setPosts(postData.posts ?? []);
  }

  useEffect(() => {
    load();
  }, [params.slug, tab]);

  async function joinHub() {
    const res = await fetch(`/api/hubs/${params.slug}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ inviteToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Unable to join hub");
    toast.success("Joined hub");
    load();
  }

  async function leaveHub() {
    if (!confirm("Leave this hub?")) return;
    const res = await fetch(`/api/hubs/${params.slug}/join`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Unable to leave hub");
    toast.success("Left hub");
    load();
  }

  async function createPost() {
    const res = await fetch(`/api/hubs/${params.slug}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(draft),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Unable to post");
    setDraft({ title: "", body: "", type: "DISCUSSION", opportunityId: "", newsHeadline: "", newsUrl: "", newsSource: "" });
    toast.success("Posted");
    load();
  }

  const isMember = Boolean(hub?.isMember);
  const canPost = isMember;

  if (hub?.pendingInvite) {
    return (
      <Card>
        <CardHeader><CardTitle>Private hub invite</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">You have an invite link. Join this private hub to continue.</p>
          <Button onClick={joinHub}>Join hub</Button>
        </CardContent>
      </Card>
    );
  }

  const postsToRender = useMemo(() => posts, [posts]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h1 className="text-2xl font-semibold">{hub?.hub?.name ?? "Hub"}</h1>
            <p className="text-sm text-muted-foreground">{hub?.hub?.description || "No description"}</p>
            <div className="mt-1 text-xs text-muted-foreground">{hub?.hub?._count?.memberships ?? 0} members</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={hub?.hub?.isPrivate ? "secondary" : "outline"}>{hub?.hub?.isPrivate ? "Private" : "Public"}</Badge>
            {!isMember ? <Button onClick={joinHub}>Join</Button> : <Button variant="outline" onClick={leaveHub}>Joined • Leave</Button>}
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="about">
          <Card><CardContent className="p-4 text-sm">Owner-only moderation is enabled. Private hubs require invite links.</CardContent></Card>
        </TabsContent>

        <TabsContent value={tab === "posts" ? "posts" : tab}>
          {canPost && (
            <Card className="mb-3">
              <CardContent className="space-y-2 p-4">
                <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
                <Textarea placeholder="Start discussion (supports @username mentions)" value={draft.body} onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))} />
                <div className="grid gap-2 md:grid-cols-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}>
                    <option value="DISCUSSION">Discussion</option>
                    <option value="OPPORTUNITY_IMPORT">Import opportunity</option>
                    <option value="NEWS_IMPORT">Import news headline</option>
                  </select>
                  {draft.type === "OPPORTUNITY_IMPORT" ? (
                    <Input placeholder="Opportunity ID" value={draft.opportunityId} onChange={(e) => setDraft((p) => ({ ...p, opportunityId: e.target.value }))} />
                  ) : draft.type === "NEWS_IMPORT" ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input placeholder="Headline" value={draft.newsHeadline} onChange={(e) => setDraft((p) => ({ ...p, newsHeadline: e.target.value }))} />
                      <Input placeholder="Source" value={draft.newsSource} onChange={(e) => setDraft((p) => ({ ...p, newsSource: e.target.value }))} />
                      <Input placeholder="URL" value={draft.newsUrl} onChange={(e) => setDraft((p) => ({ ...p, newsUrl: e.target.value }))} />
                    </div>
                  ) : null}
                </div>
                <Button onClick={createPost}>Post to hub</Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {postsToRender.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">{post.author?.profile?.username || post.author?.email} • {new Date(post.createdAt).toLocaleString()}</div>
                  <div className="mt-1 text-lg font-medium">{post.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{post.body}</p>
                  {post.type === "OPPORTUNITY_IMPORT" && post.opportunity && (
                    <div className="mt-3 rounded-md border bg-muted/40 p-2 text-sm">Opportunity: {post.opportunity.title}</div>
                  )}
                  {post.type === "NEWS_IMPORT" && (
                    <div className="mt-3 rounded-md border bg-muted/40 p-2 text-sm">News: {post.newsHeadline} • {post.newsSource}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
