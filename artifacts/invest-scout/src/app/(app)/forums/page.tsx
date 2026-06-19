

import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Hub = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isPrivate: boolean;
  isMember?: boolean;
  _count?: { memberships: number; posts: number };
};

type ForumPost = { id: string; title: string; body: string; createdAt: string };

export default function ForumsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [myHubs, setMyHubs] = useState<Hub[]>([]);
  const [hubQuery, setHubQuery] = useState("");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({ name: "", description: "", isPrivate: false });
  const [role, setRole] = useState("USER");

  async function loadAll(query = "") {
    setLoading(true);
    try {
      const [hubsRes, postsRes, profileRes] = await Promise.all([
        fetch(`/api/hubs${query ? `?q=${encodeURIComponent(query)}` : ""}`, { credentials: "include" }),
        fetch("/api/forums", { credentials: "include" }),
        fetch("/api/user/profile", { credentials: "include" }),
      ]);
      const [hubsData, postsData, profileData] = await Promise.all([
        hubsRes.json().catch(() => ({})),
        postsRes.json().catch(() => ({})),
        profileRes.json().catch(() => ({})),
      ]);
      if (!hubsRes.ok) throw new Error(hubsData?.error ?? "Failed to load hubs");
      if (!postsRes.ok) throw new Error(postsData?.error ?? "Failed to load discussions");
      const allHubs: Hub[] = hubsData.hubs ?? [];
      setHubs(allHubs);
      setMyHubs(allHubs.filter((h) => h.isMember));
      setPosts((postsData.posts ?? []).slice(0, 8));
      setRole(profileRes.ok ? (profileData.role ?? "USER") : "USER");
    } catch (e) {
      console.error(e);
      toast.error("Unable to load forums hub view");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => loadAll(hubQuery), 250);
    return () => clearTimeout(timer);
  }, [hubQuery]);

  const visibleHubs = useMemo(() => hubs, [hubs]);

  async function createHub() {
    try {
      const res = await fetch("/api/hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(createData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to create hub");
      setCreateOpen(false);
      setCreateData({ name: "", description: "", isPrivate: false });
      toast.success("Hub created");
      window.location.href = `/hubs/${data.hub.slug}`;
    } catch (e: any) {
      toast.error(e?.message ?? "Unable to create hub");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Forums & Hubs</h1>
          <p className="text-sm text-muted-foreground">Discover communities and discussions.</p>
        </div>
        {role === "ADMIN" ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Create Hub</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a Hub</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Label>Hub name</Label>
                <Input value={createData.name} onChange={(e) => setCreateData((p) => ({ ...p, name: e.target.value }))} />
                <Label>Description</Label>
                <Textarea value={createData.description} onChange={(e) => setCreateData((p) => ({ ...p, description: e.target.value }))} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={createData.isPrivate} onChange={(e) => setCreateData((p) => ({ ...p, isPrivate: e.target.checked }))} />
                  Private hub (invite-only)
                </label>
              </div>
              <DialogFooter><Button onClick={createHub}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="text-xs text-muted-foreground">Only admins can create/manage forums.</div>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search hubs..." value={hubQuery} onChange={(e) => setHubQuery(e.target.value)} />
          </div>
          <div className="mt-3 text-sm font-medium">My Hubs ({myHubs.length})</div>
          <div className="mt-2 space-y-2">
            {myHubs.map((hub) => (
              <Link key={hub.id} href={`/hubs/${hub.slug}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted">
                <span>{hub.name}</span>
                <Badge variant="outline">{hub.isPrivate ? "Private" : "Public"}</Badge>
              </Link>
            ))}
            {myHubs.length === 0 && <div className="text-sm text-muted-foreground">No hub memberships yet.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hub discovery</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
          {!loading && visibleHubs.length === 0 ? <div className="text-sm text-muted-foreground">No hubs found.</div> : null}
          {visibleHubs.map((hub) => (
            <Link key={hub.id} href={`/hubs/${hub.slug}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted">
              <div>
                <div className="font-medium">{hub.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{hub.description || "No description"}</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{hub._count?.memberships ?? 0} members</div>
                <Badge variant={hub.isPrivate ? "secondary" : "outline"}>{hub.isPrivate ? "Private" : "Public"}</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Latest forum discussions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/forums/${post.id}`} className="block rounded-xl border p-3 hover:bg-muted/40">
              <div className="font-medium">{post.title}</div>
              <div className="line-clamp-2 text-sm text-muted-foreground">{post.body}</div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
