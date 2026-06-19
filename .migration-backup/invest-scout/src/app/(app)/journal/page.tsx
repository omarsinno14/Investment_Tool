"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type JournalEntry = {
  id: string;
  title?: string | null;
  entryDate: string;
  isOwner: boolean;
  isLocked: boolean;
  collaboratorCount: number;
};

type JournalDetail = {
  id: string;
  title?: string | null;
  body: string;
  entryDate: string;
  imageUrls: string[];
  chartData?: any;
  isOwner: boolean;
  isLocked: boolean;
  collaborators: any[];
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selected, setSelected] = useState<JournalDetail | null>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "",
    body: "",
    entryDate: new Date().toISOString().slice(0, 10),
    imageUrls: "",
    chartLabels: "",
    chartValues: "",
    password: "",
  });

  const chartPreview = useMemo(() => {
    const labels = form.chartLabels.split(",").map((v) => v.trim()).filter(Boolean);
    const values = form.chartValues
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
    return labels.map((label, idx) => ({ label, value: values[idx] ?? 0 }));
  }, [form.chartLabels, form.chartValues]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (dateFilter) params.set("date", dateFilter);
      const res = await fetch(`/api/user/journal?${params.toString()}`, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load journal");
      setEntries(data.entries ?? []);

      const inviteRes = await fetch("/api/user/journal/invites", { credentials: "include" });
      const inviteData = await inviteRes.json().catch(() => ({}));
      if (inviteRes.ok) setInvites(inviteData.invites ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load journal");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string, entryPassword?: string) {
    try {
      const res = await fetch(`/api/user/journal/${id}`, {
        credentials: "include",
        headers: entryPassword ? { "x-entry-password": entryPassword } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load entry");
      setSelected(data.entry ?? null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load entry");
    }
  }

  async function createEntry() {
    try {
      const payload = {
        title: form.title,
        body: form.body,
        entryDate: form.entryDate,
        imageUrls: form.imageUrls.split(",").map((v) => v.trim()).filter(Boolean),
        chartData: chartPreview.length ? { labels: chartPreview.map((c) => c.label), values: chartPreview.map((c) => c.value) } : null,
        password: form.password || null,
      };
      const res = await fetch("/api/user/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to create entry");
      toast.success("Journal saved");
      setOpen(false);
      setForm({
        title: "",
        body: "",
        entryDate: new Date().toISOString().slice(0, 10),
        imageUrls: "",
        chartLabels: "",
        chartValues: "",
        password: "",
      });
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create entry");
    }
  }

  async function unlockEntry(entry: JournalEntry) {
    if (!password) {
      toast.error("Password required");
      return;
    }
    await loadDetail(entry.id, password);
  }

  async function inviteCollaborator() {
    if (!selected) return;
    try {
      const res = await fetch("/api/user/journal/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entryId: selected.id, identifier: inviteIdentifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to invite");
      toast.success("Invite sent");
      setInviteIdentifier("");
      setInviteOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to send invite");
    }
  }

  async function respondInvite(id: string, action: "accept" | "decline") {
    try {
      const res = await fetch(`/api/user/journal/invites/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to update invite");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update invite");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
          <p className="text-muted-foreground">Capture thoughts, notes, and personal finance reflections.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New entry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New journal entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
              <Textarea rows={6} placeholder="Write your entry..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <Input placeholder="Image URLs (comma-separated)" value={form.imageUrls} onChange={(e) => setForm({ ...form, imageUrls: e.target.value })} />
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Chart labels (comma-separated)" value={form.chartLabels} onChange={(e) => setForm({ ...form, chartLabels: e.target.value })} />
                <Input placeholder="Chart values (comma-separated)" value={form.chartValues} onChange={(e) => setForm({ ...form, chartValues: e.target.value })} />
              </div>
              <Input type="password" placeholder="Password (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              {chartPreview.length > 0 && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  {chartPreview.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="w-24">{item.label}</span>
                      <div className="h-2 flex-1 rounded bg-muted">
                        <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, item.value * 5)}%` }} />
                      </div>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createEntry} disabled={!form.body.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input placeholder="Search journal entries..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-2">
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <Button variant="outline" onClick={load}>Search</Button>
        </div>
      </div>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collaboration invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {invites.map((invite) => {
              const name =
                invite.fromUser?.profile?.username ||
                invite.fromUser?.profile?.name ||
                invite.fromUser?.email;
              return (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    {name} invited you to{" "}
                    <span className="font-medium text-foreground">{invite.entry?.title || "a journal entry"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respondInvite(invite.id, "accept")}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respondInvite(invite.id, "decline")}>
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {loading && <div>Loading...</div>}
      {!loading && entries.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No journal entries yet.</CardContent>
        </Card>
      )}

      {!loading && entries.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle className="text-base">{entry.title || "Untitled entry"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>{new Date(entry.entryDate).toLocaleDateString()}</div>
                <div>{entry.isOwner ? "Personal" : "Collaborator"}</div>
                {entry.isLocked && (
                  <div className="space-y-2">
                    <Input type="password" placeholder="Entry password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button size="sm" onClick={() => unlockEntry(entry)}>Unlock</Button>
                  </div>
                )}
                {!entry.isLocked && (
                  <Button size="sm" variant="outline" onClick={() => loadDetail(entry.id)}>
                    View entry
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{selected.title || "Journal entry"}</CardTitle>
            {selected.isOwner && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Add collaborator</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add collaborator</DialogTitle>
                  </DialogHeader>
                  <Input placeholder="Username or email" value={inviteIdentifier} onChange={(e) => setInviteIdentifier(e.target.value)} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                    <Button onClick={inviteCollaborator} disabled={!inviteIdentifier.trim()}>Send invite</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>{new Date(selected.entryDate).toLocaleDateString()}</div>
            <div className="whitespace-pre-wrap text-foreground">{selected.body}</div>
            {selected.imageUrls.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {selected.imageUrls.map((url) => (
                  <img key={url} src={url} alt="Journal" className="h-40 w-full rounded-md object-cover" />
                ))}
              </div>
            )}
            {selected.chartData?.labels && (
              <div className="space-y-2">
                {selected.chartData.labels.map((label: string, idx: number) => {
                  const value = selected.chartData.values?.[idx] ?? 0;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-24">{label}</span>
                      <div className="h-2 flex-1 rounded bg-muted">
                        <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, value * 5)}%` }} />
                      </div>
                      <span>{value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
