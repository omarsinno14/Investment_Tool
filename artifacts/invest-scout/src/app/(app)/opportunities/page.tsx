

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, RefreshCcw, Search, X } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { SUPPORTED_CURRENCIES, useCurrency } from "@/components/app/CurrencyProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES_ALL } from "@/lib/countries";
import { INDUSTRIES_BY_SECTOR, SECTORS } from "@/lib/interests";
import { NAV_BADGE_KEYS, markNavSeen } from "@/lib/nav-badges";

type Opportunity = any;

type SortValue =
  | "NEWEST"
  | "OLDEST"
  | "PRICE_LOW"
  | "PRICE_HIGH"
  | "TRENDING"
  | "CLOSING_SOON"
  | "MOST_SAVED"
  | "HIGHEST_INTEREST";

const SERVER_SORTS: Record<string, string> = {
  NEWEST: "newest",
  TRENDING: "trending",
  CLOSING_SOON: "closingSoon",
  MOST_SAVED: "mostSaved",
  HIGHEST_INTEREST: "highestInterest",
};

const RISK_OPTIONS = [
  "EXTREMELY_LOW",
  "LOW",
  "MEDIUM",
  "MEDIUM_HIGH",
  "HIGH",
  "EXTREMELY_HIGH",
];

const STATUS_OPTIONS = ["DRAFT", "OPEN", "CLOSING_SOON", "FUNDED", "CLOSED"];

function toDateValue(o: any) {
  const d = o.publishedAt ?? o.fetchedAt;
  const t = d ? new Date(d).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function tokenizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length >= 4)
    .filter(
      (w) =>
        ![
          "from",
          "with",
          "that",
          "this",
          "your",
          "will",
          "into",
          "over",
          "more",
          "than",
          "after",
          "before",
          "today",
          "latest",
          "about",
          "could",
        ].includes(w)
    );
}

