import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Bookmark, Star, Banknote, MapPin, Clock3, ShieldCheck, TrendingUp, Users } from "lucide-react";
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
  
  // New structured fields
  dealType?: string | null;
  companyName?: string | null;
  minInvestment?: number | null;
  riskLevel?: 'EXTREMELY_LOW'|'LOW'|'MEDIUM'|'MEDIUM_HIGH'|'HIGH'|'EXTREMELY_HIGH' | null;
  dealStatus?: 'DRAFT'|'OPEN'|'CLOSING_SOON'|'FUNDED'|'CLOSED';
  dealVerification?: 'PENDING'|'APPROVED'|'REJECTED';
  closingDate?: string | null;
  dealScore?: number | null;
  documentUrls?: string[];
  
  savesCount?: number;
  interestedCount?: number;
  viewerState?: 'NONE'|'SAVED'|'VERY_INTERESTED'|'INVESTED';
};

function formatDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getRiskLabel(risk: Opportunity['riskLevel']) {
  switch(risk) {
    case 'EXTREMELY_LOW': return 'Extremely Low Risk';
    case 'LOW': return 'Low Risk';
    case 'MEDIUM': return 'Medium Risk';
    case 'MEDIUM_HIGH': return 'Medium-High Risk';
    case 'HIGH': return 'High Risk';
    case 'EXTREMELY_HIGH': return 'Extremely High Risk';
    default: return 'Unrated Risk';
  }
}

function getStatusLabel(status: Opportunity['dealStatus']) {
  switch(status) {
    case 'DRAFT': return 'Draft';
    case 'OPEN': return 'Open';
    case 'CLOSING_SOON': return 'Closing Soon';
    case 'FUNDED': return 'Funded';
    case 'CLOSED': return 'Closed';
    default: return 'Unknown Status';
  }
}

type ActionStateType = "NONE" | "SAVED" | "VERY_INTERESTED" | "INVESTED";

export function OpportunityCard({ opp, onActionUpdated }: { opp: Opportunity; onActionUpdated?: () => void }) {
  const [busy, setBusy] = useState(false);
  const { format } = useCurrency();

  const state = opp.viewerState ?? opp.action?.state ?? "NONE";
  const imageUrl = opp.imageUrl ?? opp.imageUrls?.[0] ?? null;
  const isSponsored = opp.boostedUntil ? new Date(opp.boostedUntil).getTime() > Date.now() : false;

  const minInvest = opp.minInvestment ?? opp.askAmount;
  const saves = opp.savesCount ?? 0;
  const interested = opp.interestedCount ?? 0;

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

  return (
    <Card className="group overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-accent/40 active:scale-[0.98]">
      {imageUrl ? (
        <div className="relative overflow-hidden border-b bg-muted/20">
          <img src={imageUrl} alt={opp.title} className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" decoding="async" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {opp.dealStatus && (
              <Badge className="bg-foreground text-background font-semibold uppercase tracking-wider text-[10px] backdrop-blur-md">
                {getStatusLabel(opp.dealStatus)}
              </Badge>
            )}
            {opp.dealVerification === 'APPROVED' && (
              <Badge className="bg-accent text-accent-foreground font-semibold flex items-center gap-1 shadow-md">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
            {isSponsored && <Badge className="bg-primary/90 text-primary-foreground">Sponsored</Badge>}
          </div>
        </div>
      ) : (
        <div className="relative flex aspect-[16/9] items-center justify-center border-b bg-muted/30 text-sm text-muted-foreground">
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {opp.dealStatus && (
              <Badge className="bg-foreground text-background font-semibold uppercase tracking-wider text-[10px] backdrop-blur-md">
                {getStatusLabel(opp.dealStatus)}
              </Badge>
            )}
            {opp.dealVerification === 'APPROVED' && (
              <Badge className="bg-accent text-accent-foreground font-semibold flex items-center gap-1 shadow-md">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
          <span className="font-medium opacity-50">Vertica Exclusive</span>
        </div>
      )}

      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              {opp.companyName && (
                <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-1">{opp.companyName}</div>
              )}
              <CardTitle className="line-clamp-2 text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                <Link href={`/opportunities/${opp.id}`}>
                  {opp.title}
                </Link>
              </CardTitle>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
            {opp.locationName && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{opp.locationName}</span>
            )}
            {opp.dealType && (
              <span className="inline-flex items-center gap-1"><Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{opp.dealType}</Badge></span>
            )}
            {opp.closingDate && opp.dealStatus === 'CLOSING_SOON' && (
              <span className="inline-flex items-center gap-1 text-destructive font-medium"><Clock3 className="h-3.5 w-3.5" />Closes {formatDate(opp.closingDate)}</span>
            )}
          </div>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">{opp.summary ?? opp.details ?? "—"}</p>

        <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/40">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Min. Investment</div>
            <div className="font-semibold text-foreground">
              {minInvest != null ? `From ${format(minInvest, { fromCurrency: opp.askCurrency ?? "USD" })}` : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Projected Return</div>
            <div className="font-semibold text-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              {opp.expectedRoiPercent != null ? `${opp.expectedRoiPercent}%` : "TBD"}
              {opp.expectedRoiDurationMonths != null && <span className="text-xs font-normal text-muted-foreground">/{opp.expectedRoiDurationMonths}mo</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
            {(saves > 0 || interested > 0) && (
              <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                <Users className="h-3.5 w-3.5" />
                <span>{saves + interested} observing</span>
              </div>
            )}
            {opp.riskLevel && (
              <Badge variant="outline" className="text-[10px] tracking-wide bg-background">
                {getRiskLabel(opp.riskLevel)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button 
            size="sm" 
            variant={state === "SAVED" ? "default" : "outline"} 
            className={`flex-1 transition-all ${state === "SAVED" ? "bg-primary hover:bg-primary/90" : "hover:border-primary/50 hover:text-primary"}`}
            disabled={busy} 
            onClick={(e) => { e.preventDefault(); setState(state === "SAVED" ? "NONE" : "SAVED"); }}
          >
            <Bookmark className={`mr-1.5 h-4 w-4 ${state === "SAVED" ? "fill-current" : ""}`} />
            {state === "SAVED" ? "Saved" : "Save"}
          </Button>
          <Button 
            size="sm" 
            variant={state === "VERY_INTERESTED" ? "default" : "outline"} 
            className={`flex-1 transition-all ${state === "VERY_INTERESTED" ? "bg-accent hover:bg-accent/90" : "hover:border-accent/50 hover:text-accent"}`}
            disabled={busy} 
            onClick={(e) => { e.preventDefault(); setState(state === "VERY_INTERESTED" ? "NONE" : "VERY_INTERESTED"); }}
          >
            <Star className={`mr-1.5 h-4 w-4 ${state === "VERY_INTERESTED" ? "fill-current" : ""}`} />
            {state === "VERY_INTERESTED" ? "Interested" : "Interest"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
