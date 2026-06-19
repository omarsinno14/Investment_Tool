

import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Bookmark, Star, Banknote, RotateCcw, MapPin, Clock3 } from "lucide-react";
import { useCurrency } from "@/components/app/CurrencyProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

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
  askCurrency?: string | null;
  expectedRoiPercent?: number | null;
  expectedRoiDurationMonths?: number | null;
  createdByUser?: {
    profile?: { name?: string | null; username?: string | null; imageUrl?: string | null } | null;
  } | null;
  publishedAt?: string | null;
  fetchedAt?: string | null;
  categories?: string[];
  countryTags?: string[];
  locationName?: string | null;
  keywords?: string[];
  action?: {
    state: "NONE" | "SAVED" | "VERY_INTERESTED" | "INVESTED";
    investedAmt?: number | null;
  } | null;
  matchScore?: number | null;
  boostedUntil?: string | null;
};

function formatDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

type ActionStateType = NonNullable<Opportunity["action"]>["state"];

export function OpportunityCard({ opp, onActionUpdated }: { opp: Opportunity; onActionUpdated?: () => void }) {
  const [busy, setBusy] = useState(false);
  const { format } = useCurrency();

  const dateLabel = formatDate(opp.publishedAt ?? opp.fetchedAt);
  const state = opp.action?.state ?? "NONE";
  const tags = (opp.tags ?? opp.categories ?? []).slice(0, 2);
  const keywords = (opp.keywords ?? []).slice(0, 3);
  const imageUrl = opp.imageUrl ?? opp.imageUrls?.[0] ?? null;
  const poster =
    opp.createdByUser?.profile?.username || opp.createdByUser?.profile?.name || undefined;
  const isSponsored = opp.boostedUntil ? new Date(opp.boostedUntil).getTime() > Date.now() : false;

  async function setState(nextState: ActionStateType, investedAmt?: number) {
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
    <Card className="group overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-xl">
      {imageUrl ? (
        <div className="relative overflow-hidden border-b bg-muted/20">
          <img src={imageUrl} alt={opp.title} className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" decoding="async" />
          {isSponsored && <Badge className="absolute left-3 top-3">Sponsored</Badge>}
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center border-b bg-muted/30 text-sm text-muted-foreground">No image</div>
      )}

      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base leading-snug"><Link href={`/opportunities/${opp.id}`} className="hover:underline">{opp.title}</Link></CardTitle>
          {opp.url && (
            <a className="shrink-0 text-muted-foreground hover:text-foreground" href={opp.url} target="_blank" rel="noreferrer" title="Open source link"><ExternalLink className="h-4 w-4" /></a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{opp.locationName || "Remote / N/A"}</span>
          {dateLabel && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{dateLabel}</span>}
          {poster && <Badge variant="outline">{poster}</Badge>}
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">{opp.summary ?? opp.details ?? "—"}</p>

        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{opp.askAmount != null ? format(opp.askAmount, { fromCurrency: opp.askCurrency ?? "USD" }) : "Price N/A"}</Badge>
          {opp.expectedRoiPercent != null && <Badge variant="secondary">ROI {opp.expectedRoiPercent}%</Badge>}
          {state !== "NONE" && <Badge>{state === "SAVED" ? "Saved" : state === "VERY_INTERESTED" ? "Interested" : "Invested"}</Badge>}
          {tags.map((t) => <Badge key={`tag-${t}`} variant="outline">{t}</Badge>)}
          {keywords.map((k) => <Badge key={`kw-${k}`} variant="secondary">{k}</Badge>)}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button size="sm" variant={state === "SAVED" ? "default" : "outline"} disabled={busy} onClick={() => setState("SAVED")}>
            <Bookmark className="mr-1 h-4 w-4" />Save
          </Button>
          <Button size="sm" variant={state === "VERY_INTERESTED" ? "default" : "outline"} disabled={busy} onClick={() => setState("VERY_INTERESTED")}>
            <Star className="mr-1 h-4 w-4" />Interest
          </Button>
          <Button size="sm" variant={state === "INVESTED" ? "default" : "outline"} disabled={busy} onClick={markInvested}>
            <Banknote className="mr-1 h-4 w-4" />Invest
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setState("NONE")}>
            <RotateCcw className="mr-1 h-4 w-4" />Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}