export default function OpportunitiesPage() {
  const draftKey = "vertica-opportunity-draft";
  const [loading, setLoading] = useState(true);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [query, setQuery] = useState("");
  const [exclude, setExclude] = useState("");
  const [tagFilter, setTagFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [customTagFilter, setCustomTagFilter] = useState("");
  const [maxAsk, setMaxAsk] = useState("");
  const [benefitFilter, setBenefitFilter] = useState("");
  const [tab, setTab] = useState<"ALL" | "SAVED" | "VERY_INTERESTED">("ALL");
  const [sort, setSort] = useState<SortValue>("NEWEST");
  const [showStats, setShowStats] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [myPostsOnly, setMyPostsOnly] = useState(false);
  const { currency, convert, format } = useCurrency();

  // Server-side deal filters
  const [dealCategory, setDealCategory] = useState("");
  const [riskLevel, setRiskLevel] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [minReturn, setMinReturn] = useState("");
  const [horizon, setHorizon] = useState("");

  // Saved searches + suggested members
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [savingSearch, setSavingSearch] = useState(false);
  const [followingId, setFollowingId] = useState<string | null>(null);

  const [posting, setPosting] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "",
    summary: "",
    details: "",
    askAmount: "",
    askCurrency: currency,
    expectedRoiPercent: "",
    expectedRoiDurationMonths: "",
    benefits: "",
    tags: "",
    locationName: "",
    locationMapUrl: "",
    contactEmail: "",
    contactPhone: "",
    contactUsername: "",
    images: [] as File[],
  });
  const [hasDraft, setHasDraft] = useState(false);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of opps) {
      for (const t of o?.tags ?? []) {
        const s = String(t ?? "").trim();
        if (s) set.add(s);
      }
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [opps]);

  const industryOptions = useMemo(() => {
    if (sectorFilter === "All") {
      const set = new Set<string>();
      for (const industries of Object.values(INDUSTRIES_BY_SECTOR as any)) {
        for (const i of industries as string[]) set.add(i);
      }
      return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }
    const list = (INDUSTRIES_BY_SECTOR as any)[sectorFilter] as string[] | undefined;
    return ["All", ...(list ?? [])];
  }, [sectorFilter]);

  useEffect(() => {
    if (industryFilter !== "All" && !industryOptions.includes(industryFilter)) {
      setIndustryFilter("All");
    }
  }, [industryOptions, industryFilter]);

  function buildServerParams() {
    const params = new URLSearchParams();
    params.set("type", "community");
    const qy = query.trim();
    if (qy) params.set("q", qy);
    if (dealCategory.trim()) params.set("category", dealCategory.trim());
    if (riskLevel !== "All") params.set("risk", riskLevel);
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (minReturn.trim()) params.set("minReturn", minReturn.trim());
    if (horizon.trim()) params.set("horizon", horizon.trim());
    const serverSort = SERVER_SORTS[sort];
    if (serverSort) params.set("sort", serverSort);
    return params;
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities?${buildServerParams().toString()}`, {
        cache: "no-store",
        credentials: "include",
      });

      if (res.status === 401) {
        toast.error("Please log in again.");
        window.location.href = "/login";
        return;
      }

      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      const data = isJson ? await res.json() : null;

      if (!res.ok) {
        const errMsg = isJson ? data?.error || "Failed to load opportunities" : `Unexpected response (${ct})`;
        throw new Error(errMsg);
      }

      if (!isJson) {
        const txt = await res.text();
        throw new Error(`Expected JSON, got ${ct}. ${txt.slice(0, 200)}`);
      }

      setOpps(data.opportunities ?? []);
      setViewerId(data.viewerId ?? null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }

  async function submitPost() {
    if (!postForm.title.trim()) {
      toast.error("Add a title for your opportunity");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/user/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: postForm.title,
          summary: postForm.summary,
          details: postForm.details,
          askAmount: postForm.askAmount,
          askCurrency: postForm.askCurrency,
          expectedRoiPercent: postForm.expectedRoiPercent,
          expectedRoiDurationMonths: postForm.expectedRoiDurationMonths,
          benefits: postForm.benefits,
          tags: postForm.tags ? postForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
          locationName: postForm.locationName,
          locationMapUrl: postForm.locationMapUrl,
          contactEmail: postForm.contactEmail,
          contactPhone: postForm.contactPhone,
          contactUsername: postForm.contactUsername,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to post");

      toast.success("Deal added to the room");
      setPostForm({
        title: "",
        summary: "",
        details: "",
        askAmount: "",
        askCurrency: currency,
        expectedRoiPercent: "",
        expectedRoiDurationMonths: "",
        benefits: "",
        tags: "",
        locationName: "",
        locationMapUrl: "",
        contactEmail: "",
        contactPhone: "",
        contactUsername: "",
        images: [],
      });
      if (uploadRef.current) uploadRef.current.value = "";
      clearDraft();
      setPostOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to post opportunity");
    } finally {
      setPosting(false);
    }
  }

  async function loadSavedSearches() {
    try {
      const res = await fetch("/api/user/saved-searches", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      setSavedSearches(data.savedSearches ?? []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSuggested() {
    try {
      const res = await fetch("/api/user/suggested-follows", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      setSuggested(data.users ?? []);
    } catch (e) {
      console.error(e);
    }
  }

  async function saveCurrentSearch() {
    const name = window.prompt("Name this search");
    if (!name || !name.trim()) return;
    setSavingSearch(true);
    try {
      const filters = {
        query: query.trim(),
        dealCategory: dealCategory.trim(),
        riskLevel,
        statusFilter,
        minReturn: minReturn.trim(),
        horizon: horizon.trim(),
        sort,
      };
      const res = await fetch("/api/user/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), filters }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to save search");
      toast.success("Search saved");
      await loadSavedSearches();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save search");
    } finally {
      setSavingSearch(false);
    }
  }

  function applySavedSearch(saved: any) {
    const f = saved?.filters ?? {};
    setQuery(typeof f.query === "string" ? f.query : "");
    setDealCategory(typeof f.dealCategory === "string" ? f.dealCategory : "");
    setRiskLevel(typeof f.riskLevel === "string" ? f.riskLevel : "All");
    setStatusFilter(typeof f.statusFilter === "string" ? f.statusFilter : "All");
    setMinReturn(typeof f.minReturn === "string" ? f.minReturn : "");
    setHorizon(typeof f.horizon === "string" ? f.horizon : "");
    setSort((f.sort as SortValue) ?? "NEWEST");
  }

  async function deleteSavedSearch(id: string) {
    try {
      const res = await fetch(`/api/user/saved-searches/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove saved search");
    }
  }

  async function followSuggested(targetId: string) {
    setFollowingId(targetId);
    try {
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: targetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to follow");
      setSuggested((prev) => prev.filter((u) => u.id !== targetId));
      toast.success(data.followRequestStatus === "PENDING" ? "Follow request sent" : "Following");
    } catch (e) {
      console.error(e);
      toast.error("Failed to follow member");
    } finally {
      setFollowingId(null);
    }
  }

  useEffect(() => {
    markNavSeen(NAV_BADGE_KEYS.opportunities);
    loadSavedSearches();
    loadSuggested();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      load();
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, dealCategory, riskLevel, statusFilter, minReturn, horizon, sort]);

  useEffect(() => {
    const stored = localStorage.getItem(draftKey);
    if (!stored) return;
    try {
      const draft = JSON.parse(stored);
      setPostForm((prev) => ({
        ...prev,
        ...draft,
        images: [],
      }));
      setHasDraft(true);
    } catch (e) {
      console.error("Failed to load draft", e);
    }
  }, [draftKey]);

  function saveDraft() {
    const draft = { ...postForm, images: [] };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setHasDraft(true);
    toast.success("Draft saved");
  }

  function clearDraft() {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = exclude
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    let list = opps;

    if (tab !== "ALL") {
      list = list.filter((o: any) => (o.action?.state ?? "NONE") === tab);
    }

    if (myPostsOnly && viewerId) {
      list = list.filter((o: any) => o.createdByUserId === viewerId);
    }

    if (q) {
      list = list.filter((o: any) => {
        const hay = `${o.title ?? ""} ${o.summary ?? ""} ${o.details ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const effectiveTag = customTagFilter.trim() || tagFilter;
    if (effectiveTag && effectiveTag !== "All") {
      list = list.filter((o: any) => (o.tags ?? []).includes(effectiveTag));
    }

    if (countryFilter !== "All") {
      list = list.filter((o: any) => (o.countries ?? []).includes(countryFilter));
    }

    if (sectorFilter !== "All") {
      list = list.filter((o: any) => (o.sectors ?? []).includes(sectorFilter));
    }

    if (industryFilter !== "All") {
      list = list.filter((o: any) => (o.industries ?? []).includes(industryFilter));
    }

    if (maxAsk.trim() !== "") {
      const max = Number(maxAsk);
      if (Number.isFinite(max)) {
        list = list.filter((o: any) => {
          const amount = Number(o.askAmount ?? 0);
          const fromCurrency = o.askCurrency ?? "USD";
          const converted = convert(amount, fromCurrency, currency);
          return converted <= max;
        });
      }
    }

    if (benefitFilter.trim() !== "") {
      const term = benefitFilter.toLowerCase();
      list = list.filter((o: any) => String(o.benefits ?? "").toLowerCase().includes(term));
    }

    if (excluded.length) {
      list = list.filter((o: any) => {
        const hay = `${o.title ?? ""} ${o.summary ?? ""}`.toLowerCase();
        return !excluded.some((term) => term.length >= 2 && hay.includes(term));
      });
    }

    list = [...list].sort((a, b) => {
      if (sort === "NEWEST") return toDateValue(b) - toDateValue(a);
      if (sort === "OLDEST") return toDateValue(a) - toDateValue(b);
      if (sort === "PRICE_LOW") {
        const aAmount = Number(a.askAmount ?? Number.MAX_SAFE_INTEGER);
        const bAmount = Number(b.askAmount ?? Number.MAX_SAFE_INTEGER);
        return aAmount - bAmount;
      }
      if (sort === "PRICE_HIGH") {
        const aAmount = Number(a.askAmount ?? 0);
        const bAmount = Number(b.askAmount ?? 0);
        return bAmount - aAmount;
      }
      // Server-handled sorts (TRENDING, CLOSING_SOON, MOST_SAVED, HIGHEST_INTEREST) keep server order
      return 0;
    });

    return list;
  }, [
    opps,
    query,
    exclude,
    tab,
    sort,
    myPostsOnly,
    viewerId,
    tagFilter,
    customTagFilter,
    countryFilter,
    sectorFilter,
    industryFilter,
    maxAsk,
    benefitFilter,
  ]);

  const kpis = useMemo(() => {
    const total = opps.length;
    const saved = opps.filter((o: any) => o.action?.state === "SAVED").length;
    const interested = opps.filter((o: any) => o.action?.state === "VERY_INTERESTED").length;

    const last = opps.map((o: any) => toDateValue(o)).reduce((m: number, v: number) => Math.max(m, v), 0);

    return {
      total,
      saved,
      interested,
      lastUpdated: last ? new Date(last).toLocaleString() : "—",
    };
  }, [opps]);

  const insights = useMemo(() => {
    const topicCount = new Map<string, number>();
    const sourceCount = new Map<string, number>();

    for (const o of opps) {
      const src = (o.source ?? "Unknown") as string;
      sourceCount.set(src, (sourceCount.get(src) ?? 0) + 1);

      const words = tokenizeTitle(o.title ?? "");
      for (const w of words.slice(0, 10)) {
        topicCount.set(w, (topicCount.get(w) ?? 0) + 1);
      }
    }

    const topTopics = [...topicCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topSources = [...sourceCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    return { topTopics, topSources };
  }, [opps]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">The Deal Room</h1>
          <p className="text-sm text-muted-foreground">Member-sourced opportunities, curated and open for diligence.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={postOpen} onOpenChange={setPostOpen}>
            <DialogTrigger asChild>
              <Button>Bring a deal</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bring a deal to the room</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Input
                    placeholder="Title"
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Input
                    placeholder="Short summary"
                    value={postForm.summary}
                    onChange={(e) => setPostForm({ ...postForm, summary: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Textarea
                    placeholder="Details / explanation"
                    value={postForm.details}
                    onChange={(e) => setPostForm({ ...postForm, details: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Ask amount"
                    value={postForm.askAmount}
                    onChange={(e) => setPostForm({ ...postForm, askAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Select
                    value={postForm.askCurrency}
                    onValueChange={(value) => setPostForm({ ...postForm, askCurrency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Expected ROI (%)"
                    value={postForm.expectedRoiPercent}
                    onChange={(e) => setPostForm({ ...postForm, expectedRoiPercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="ROI duration (months)"
                    value={postForm.expectedRoiDurationMonths}
                    onChange={(e) => setPostForm({ ...postForm, expectedRoiDurationMonths: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Textarea
                    placeholder="Benefits"
                    value={postForm.benefits}
                    onChange={(e) => setPostForm({ ...postForm, benefits: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Input
                    placeholder="Tags (comma-separated)"
                    value={postForm.tags}
                    onChange={(e) => setPostForm({ ...postForm, tags: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Location"
                    value={postForm.locationName}
                    onChange={(e) => setPostForm({ ...postForm, locationName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Map link (optional)"
                    value={postForm.locationMapUrl}
                    onChange={(e) => setPostForm({ ...postForm, locationMapUrl: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Contact email"
                    value={postForm.contactEmail}
                    onChange={(e) => setPostForm({ ...postForm, contactEmail: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Contact phone"
                    value={postForm.contactPhone}
                    onChange={(e) => setPostForm({ ...postForm, contactPhone: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Input
                    placeholder="Contact username"
                    value={postForm.contactUsername}
                    onChange={(e) => setPostForm({ ...postForm, contactUsername: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Input
                    ref={uploadRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setPostForm({ ...postForm, images: Array.from(e.target.files ?? []) })}
                  />
                  {postForm.images.length > 0 && (
                    <div className="text-xs text-muted-foreground">{postForm.images.length} image(s) selected</div>
                  )}
                  {hasDraft && postForm.title.trim() === "" && (
                    <div className="text-xs text-muted-foreground">Draft loaded.</div>
                  )}
                </div>
              </div>
              <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={saveDraft}>
                  Save draft
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPostOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={submitPost} disabled={posting}>
                    {posting ? "Publishing..." : "Publish to the room"}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={load} disabled={loading} className="hidden md:inline-flex">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open filters">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Exclude keywords (comma-separated)"
                  value={exclude}
                  onChange={(e) => setExclude(e.target.value)}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {tagOptions.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Custom tag"
                    value={customTagFilter}
                    onChange={(e) => setCustomTagFilter(e.target.value)}
                  />

                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      {COUNTRIES_ALL.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sectorFilter} onValueChange={setSectorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      {SECTORS.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={industryFilter} onValueChange={setIndustryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder={`Max ask (${currency})`}
                    value={maxAsk}
                    onChange={(e) => setMaxAsk(e.target.value)}
                  />
                  <Input
                    placeholder="Benefit keyword"
                    value={benefitFilter}
                    onChange={(e) => setBenefitFilter(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={myPostsOnly} onCheckedChange={(val) => setMyPostsOnly(Boolean(val))} />
                    See my posts only
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={tab === "ALL" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTab("ALL")}
                    >
                      All
                    </Button>
                    <Button
                      variant={tab === "SAVED" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTab("SAVED")}
                    >
                      Saved
                    </Button>
                    <Button
                      variant={tab === "VERY_INTERESTED" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTab("VERY_INTERESTED")}
                    >
                      Interested
                    </Button>
                  </div>
                  <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEWEST">Newest</SelectItem>
                      <SelectItem value="OLDEST">Oldest</SelectItem>
                      <SelectItem value="PRICE_LOW">Price: Low to high</SelectItem>
                      <SelectItem value="PRICE_HIGH">Price: High to low</SelectItem>
                      <SelectItem value="TRENDING">Trending</SelectItem>
                      <SelectItem value="CLOSING_SOON">Closing soon</SelectItem>
                      <SelectItem value="MOST_SAVED">Most saved</SelectItem>
                      <SelectItem value="HIGHEST_INTEREST">Most interest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFiltersOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI toggle */}
      <div className="hidden items-center justify-between md:flex">
        <div className="text-sm text-muted-foreground">Stats</div>
        <Button variant="ghost" size="sm" onClick={() => setShowStats((prev) => !prev)}>
          {showStats ? "Hide stats" : "Show stats"}
        </Button>
      </div>

      {showStats && (
        <div className="hidden gap-4 md:grid md:grid-cols-3">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Matched</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-2xl font-semibold">{kpis.total}</CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Saved</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-2xl font-semibold">{kpis.saved}</CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Interested</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-2xl font-semibold">{kpis.interested}</CardContent>
          </Card>

        </div>
      )}

      {/* Controls + Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2 md:gap-3">
                <div className="relative w-full md:w-[320px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search titles & summaries..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setFiltersOpen(true)}
                  aria-label="Open filters"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <Input
                className="hidden md:block"
                placeholder="Exclude keywords (comma-separated)"
                value={exclude}
                onChange={(e) => setExclude(e.target.value)}
              />
            </div>

            <div className="hidden flex-wrap gap-2 md:flex">
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  {tagOptions.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                className="w-[160px]"
                placeholder="Custom tag"
                value={customTagFilter}
                onChange={(e) => setCustomTagFilter(e.target.value)}
              />

              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {COUNTRIES_ALL.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  {industryOptions.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input className="w-[140px]" type="number" placeholder={`Max ask (${currency})`} value={maxAsk} onChange={(e) => setMaxAsk(e.target.value)} />
              <Input className="w-[180px]" placeholder="Benefit keyword" value={benefitFilter} onChange={(e) => setBenefitFilter(e.target.value)} />
            </div>

            <div className="hidden flex-wrap gap-2 md:flex">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={myPostsOnly} onCheckedChange={(val) => setMyPostsOnly(Boolean(val))} />
                See my posts only
              </label>
              <Button variant={tab === "ALL" ? "default" : "outline"} size="sm" onClick={() => setTab("ALL")}>
                All
              </Button>
              <Button variant={tab === "SAVED" ? "default" : "outline"} size="sm" onClick={() => setTab("SAVED")}>
                Saved
              </Button>
              <Button
                variant={tab === "VERY_INTERESTED" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("VERY_INTERESTED")}
              >
                Interested
              </Button>

              <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEWEST">Newest</SelectItem>
                  <SelectItem value="OLDEST">Oldest</SelectItem>
                      <SelectItem value="PRICE_LOW">Price: Low to high</SelectItem>
                      <SelectItem value="PRICE_HIGH">Price: High to low</SelectItem>
                  <SelectItem value="TRENDING">Trending</SelectItem>
                  <SelectItem value="CLOSING_SOON">Closing soon</SelectItem>
                  <SelectItem value="MOST_SAVED">Most saved</SelectItem>
                  <SelectItem value="HIGHEST_INTEREST">Most interest</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={saveCurrentSearch} disabled={savingSearch}>
                {savingSearch ? "Saving..." : "Save this search"}
              </Button>
            </div>

            {savedSearches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Saved:</span>
                {savedSearches.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm"
                  >
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => applySavedSearch(s)}
                    >
                      {s.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${s.name}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => deleteSavedSearch(s.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[55%]" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[85%]" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((opp: any) => (
                  <OpportunityCard key={opp.id} opp={opp} onActionUpdated={load} />
                ))}
              </div>

              {filtered.length === 0 && (
                <Card>
                  <CardContent className="space-y-2 py-10 text-center">
                    <div className="text-lg font-semibold">Nothing matches your criteria</div>
                    <div className="text-muted-foreground">Sharpen your investing focus and we'll surface deals that fit your mandate.</div>
                    <div className="pt-2">
                      <Button asChild>
                        <a href="/interests">Set your focus</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Insights sidebar */}
        <div className="hidden space-y-4 lg:block">
          {suggested.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Suggested members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggested.slice(0, 6).map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <Link href={`/users/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.profile?.imageUrl ?? undefined} />
                        <AvatarFallback>
                          {(u.profile?.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{u.profile?.name ?? u.email}</div>
                        {u.profile?.username && (
                          <div className="truncate text-xs text-muted-foreground">@{u.profile.username}</div>
                        )}
                      </div>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => followSuggested(u.id)}
                      disabled={followingId === u.id}
                    >
                      {followingId === u.id ? "..." : "Follow"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Last updated</div>
                <div className="text-sm text-muted-foreground">{kpis.lastUpdated}</div>
              </div>

              <div>
                <div className="text-sm font-medium">Top topics</div>
                <div className="mt-2 space-y-1">
                  {insights.topTopics.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data yet</div>
                  ) : (
                    insights.topTopics.map(([w, n]) => (
                      <div key={w} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{w}</span>
                        <span className="font-medium">{n}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Sources</div>
                <div className="mt-2 space-y-1">
                  {insights.topSources.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data yet</div>
                  ) : (
                    insights.topSources.map(([s, n]) => (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span className="line-clamp-1 text-muted-foreground">{s}</span>
                        <span className="font-medium">{n}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Make it smarter next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>• Add a signal score (source quality + novelty + fit).</div>
              <div>• Add charts (weekly volume, saved vs invested).</div>
              <div>• Add alerts when saved items get follow-up news.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
