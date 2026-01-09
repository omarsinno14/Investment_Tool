"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Bookmark, Star, Banknote, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  createdByUser?: {
    profile?: {
      name?: string | null;
      username?: string | null;
      imageUrl?: string | null;
      emailVerified?: boolean | null;
      phoneVerified?: boolean | null;
    } | null;
  } | null;
  publishedAt?: string | null;
  fetchedAt?: string | null;
  categories?: string[];
  countries?: string[];
  keywords?: string[];
  action?: {
    state: "NONE" | "SAVED" | "VERY_INTERESTED" | "INVESTED";
    investedAmt?: number | null;
  } | null;
};

function formatDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function OpportunityCard({ opp, onActionUpdated }: { opp: Opportunity; onActionUpdated?: () => void }) {
  const [busy, setBusy] = useState(false);

  const dateLabel = formatDate(opp.publishedAt ?? opp.fetchedAt);
  const state = opp.action?.state ?? "NONE";
  const tags = (opp.tags ?? opp.categories ?? []).slice(0, 2);
  const keywords = (opp.keywords ?? []).slice(0, 3);
  const imageUrl = opp.imageUrl ?? opp.imageUrls?.[0] ?? null;
  const poster =
    opp.createdByUser?.profile?.username || opp.createdByUser?.profile?.name || undefined;
  const isVerified = Boolean(
    opp.createdByUser?.profile?.emailVerified && opp.createdByUser?.profile?.phoneVerified
  );

  async function setState(nextState: Opportunity["action"]["state"], investedAmt?: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/user/opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opp.id,
          state: nextState,
          investedAmt: nextState === "INVESTED" ? investedAmt ?? 0 : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed");
      }

      if (nextState === "SAVED") toast.success("Saved");
      if (nextState === "VERY_INTERESTED") toast.success("Marked very interested");
      if (nextState === "INVESTED") toast.success("Marked invested");
      if (nextState === "NONE") toast.message("Cleared");

      onActionUpdated?.();
    } catch (e: any) {
      console.error(e);
      toast.error("Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function markInvested() {
    const raw = window.prompt("How much did you invest? (number)");
    if (raw == null) return;
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("Please enter a valid number");
      return;
    }
    await setState("INVESTED", amt);
  }

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="space-y-2">
        {imageUrl && (
          <div className="overflow-hidden rounded-md border bg-muted/20">
            <img
              src={imageUrl}
              alt={opp.title}
              className="h-40 w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">
            <Link href={`/opportunities/${opp.id}`} className="hover:underline">
              {opp.title}
            </Link>
          </CardTitle>

          {opp.url && (
            <a
              className="shrink-0 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              href={opp.url}
              target="_blank"
              rel="noreferrer"
              title="Open source link"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state !== "NONE" && <Badge>{state}</Badge>}
          {opp.source && <Badge variant="secondary">{opp.source}</Badge>}
          {poster && (
            <Badge variant="outline">
              Posted by {poster}
              {isVerified && <span className="ml-1 text-xs">✓ Verified</span>}
            </Badge>
          )}
          {dateLabel && <span className="text-xs text-muted-foreground">{dateLabel}</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{opp.summary ?? opp.details ?? "—"}</p>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {state === "INVESTED" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              ${opp.action?.investedAmt?.toLocaleString() ?? "0"}
            </Badge>
          )}
          {tags.map((t) => (
            <Badge key={`tag-${t}`} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
          {keywords.map((k) => (
            <Badge key={`kw-${k}`} variant="secondary" className="text-xs">
              {k}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={state === "SAVED" ? "default" : "outline"}
            disabled={busy}
            onClick={() => setState("SAVED")}
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button
            size="sm"
            variant={state === "VERY_INTERESTED" ? "default" : "outline"}
            disabled={busy}
            onClick={() => setState("VERY_INTERESTED")}
          >
            <Star className="h-4 w-4 mr-2" />
            Interested
          </Button>

          <Button
            size="sm"
            variant={state === "INVESTED" ? "default" : "outline"}
            disabled={busy}
            onClick={markInvested}
          >
            <Banknote className="h-4 w-4 mr-2" />
            Invested
          </Button>

          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setState("NONE")}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
