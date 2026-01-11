"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight
  Banknote,
  Bookmark,
  Globe2,
  Layers,
  Sparkles,
  Star,
  Tags,
  Timer,
  RotateCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { OpportunityCard } from "@/components/app/OpportunityCard";

type ActionState = "NONE" | "SAVED" | "VERY_INTERESTED" | "INVESTED";

type Opportunity = {
  id: string;
  title: string;
  url?: string | null;
  summary?: string | null;
  details?: string | null;
  source?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  tags?: string[] | null;
  askAmount?: number | null;
  benefits?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactUsername?: string | null;
  locationName?: string | null;
  locationMapUrl?: string | null;
  createdByUser?: {
    email?: string | null;
    profile?: { name?: string | null; username?: string | null; imageUrl?: string | null; phone?: string | null } | null;
  } | null;
  publishedAt?: string | null;
  fetchedAt?: string | null;
  categories?: string[];
  countries?: string[];
  sectors?: string[] | null;
  industries?: string[] | null;
  keywords?: string[];
  action?: {
    state: ActionState;
    investedAmt?: number | null;
  } | null;
  matchScore?: number | null;
  archivedAt?: string | null;
};

type ApiResponse = {
  viewerId: string;
  opportunity: Opportunity;
  related: Opportunity[];
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [investAmt, setInvestAmt] = useState<string>("");
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    summary: "",
    details: "",
    askAmount: "",
    benefits: "",
    tags: "",
    locationName: "",
    locationMapUrl: "",
    contactEmail: "",
    contactPhone: "",
    contactUsername: "",
  });

  const opportunity = data?.opportunity;
  const state = opportunity?.action?.state ?? "NONE";
  const viewerId = data?.viewerId ?? null;
  const isOwner = Boolean(viewerId && opportunity?.createdByUser?.id && viewerId === opportunity.createdByUser.id);

  const chips = useMemo(() => {
    if (!opportunity) return [] as { label: string; values: string[]; icon: ReactNode }[];
    return [
      { label: "Categories", values: opportunity.categories ?? [], icon: <Layers className="h-4 w-4" /> },
      { label: "Countries", values: opportunity.countries ?? [], icon: <Globe2 className="h-4 w-4" /> },
      { label: "Sectors", values: opportunity.sectors ?? [], icon: <Layers className="h-4 w-4" /> },
      { label: "Industries", values: opportunity.industries ?? [], icon: <Layers className="h-4 w-4" /> },
      { label: "Keywords", values: opportunity.keywords ?? [], icon: <Tags className="h-4 w-4" /> },
      { label: "Tags", values: opportunity.tags ?? [], icon: <Tags className="h-4 w-4" /> },
    ];
  }, [opportunity]);

  const freshness = useMemo(() => {
    if (!opportunity) return "—";
    const ts = opportunity.publishedAt ?? opportunity.fetchedAt;
    return ts ? new Date(ts).toLocaleString() : "—";
  }, [opportunity]);

  const posterName =
    opportunity?.createdByUser?.profile?.username ||
    opportunity?.createdByUser?.profile?.name ||
    opportunity?.createdByUser?.email ||
    null;

  const images = (opportunity?.imageUrls?.length
    ? opportunity?.imageUrls
    : opportunity?.imageUrl
      ? [opportunity.imageUrl]
      : []) as string[];

  async function load() {
    const id = params?.id;
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${id}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 404) {
        toast.error("Opportunity not found");
        router.push("/opportunities");
        return;
      }

      const data: ApiResponse = await res.json();
      setData(data);
      setInvestAmt(
        data.opportunity.action?.investedAmt != null
          ? String(data.opportunity.action.investedAmt)
          : ""
      );
      setEditForm({
        title: data.opportunity.title ?? "",
        summary: data.opportunity.summary ?? "",
        details: data.opportunity.details ?? "",
        askAmount: data.opportunity.askAmount != null ? String(data.opportunity.askAmount) : "",
        benefits: data.opportunity.benefits ?? "",
        tags: (data.opportunity.tags ?? []).join(", "),
        locationName: data.opportunity.locationName ?? "",
        locationMapUrl: data.opportunity.locationMapUrl ?? "",
        contactEmail: data.opportunity.contactEmail ?? "",
        contactPhone: data.opportunity.contactPhone ?? "",
        contactUsername: data.opportunity.contactUsername ?? "",
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load opportunity");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function updateAction(nextState: ActionState, amount?: number) {
    if (!opportunity) return;
    setBusy(true);
    try {
      const res = await fetch("/api/user/opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          state: nextState,
          investedAmt: nextState === "INVESTED" ? amount ?? 0 : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Action failed");
      }

      toast.success(
        nextState === "NONE"
          ? "Cleared"
          : nextState === "SAVED"
            ? "Saved"
            : nextState === "VERY_INTERESTED"
              ? "Marked very interested"
              : "Marked invested"
      );
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdits() {
    if (!opportunity) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/user/opportunities/${opportunity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to update");
      toast.success("Opportunity updated");
      setEditOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update opportunity");
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    if (!opportunity) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/user/opportunities/${opportunity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !opportunity.archivedAt }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to update");
      toast.success(opportunity.archivedAt ? "Opportunity restored" : "Opportunity archived");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update opportunity");
    } finally {
      setBusy(false);
    }
  }

  async function deleteOpportunity() {
    if (!opportunity) return;
    if (!window.confirm("Delete this opportunity? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/user/opportunities/${opportunity.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to delete");
      toast.success("Opportunity deleted");
      router.push("/opportunities");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete opportunity");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!opportunity) return;
    const identifier =
      opportunity.createdByUser?.profile?.username || opportunity.createdByUser?.email || "";
    if (!identifier) {
      toast.error("No recipient available");
      return;
    }
    if (!replyBody.trim()) {
      toast.error("Write a message first");
      return;
    }
    setReplySending(true);
    try {
      const res = await fetch("/api/user/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identifier,
          body: replyBody,
          opportunityId: opportunity.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Message failed");
      }
      toast.success("Message sent");
      setReplyBody("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send message");
    } finally {
      setReplySending(false);
    }
  }

  function handleInvested() {
    const num = Number(investAmt);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    void updateAction("INVESTED", num);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-[420px]" />
          <Skeleton className="h-[240px]" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <Button variant="outline" asChild>
            <Link href="/opportunities">Back to feed</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Opportunity not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="px-0" asChild>
              <Link href="/opportunities" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to feed
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-2">
              <Timer className="h-4 w-4" /> Updated {freshness}
            </span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            {opportunity.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {typeof opportunity.matchScore === "number" && (
              <Badge variant="secondary">Match {opportunity.matchScore}%</Badge>
            )}
            {opportunity.source && <Badge variant="secondary">{opportunity.source}</Badge>}
            <Badge variant="outline">{formatDate(opportunity.publishedAt ?? opportunity.fetchedAt)}</Badge>
            {state !== "NONE" && <Badge className="bg-primary text-primary-foreground">{state}</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={busy}>Edit</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit opportunity</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-sm font-medium">Title</span>
                      <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-sm font-medium">Summary</span>
                      <Textarea
                        value={editForm.summary}
                        onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-sm font-medium">Details</span>
                      <Textarea
                        value={editForm.details}
                        onChange={(e) => setEditForm({ ...editForm, details: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Ask amount</span>
                      <Input
                        value={editForm.askAmount}
                        onChange={(e) => setEditForm({ ...editForm, askAmount: e.target.value })}
                        type="number"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Benefits</span>
                      <Input value={editForm.benefits} onChange={(e) => setEditForm({ ...editForm, benefits: e.target.value })} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-sm font-medium">Tags (comma-separated)</span>
                      <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Location</span>
                      <Input
                        value={editForm.locationName}
                        onChange={(e) => setEditForm({ ...editForm, locationName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Map link</span>
                      <Input
                        value={editForm.locationMapUrl}
                        onChange={(e) => setEditForm({ ...editForm, locationMapUrl: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Contact email</span>
                      <Input
                        value={editForm.contactEmail}
                        onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Contact phone</span>
                      <Input
                        value={editForm.contactPhone}
                        onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-sm font-medium">Contact username</span>
                      <Input
                        value={editForm.contactUsername}
                        onChange={(e) => setEditForm({ ...editForm, contactUsername: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={saveEdits} disabled={busy}>Save changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={toggleArchive} disabled={busy}>
                {opportunity.archivedAt ? "Restore" : "Archive"}
              </Button>
              <Button variant="destructive" onClick={deleteOpportunity} disabled={busy}>
                Delete
              </Button>
            </>
          )}
          {opportunity.url && (
            <Button variant="outline" asChild>
              <a href={opportunity.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
                Open source <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="secondary" onClick={() => updateAction("SAVED")} disabled={busy}>
            <Bookmark className="h-4 w-4 mr-2" /> Save
          </Button>
          <Button variant="secondary" onClick={() => updateAction("VERY_INTERESTED")} disabled={busy}>
            <Star className="h-4 w-4 mr-2" /> Interested
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Opportunity brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base text-muted-foreground leading-relaxed">
              {opportunity.details || opportunity.summary || "No summary provided yet."}
            </p>

            {images.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {images.slice(0, 4).map((src) => (
                  <div key={src} className="overflow-hidden rounded-lg border bg-muted/20">
                    <img src={src} alt={opportunity.title} className="h-40 w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <StatRow label="Published" value={formatDate(opportunity.publishedAt)} />
              <StatRow label="Fetched" value={formatDate(opportunity.fetchedAt)} />
              <StatRow label="Source" value={opportunity.source || "—"} />
              <StatRow label="Status" value={state} />
              {opportunity.askAmount != null && (
                <StatRow label="Ask amount" value={`$${opportunity.askAmount.toLocaleString()}`} />
              )}
              {posterName && <StatRow label="Posted by" value={posterName} />}
            </div>

            <Separator />

            <div className="space-y-4">
              {chips.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {group.icon}
                    {group.label}
                  </div>
                  {group.values?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {group.values.map((value) => (
                        <Badge key={`${group.label}-${value}`} variant="secondary">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No {group.label.toLowerCase()} yet.</p>
                  )}
                </div>
              ))}
            </div>

            {(opportunity.locationName ||
              opportunity.locationMapUrl ||
              opportunity.contactEmail ||
              opportunity.contactPhone ||
              opportunity.contactUsername ||
              opportunity.benefits) && (
              <>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="text-sm font-medium">Contact & logistics</div>
                  {opportunity.locationName && (
                    <div className="text-muted-foreground">Location: {opportunity.locationName}</div>
                  )}
                  {opportunity.locationMapUrl && (
                    <a
                      href={opportunity.locationMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      View map
                    </a>
                  )}
                  {opportunity.benefits && (
                    <div className="text-muted-foreground">Benefits: {opportunity.benefits}</div>
                  )}
                  {(opportunity.contactEmail ||
                    opportunity.contactPhone ||
                    opportunity.contactUsername) && (
                    <div className="space-y-1 text-muted-foreground">
                      {opportunity.contactEmail && <div>Email: {opportunity.contactEmail}</div>}
                      {opportunity.contactPhone && <div>Phone: {opportunity.contactPhone}</div>}
                      {opportunity.contactUsername && <div>Username: {opportunity.contactUsername}</div>}
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4" /> Next step
              </div>
              <p className="text-sm text-muted-foreground">
                Capture an invested amount or keep it saved to track how this signal evolves over time.
              </p>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <Input
                  type="number"
                  min="0"
                  step="100"
                  className="md:w-48"
                  value={investAmt}
                  onChange={(e) => setInvestAmt(e.target.value)}
                  placeholder="Amount invested"
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleInvested} disabled={busy}>
                    <Banknote className="h-4 w-4 mr-2" /> Mark invested
                  </Button>
                  <Button variant="outline" onClick={() => updateAction("NONE")} disabled={busy}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Clear state
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {posterName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Message the poster</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Send a private reply to {posterName}.
                </div>
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a message..."
                  rows={3}
                />
                <Button onClick={sendReply} disabled={replySending}>
                  {replySending ? "Sending..." : "Send message"}
                </Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Signal snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatRow label="Keywords matched" value={opportunity.keywords?.length ?? 0} />
              <StatRow label="Countries mentioned" value={opportunity.countries?.length ?? 0} />
              <StatRow label="Categories tagged" value={opportunity.categories?.length ?? 0} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.related.length ? (
                data.related.slice(0, 3).map((r) => (
                  <OpportunityCard key={r.id} opp={r as any} onActionUpdated={load} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No related items yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
