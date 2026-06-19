

import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function HubPage() {
  const params = useParams<{ slug: string }>();
  
  const inviteToken = new URLSearchParams(window.location.search).get("invite") || undefined;
  const [hub, setHub] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [tab, setTab] = useState("posts");
  const [presence, setPresence] = useState({ onlineNow: 0, members: 0 });
  const [draft, setDraft] = useState({ title: "", body: "", type: "DISCUSSION", opportunityId: "", newsHeadline: "", newsUrl: "", newsSource: "" });
  const [savingHub, setSavingHub] = useState(false);

  async function load() {
    const [hubRes, postsRes, presenceRes] = await Promise.all([
      fetch(`/api/hubs/${params.slug}`, { credentials: "include" }),
      fetch(`/api/hubs/${params.slug}/posts?tab=${tab}`, { credentials: "include" }),
      fetch(`/api/hubs/${params.slug}/presence`, { credentials: "include" }),
    ]);
    const [hubData, postData, presenceData] = await Promise.all([
      hubRes.json().catch(() => ({})),
      postsRes.json().catch(() => ({})),
      presenceRes.json().catch(() => ({})),
    ]);

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
    if (presenceRes.ok) setPresence({ onlineNow: presenceData.onlineNow ?? 0, members: presenceData.members ?? hubData?.hub?._count?.memberships ?? 0 });
  }

  useEffect(() => {
    load();
  }, [params.slug, tab]);

  useEffect(() => {
    const ping = async () => {
      const res = await fetch(`/api/hubs/${params.slug}/presence`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPresence({ onlineNow: data.onlineNow ?? 0, members: data.members ?? 0 });
    };
    ping();
    const id = window.setInterval(ping, 30000);
    return () => window.clearInterval(id);
  }, [params.slug]);

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

  async function uploadHubImage(file: File, kind: "imageUrl" | "coverImageUrl") {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "hubs");
    const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Upload failed");
    await saveHubImages({ [kind]: data.url });
  }

  async function saveHubImages(payload: Record<string, string>) {
    setSavingHub(true);
    const res = await fetch(`/api/hubs/${params.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    setSavingHub(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? "Unable to update hub");
    toast.success("Hub updated");
    load();
  }

  const isMember = Boolean(hub?.isMember);
  const isOwner = hub?.viewerRole === "owner";

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
      <Card className="overflow-hidden">
        <div className="h-32 w-full bg-muted/30">
          {hub?.hub?.coverImageUrl ? <img src={hub.hub.coverImageUrl} alt="Hub cover" className="h-full w-full object-cover" /> : null}
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-full border bg-muted">
                {hub?.hub?.imageUrl ? <img src={hub.hub.imageUrl} alt="Hub avatar" className="h-full w-full object-cover" /> : null}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{hub?.hub?.name ?? "Hub"}</h1>
                <p className="text-sm text-muted-foreground">{hub?.hub?.description || "No description"}</p>
                <div className="mt-1 text-xs text-muted-foreground">{(presence.members ?? hub?.hub?._count?.memberships ?? 0)} members • {presence.onlineNow} online now</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={hub?.hub?.isPrivate ? "secondary" : "outline"}>{hub?.hub?.isPrivate ? "Private" : "Public"}</Badge>
              {!isMember ? <Button onClick={joinHub}>Join</Button> : <Button variant="outline" onClick={leaveHub}>Joined • Leave</Button>}
            </div>
          </div>

          {isOwner && (
            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
              <div>
                <Label>Forum image</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadHubImage(file, "imageUrl"); }} disabled={savingHub} />
              </div>
              <div>
                <Label>Forum cover image</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadHubImage(file, "coverImageUrl"); }} disabled={savingHub} />
              </div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">Upload JPEG/PNG/WEBP files (max 5MB).</p>
            </div>
          )}
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
          <Card><CardContent className="p-4 text-sm">Owner moderation is enabled. Members can create posts and comments. Private hubs require invite links.</CardContent></Card>
        </TabsContent>

        <TabsContent value={tab === "posts" ? "posts" : tab}>
          {isMember && (
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
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{post.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{post._count?.reactions ?? 0} likes</span>
                    <span>{post._count?.comments ?? 0} comments</span>
                    <Link className="text-primary underline" href={`/hubs/${params.slug}/posts/${post.id}`}>Open discussion</Link>
                    <button type="button" className="inline-flex items-center gap-1" onClick={async () => {
                      const url = `${window.location.origin}/hubs/${params.slug}/posts/${post.id}`;
                      if (navigator.share) {
                        await navigator.share({ title: post.title, url }).catch(() => undefined);
                      } else {
                        await navigator.clipboard.writeText(url);
                        toast.success("Link copied");
                      }
                    }}>
                      <Share2 className="h-3 w-3" /> Share
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
