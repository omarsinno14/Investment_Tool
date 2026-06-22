import { Link } from "wouter";
import { useParams, useLocation } from "wouter";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Bookmark,
  Globe2,
  Layers,
  Sparkles,
  Star,
  Tags,
  Timer,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Clock3,
  FileText,
  AlertTriangle,
  Info,
  Flag,
  Users,
  MessageSquare,
  Send,
  Trash2,
  Loader2,
  Award
} from "lucide-react";

import { useCurrency } from "@/components/app/CurrencyProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "@/components/app/CurrencyProvider";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { ShareButton } from "@/components/app/ShareButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  askCurrency?: string | null;
  expectedRoiPercent?: number | null;
  expectedRoiDurationMonths?: number | null;
  benefits?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactUsername?: string | null;
  locationName?: string | null;
  locationMapUrl?: string | null;
  createdByUser?: {
    id?: string | null;
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
  boostedAt?: string | null;
  boostedUntil?: string | null;
  boostedBudget?: number | null;
  boostedCurrency?: string | null;
  
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

type ApiResponse = {
  viewerId: string;
  opportunity: Opportunity;
  relatedOpportunities?: Opportunity[];
  interestedUsers?: { id: string; displayName?: string | null; avatarUrl?: string | null }[];
};

type CommentAuthor = {
  id: string;
  name?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  reputation?: number | null;
};

type CommentNode = {
  id: string;
  opportunityId: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  canDelete: boolean;
  replies: CommentNode[];
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getRiskLabel(risk: Opportunity['riskLevel']) {
  switch(risk) {
    case 'EXTREMELY_LOW': return 'Extremely Low Risk';
    case 'LOW': return 'Low Risk';
    case 'MEDIUM': return 'Medium Risk';
    case 'MEDIUM_HIGH': return 'Medium-High Risk';
    case 'HIGH': return 'High Risk';
    case 'EXTREMELY_HIGH': return 'Extremely High Risk';
    default: return 'Unrated';
  }
}

function getStatusLabel(status: Opportunity['dealStatus']) {
  switch(status) {
    case 'DRAFT': return 'Draft';
    case 'OPEN': return 'Open';
    case 'CLOSING_SOON': return 'Closing Soon';
    case 'FUNDED': return 'Funded';
    case 'CLOSED': return 'Closed';
    default: return 'Unknown';
  }
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

function StatCard({ label, value, icon, accent = false }: { label: string; value: ReactNode; icon?: ReactNode; accent?: boolean }) {
  return (
    <div className={`p-5 rounded-xl border ${accent ? 'border-accent/30 bg-accent/5' : 'border-border/50 bg-card'} flex flex-col gap-1.5`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
        {icon && <span className={accent ? "text-accent" : "text-muted-foreground/70"}>{icon}</span>}
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${accent ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

function commentAuthorName(author: CommentAuthor) {
  return author.name || author.username || "Member";
}

function CommentItem({
  comment,
  onDelete,
  replyTo,
  setReplyTo,
  replyBody,
  setReplyBody,
  onSubmitReply,
  postingReply,
  isReply = false,
}: {
  comment: CommentNode;
  onDelete: (id: string) => void;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyBody: string;
  setReplyBody: (v: string) => void;
  onSubmitReply: (parentId: string) => void;
  postingReply: boolean;
  isReply?: boolean;
}) {
  const author = comment.author;
  const name = commentAuthorName(author);
  const reputation = author.reputation ?? 0;
  return (
    <div className={`flex gap-3 ${isReply ? "" : "rounded-2xl border border-border/50 bg-card p-4"}`}>
      <Link href={author.id ? `/users/${author.id}` : "#"}>
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={author.imageUrl ?? ""} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">{getInitials(name)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link href={author.id ? `/users/${author.id}` : "#"} className="font-semibold text-sm hover:underline">
            {name}
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Award className="h-3 w-3" /> {reputation}
              </span>
            </TooltipTrigger>
            <TooltipContent>Reputation: {reputation}</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{comment.body}</p>
        <div className="flex items-center gap-3 pt-0.5">
          {!isReply && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            >
              Reply
            </button>
          )}
          {comment.canDelete && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>

        {replyTo === comment.id && !isReply && (
          <div className="mt-2 space-y-2">
            <Textarea
              placeholder={`Reply to ${name}...`}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={2}
              maxLength={2000}
              className="resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyBody(""); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => onSubmitReply(comment.id)} disabled={postingReply || !replyBody.trim()}>
                {postingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Reply
              </Button>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l border-border/60 pl-4">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onDelete={onDelete}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyBody={replyBody}
                setReplyBody={setReplyBody}
                onSubmitReply={onSubmitReply}
                postingReply={postingReply}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OpportunityDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { format } = useCurrency();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const [comments, setComments] = useState<CommentNode[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [postingReply, setPostingReply] = useState(false);

  const opportunity = data?.opportunity;
  const state = opportunity?.viewerState ?? opportunity?.action?.state ?? "NONE";
  const viewerId = data?.viewerId ?? null;
  const isOwner = Boolean(viewerId && opportunity?.createdByUser?.id && viewerId === opportunity.createdByUser.id);
  const isSponsored = opportunity?.boostedUntil
    ? new Date(opportunity.boostedUntil).getTime() > Date.now()
    : false;

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
      const res = await fetch(`/api/opportunities/${id}`, { cache: "no-store", credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 404) {
        toast.error("Opportunity not found");
        navigate("/opportunities");
        return;
      }

      const data: ApiResponse = await res.json();
      setData(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load opportunity");
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    const id = params?.id;
    if (!id) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${id}/comments`, { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const body = await res.json();
      setComments(Array.isArray(body.comments) ? body.comments : []);
    } catch (e) {
      console.error(e);
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function postComment(text: string, parentId?: string) {
    const id = params?.id;
    if (!id) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    try {
      const res = await fetch(`/api/opportunities/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: trimmed, parentId: parentId ?? undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to post comment");
      await loadComments();
      return true;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Could not post comment");
      return false;
    }
  }

  async function submitComment() {
    if (!commentBody.trim()) return;
    setPostingComment(true);
    const ok = await postComment(commentBody);
    if (ok) setCommentBody("");
    setPostingComment(false);
  }

  async function submitReply(parentId: string) {
    if (!replyBody.trim()) return;
    setPostingReply(true);
    const ok = await postComment(replyBody, parentId);
    if (ok) {
      setReplyBody("");
      setReplyTo(null);
    }
    setPostingReply(false);
  }

  async function deleteComment(commentId: string) {
    const id = params?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/opportunities/${id}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to delete");
      await loadComments();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Could not delete comment");
    }
  }

  const commentCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

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

  async function submitReport() {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: "OPPORTUNITY",
          targetId: opportunity?.id,
          reason: reportReason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to report");
      toast.success("Report submitted");
      setReportOpen(false);
      setReportReason("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit report");
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <Button variant="outline" asChild>
            <Link href="/opportunities">Back to feed</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground flex flex-col items-center">
            <Globe2 className="h-12 w-12 mb-4 opacity-20" />
            <div className="text-lg font-medium text-foreground">Opportunity not found</div>
            <p className="mt-2 max-w-md mx-auto">This deal may have been removed or you might not have permission to view it.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const minInvest = opportunity.minInvestment ?? opportunity.askAmount;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Navigation */}
      <div className="flex items-center gap-3 text-sm">
        <Button variant="ghost" size="sm" className="px-0 text-muted-foreground hover:text-foreground transition-colors" asChild>
          <Link href="/opportunities" className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Deal Room
          </Link>
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border shadow-sm bg-card">
        {images.length > 0 ? (
          <div className="aspect-[21/9] w-full bg-muted">
            <img src={images[0]} alt={opportunity.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          </div>
        ) : (
          <div className="aspect-[21/9] w-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
            <Globe2 className="h-24 w-24 text-muted-foreground/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 items-center">
            {opportunity.dealStatus && (
              <Badge className="bg-foreground text-background font-bold uppercase tracking-widest text-[11px] px-3 py-1">
                {getStatusLabel(opportunity.dealStatus)}
              </Badge>
            )}
            {opportunity.dealVerification === 'APPROVED' && (
              <Badge className="bg-accent text-accent-foreground font-semibold flex items-center gap-1.5 px-3 py-1 shadow-md">
                <ShieldCheck className="h-3.5 w-3.5" /> Vertica Verified
              </Badge>
            )}
            {opportunity.dealType && (
              <Badge variant="secondary" className="px-3 py-1 font-medium bg-background/80 backdrop-blur-md">
                {opportunity.dealType}
              </Badge>
            )}
            {isSponsored && <Badge className="bg-primary text-primary-foreground px-3 py-1">Sponsored</Badge>}
          </div>
          
          <div>
            {opportunity.companyName && (
              <h2 className="text-accent font-bold uppercase tracking-widest text-sm mb-2">{opportunity.companyName}</h2>
            )}
            <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-foreground max-w-3xl">
              {opportunity.title}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/80 font-medium mt-2">
            {opportunity.locationName && (
              <span className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full"><MapPin className="h-4 w-4" />{opportunity.locationName}</span>
            )}
            {opportunity.closingDate && opportunity.dealStatus === 'CLOSING_SOON' && (
              <span className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1.5 rounded-full"><Clock3 className="h-4 w-4" />Closes {formatDate(opportunity.closingDate)}</span>
            )}
            <span className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Timer className="h-4 w-4" /> Listed {formatDate(opportunity.publishedAt ?? opportunity.fetchedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border rounded-2xl shadow-sm">
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-foreground">{(opportunity.savesCount ?? 0) + (opportunity.interestedCount ?? 0)}</span>
            <span className="text-muted-foreground">Observing</span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <ShareButton 
            title={opportunity.title} 
            text={`Check out this opportunity on Vertica: ${opportunity.title}`} 
            url={window.location.href}
            variant="ghost"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            size="lg" 
            variant={state === "SAVED" ? "default" : "outline"} 
            className={`flex-1 md:flex-none transition-all rounded-xl ${state === "SAVED" ? "bg-primary hover:bg-primary/90" : ""}`}
            disabled={busy} 
            onClick={() => updateAction(state === "SAVED" ? "NONE" : "SAVED")}
          >
            <Bookmark className={`mr-2 h-5 w-5 ${state === "SAVED" ? "fill-current" : ""}`} />
            {state === "SAVED" ? "Saved" : "Save Deal"}
          </Button>
          <Button 
            size="lg" 
            variant={state === "VERY_INTERESTED" ? "default" : "default"} 
            className={`flex-1 md:flex-none transition-all rounded-xl shadow-md ${state === "VERY_INTERESTED" ? "bg-primary hover:bg-primary/90" : "bg-accent hover:bg-accent/90 text-accent-foreground"}`}
            disabled={busy} 
            onClick={() => updateAction(state === "VERY_INTERESTED" ? "NONE" : "VERY_INTERESTED")}
          >
            <Star className={`mr-2 h-5 w-5 ${state === "VERY_INTERESTED" ? "fill-current" : ""}`} />
            {state === "VERY_INTERESTED" ? "Interested" : "Express Interest"}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Min. Investment" 
          value={minInvest != null ? `From ${format(minInvest, { fromCurrency: opportunity.askCurrency ?? "USD", maximumFractionDigits: 0 })}` : "N/A"} 
          icon={<Banknote className="h-4 w-4" />}
          accent={true}
        />
        <StatCard 
          label="Projected Return" 
          value={opportunity.expectedRoiPercent != null ? `${opportunity.expectedRoiPercent}%` : "TBD"} 
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard 
          label="Time Horizon" 
          value={opportunity.expectedRoiDurationMonths != null ? `${opportunity.expectedRoiDurationMonths} Months` : "Flexible"} 
          icon={<Clock3 className="h-4 w-4" />}
        />
        <StatCard 
          label="Risk Profile" 
          value={getRiskLabel(opportunity.riskLevel)} 
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Executive Summary */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold border-b pb-2">Executive Summary</h3>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {opportunity.summary ?? "No summary provided."}
              </p>
            </div>
          </section>

          {/* Detailed Overview */}
          {opportunity.details && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold border-b pb-2">Detailed Overview</h3>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                {opportunity.details}
              </div>
            </section>
          )}

          {/* Benefits / Highlights */}
          {opportunity.benefits && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold border-b pb-2">Key Highlights</h3>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                {opportunity.benefits}
              </div>
            </section>
          )}

          {/* Documents */}
          {opportunity.documentUrls && opportunity.documentUrls.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold border-b pb-2">Deal Documents</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {opportunity.documentUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/5 hover:border-accent/30 transition-colors group">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">Document {i + 1}</p>
                      <p className="text-xs text-muted-foreground truncate">View securely</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Discussion */}
          <section className="space-y-5 pt-8">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" /> Discussion
              </h3>
              {!commentsLoading && commentCount > 0 && (
                <span className="text-sm text-muted-foreground">{commentCount} {commentCount === 1 ? "remark" : "remarks"}</span>
              )}
            </div>

            {/* Composer */}
            <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
              <Textarea
                placeholder="Share your perspective with fellow members..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={3}
                maxLength={2000}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{commentBody.length}/2000</span>
                <Button size="sm" onClick={submitComment} disabled={postingComment || !commentBody.trim()}>
                  {postingComment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Post
                </Button>
              </div>
            </div>

            {commentsLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading discussion...
                </div>
                <Skeleton className="h-20 w-full rounded-xl bg-muted" />
                <Skeleton className="h-20 w-full rounded-xl bg-muted" />
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-center">
                <p className="text-sm text-muted-foreground">Be the first to weigh in. Considered perspectives are welcome here.</p>
              </div>
            ) : (
              <TooltipProvider delayDuration={150}>
                <div className="space-y-5">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onDelete={deleteComment}
                      replyTo={replyTo}
                      setReplyTo={setReplyTo}
                      replyBody={replyBody}
                      setReplyBody={setReplyBody}
                      onSubmitReply={submitReply}
                      postingReply={postingReply}
                    />
                  ))}
                </div>
              </TooltipProvider>
            )}
          </section>

          {/* Related Opportunities */}
          {data.relatedOpportunities && data.relatedOpportunities.length > 0 && (
            <section className="space-y-6 pt-8">
              <h3 className="text-2xl font-bold border-b pb-2">Similar Opportunities</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.relatedOpportunities.slice(0, 2).map(opp => (
                  <OpportunityCard key={opp.id} opp={opp} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Deal Originator */}
          <Card className="rounded-2xl overflow-hidden border-border/50">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe2 className="h-4 w-4" /> Deal Originator
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-border">
                  <AvatarImage src={opportunity.createdByUser?.profile?.imageUrl ?? ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getInitials(opportunity.createdByUser?.profile?.name ?? opportunity.createdByUser?.profile?.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-lg">
                    {opportunity.createdByUser?.profile?.name || opportunity.createdByUser?.profile?.username || "Anonymous Member"}
                  </div>
                  <div className="text-sm text-muted-foreground">Vertica Network Member</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interested Users */}
          {data.interestedUsers && data.interestedUsers.length > 0 && (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm uppercase tracking-wider">Network Interest</h4>
                  <Badge variant="secondary">{data.interestedUsers.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.interestedUsers.slice(0, 10).map((u, i) => (
                    <Avatar key={u.id || i} className="h-10 w-10 border-2 border-background shadow-sm hover:z-10 transition-transform hover:scale-110" title={u.displayName || "Member"}>
                      <AvatarImage src={u.avatarUrl ?? ""} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">{getInitials(u.displayName)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {data.interestedUsers.length > 10 && (
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border-2 border-background">
                      +{data.interestedUsers.length - 10}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags & Classifications */}
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-5 space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Classifications</h4>
              <div className="flex flex-wrap gap-2">
                {opportunity.categories?.map(c => (
                  <Badge key={c} variant="secondary" className="bg-secondary/50">{c}</Badge>
                ))}
                {opportunity.sectors?.map(s => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
                {opportunity.tags?.map(t => (
                  <Badge key={t} variant="outline" className="text-muted-foreground border-border/50">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Report */}
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 justify-start">
                <Flag className="mr-2 h-4 w-4" /> Report this deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report Deal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  If this opportunity violates Vertica guidelines, appears fraudulent, or contains inappropriate content, please describe the issue below.
                </p>
                <Textarea 
                  placeholder="Reason for reporting..." 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={submitReport} disabled={!reportReason.trim()}>Submit Report</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Risk Disclosure Block */}
      <div className="mt-16 p-6 rounded-2xl bg-muted/30 border border-border/50 text-sm text-muted-foreground flex gap-4">
        <Info className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-3">
          <h4 className="font-bold text-foreground">RISK DISCLOSURE & NOT FINANCIAL ADVICE</h4>
          <p>
            The information presented regarding this opportunity does not constitute investment advice, financial advice, trading advice, or any other sort of advice and you should not treat any of the platform's content as such. Vertica does not recommend that any asset should be bought, sold, or held by you.
          </p>
          <p>
            All investments carry significant risk, including the potential loss of principal. "Projected", "target", or "estimated" returns are forward-looking statements based on current assumptions and are not guarantees of future performance. Actual results may vary materially.
          </p>
          <p>
            Members must conduct their own independent due diligence and consult with their financial, legal, and tax advisors before making any investment decisions. Vertica Network acts solely as an introduction platform and does not verify all claims made by deal originators.
          </p>
        </div>
      </div>
    </div>
  );
}
