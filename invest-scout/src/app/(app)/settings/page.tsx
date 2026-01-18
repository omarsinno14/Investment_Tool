"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { SUPPORTED_CURRENCIES, useCurrency } from "@/components/app/CurrencyProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Risk3 = "LOW" | "MEDIUM" | "HIGH";
type Risk5 = "VERY_CONSERVATIVE" | "CONSERVATIVE" | "BALANCED" | "GROWTH" | "AGGRESSIVE";
type RiskValue = Risk3 | Risk5 | string;

const RISK_SCALE_3: { value: Risk3; label: string; hint: string }[] = [
  { value: "LOW", label: "Conservative", hint: "Prioritize stability, lower volatility." },
  { value: "MEDIUM", label: "Balanced", hint: "Mix of stability + growth." },
  { value: "HIGH", label: "Aggressive", hint: "Higher risk for higher return potential." },
];

const RISK_SCALE_5: { value: Risk5; label: string; hint: string }[] = [
  { value: "VERY_CONSERVATIVE", label: "Very Conservative", hint: "Capital preservation first." },
  { value: "CONSERVATIVE", label: "Conservative", hint: "Lower volatility focus." },
  { value: "BALANCED", label: "Balanced", hint: "Moderate risk and return." },
  { value: "GROWTH", label: "Growth", hint: "Higher equity / higher volatility." },
  { value: "AGGRESSIVE", label: "Aggressive", hint: "Max growth, highest volatility." },
];

function isRisk3(v: any): v is Risk3 {
  return v === "LOW" || v === "MEDIUM" || v === "HIGH";
}
function isRisk5(v: any): v is Risk5 {
  return (
    v === "VERY_CONSERVATIVE" ||
    v === "CONSERVATIVE" ||
    v === "BALANCED" ||
    v === "GROWTH" ||
    v === "AGGRESSIVE"
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { setCurrency } = useCurrency();
  const [form, setForm] = useState<any>({
    name: "",
    username: "",
    phone: "",
    imageUrl: "",
    coverPhotoUrl: "",
    websiteUrl: "",
    cvUrl: "",
    age: "",
    bio: "",
    occupation: "",
    currency: "USD",
    familySituation: "",
    netWorth: "",
    riskTolerance: "MEDIUM" as RiskValue,
    investAmount: "",
    layoutPreference: "SIDEBAR",
    emailVerified: false,
    phoneVerified: false,
    identityVerified: false,
    expertiseTags: "",
    verifiedExpertiseTags: "",
    hideAgeFromNonFollowers: false,
    hideContactFromNonFollowers: false,
    hidePhotoFromNonFollowers: false,
    hidePostsFromNonFollowers: false,
    hideFollowerCount: false,
    requiresFollowApproval: false,
    notifyMessages: true,
    notifyFollows: true,
    notifyOpportunities: true,
    notifyForums: true,
    notifyJournal: true,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);
  const cvRef = useRef<HTMLInputElement | null>(null);

  // Choose which risk scale to use based on what the backend returns
  const riskScale = useMemo(() => {
    const v = form.riskTolerance;
    if (isRisk5(v)) return RISK_SCALE_5;
    if (isRisk3(v)) return RISK_SCALE_3;

    // If unknown, default to 3-level because your app previously used "MEDIUM"
    return RISK_SCALE_3;
  }, [form.riskTolerance]);

  const riskIndex = useMemo(() => {
    const idx = riskScale.findIndex((x) => x.value === form.riskTolerance);
    return idx >= 0 ? idx : Math.min(1, riskScale.length - 1); // default to "Balanced"/middle-ish
  }, [riskScale, form.riskTolerance]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        const ct = res.headers.get("content-type") ?? "";
        const isJson = ct.includes("application/json");
        const data = isJson ? await res.json().catch(() => ({})) : {};

        if (res.ok && isJson) {
          const p = data.profile ?? {};
          setForm({
            name: p.name ?? "",
            username: p.username ?? "",
            phone: p.phone ?? "",
            imageUrl: p.imageUrl ?? "",
            coverPhotoUrl: p.coverPhotoUrl ?? "",
            websiteUrl: p.websiteUrl ?? "",
            cvUrl: p.cvUrl ?? "",
            age: p.age ?? "",
            bio: p.bio ?? "",
            occupation: p.occupation ?? "",
            currency: p.currency ?? "USD",
            familySituation: p.familySituation ?? "",
            netWorth: p.netWorth ?? "",
            riskTolerance: p.riskTolerance ?? "MEDIUM",
            investAmount: p.investAmount ?? "",
            layoutPreference: p.layoutPreference ?? "SIDEBAR",
            emailVerified: Boolean(p.emailVerified),
            phoneVerified: Boolean(p.phoneVerified),
            identityVerified: Boolean(p.identityVerified),
            expertiseTags: (p.expertiseTags ?? []).join(", "),
            verifiedExpertiseTags: (p.verifiedExpertiseTags ?? []).join(", "),
            hideAgeFromNonFollowers: Boolean(p.hideAgeFromNonFollowers),
            hideContactFromNonFollowers: Boolean(p.hideContactFromNonFollowers),
            hidePhotoFromNonFollowers: Boolean(p.hidePhotoFromNonFollowers),
            hidePostsFromNonFollowers: Boolean(p.hidePostsFromNonFollowers),
            hideFollowerCount: Boolean(p.hideFollowerCount),
            requiresFollowApproval: Boolean(p.requiresFollowApproval),
            notifyMessages: p.notifyMessages !== undefined ? Boolean(p.notifyMessages) : true,
            notifyFollows: p.notifyFollows !== undefined ? Boolean(p.notifyFollows) : true,
            notifyOpportunities: p.notifyOpportunities !== undefined ? Boolean(p.notifyOpportunities) : true,
            notifyForums: p.notifyForums !== undefined ? Boolean(p.notifyForums) : true,
            notifyJournal: p.notifyJournal !== undefined ? Boolean(p.notifyJournal) : true,
          });
        } else {
          const message = isJson ? data?.error || "Failed to load profile" : "Failed to load profile";
          throw new Error(message);
        }
      } catch (e) {
        console.error(e);
        toast.error("Unable to load settings");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingBlocks(true);
      try {
        const res = await fetch("/api/user/blocks", { credentials: "include" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to load blocked users");
        setBlockedUsers(data.blocks ?? []);
      } catch (e) {
        console.error(e);
        toast.error("Unable to load blocked users");
      } finally {
        setLoadingBlocks(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: form.name || undefined,
        username: form.username || undefined,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        occupation: form.occupation || undefined,
        currency: form.currency || undefined,
        age: form.age === "" ? undefined : Number(form.age),
        familySituation: form.familySituation || undefined,
        netWorth: form.netWorth === "" ? undefined : Number(form.netWorth),
        riskTolerance: form.riskTolerance, // ✅ canonical value, not label
        investAmount: form.investAmount === "" ? undefined : Number(form.investAmount),
        layoutPreference: form.layoutPreference || undefined,
        emailVerified: form.emailVerified,
        phoneVerified: form.phoneVerified,
        identityVerified: form.identityVerified,
        expertiseTags: String(form.expertiseTags || "")
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean),
        verifiedExpertiseTags: String(form.verifiedExpertiseTags || "")
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean),
        websiteUrl: form.websiteUrl || undefined,
        hideAgeFromNonFollowers: form.hideAgeFromNonFollowers,
        hideContactFromNonFollowers: form.hideContactFromNonFollowers,
        hidePhotoFromNonFollowers: form.hidePhotoFromNonFollowers,
        hidePostsFromNonFollowers: form.hidePostsFromNonFollowers,
        hideFollowerCount: form.hideFollowerCount,
        requiresFollowApproval: form.requiresFollowApproval,
        notifyMessages: form.notifyMessages,
        notifyFollows: form.notifyFollows,
        notifyOpportunities: form.notifyOpportunities,
        notifyForums: form.notifyForums,
        notifyJournal: form.notifyJournal,
      };

      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      const body = isJson ? await res.json().catch(() => ({})) : {};

      if (!res.ok) {
        // ✅ show EXACT server error (very important)
        console.error("Save profile failed:", { status: res.status, body, payload });
        throw new Error(body?.error ?? `Save failed (HTTP ${res.status})`);
      }

      if (!isJson) {
        const txt = await res.text();
        throw new Error(`Unexpected response (${ct}): ${txt.slice(0, 160)}`);
      }

      toast.success("Settings saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function unblockUser(userId: string) {
    const previous = blockedUsers;
    setBlockedUsers((prev) => prev.filter((item) => item.blocked?.id !== userId && item.id !== userId));
    try {
      const res = await fetch("/api/user/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to unblock");
      toast.success("User unblocked");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Unable to unblock");
      setBlockedUsers(previous);
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/profile/photo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Upload failed (HTTP ${res.status})`);

      setForm((prev: any) => ({ ...prev, imageUrl: data.imageUrl ?? "" }));
      toast.success("Profile photo updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCv(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/profile/cv", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Upload failed (HTTP ${res.status})`);

      setForm((prev: any) => ({ ...prev, cvUrl: data.cvUrl ?? "" }));
      toast.success("CV updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to upload CV");
    } finally {
      setUploadingCv(false);
      if (cvRef.current) cvRef.current.value = "";
    }
  }

  async function handleCoverPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/profile/cover-photo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Upload failed (HTTP ${res.status})`);

      setForm((prev: any) => ({ ...prev, coverPhotoUrl: data.coverPhotoUrl ?? "" }));
      toast.success("Cover photo updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to upload cover photo");
    } finally {
      setUploadingCover(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  async function runDataAction(action: string) {
    try {
      const res = await fetch("/api/user/data-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to clear data");
      toast.success("Action completed");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to clear data");
    }
  }

  function clearCache() {
    if (typeof window === "undefined") return;
    window.localStorage.clear();
    toast.success("Cache cleared");
  }

  async function deactivateAccount() {
    if (!window.confirm("Deactivate your account? You can reactivate by logging in.")) return;
    try {
      const res = await fetch("/api/user/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "deactivate" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to deactivate");
      window.location.href = "/login";
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to deactivate");
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete account");
      window.location.href = "/login";
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to delete account");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Your profile preferences for recommendations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/70"
                title="Upload profile photo"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={form.imageUrl || undefined} alt="Profile preview" />
                  <AvatarFallback>{String(form.name || "IN").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </button>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

              <div className="text-sm text-muted-foreground">Click your avatar to upload an image.</div>
            </div>
            {uploading && <div className="text-xs text-muted-foreground">Uploading photo...</div>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Cover photo</Label>
            <div className="flex flex-col gap-3">
              {form.coverPhotoUrl ? (
                <div className="overflow-hidden rounded-lg border bg-muted/30">
                  <img src={form.coverPhotoUrl} alt="Cover preview" className="h-32 w-full object-cover" />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Add a cover photo to highlight your profile.
                </div>
              )}
              <Input ref={coverRef} type="file" accept="image/*" onChange={handleCoverPhotoChange} />
            </div>
            {uploadingCover && <div className="text-xs text-muted-foreground">Uploading cover photo...</div>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Share a short bio..."
              rows={3}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>CV / Resume</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input ref={cvRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCvChange} />
              {form.cvUrl && (
                <a href={form.cvUrl} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
                  View current CV
                </a>
              )}
            </div>
            {uploadingCv && <div className="text-xs text-muted-foreground">Uploading CV...</div>}
          </div>

          <div className="space-y-2">
            <Label>Age</Label>
            <Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} type="number" />
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Phone number</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Website</Label>
            <Input
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://your-site.com"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Layout preference</Label>
            <Select
              value={form.layoutPreference}
              onValueChange={(value) => setForm({ ...form, layoutPreference: value })}
            >
              <SelectTrigger className="w-full md:w-[260px]">
                <SelectValue placeholder="Choose layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOP">Top navigation</SelectItem>
                <SelectItem value="SIDEBAR">Left sidebar navigation (default)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Family situation</Label>
            <Input
              value={form.familySituation}
              onChange={(e) => setForm({ ...form, familySituation: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Net worth (optional)</Label>
            <Input value={form.netWorth} onChange={(e) => setForm({ ...form, netWorth: e.target.value })} type="number" />
          </div>

          <div className="space-y-2">
            <Label>Preferred currency</Label>
            <Select
              value={form.currency}
              onValueChange={(value) => {
                setForm({ ...form, currency: value });
                setCurrency(value);
              }}
            >
              <SelectTrigger className="w-full md:w-[260px]">
                <SelectValue placeholder="Select currency" />
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
            <Label>Theme</Label>
            <Select value={theme ?? "system"} onValueChange={(value) => setTheme(value)}>
              <SelectTrigger className="w-full md:w-[260px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Risk tolerance</Label>
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={riskScale.length - 1}
                value={riskIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  const next = riskScale[idx]?.value ?? riskScale[Math.min(1, riskScale.length - 1)]?.value;
                  setForm({ ...form, riskTolerance: next });
                }}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{riskScale[riskIndex]?.label ?? "Balanced"}</span>
                <span className="ml-2">{riskScale[riskIndex]?.hint ?? ""}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amount you’re looking to invest</Label>
            <Input
              value={form.investAmount}
              onChange={(e) => setForm({ ...form, investAmount: e.target.value })}
              type="number"
            />
          </div>

          <div className="space-y-2">
            <Label>Email verified</Label>
            <input
              type="checkbox"
              checked={form.emailVerified}
              onChange={(e) => setForm({ ...form, emailVerified: e.target.checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Phone verified</Label>
            <input
              type="checkbox"
              checked={form.phoneVerified}
              onChange={(e) => setForm({ ...form, phoneVerified: e.target.checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Identity verified (gold badge)</Label>
            <input
              type="checkbox"
              checked={form.identityVerified}
              onChange={(e) => setForm({ ...form, identityVerified: e.target.checked })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Expertise tags</Label>
            <Input
              value={form.expertiseTags}
              onChange={(e) => setForm({ ...form, expertiseTags: e.target.value })}
              placeholder="e.g. Real Estate, Venture Capital, Crypto"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Verified expertise tags (endorsed)</Label>
            <Input
              value={form.verifiedExpertiseTags}
              onChange={(e) => setForm({ ...form, verifiedExpertiseTags: e.target.value })}
              placeholder="Tags that have been endorsed or verified"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Privacy</Label>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hideAgeFromNonFollowers}
                  onChange={(e) => setForm({ ...form, hideAgeFromNonFollowers: e.target.checked })}
                />
                Hide age from non-followers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hideContactFromNonFollowers}
                  onChange={(e) => setForm({ ...form, hideContactFromNonFollowers: e.target.checked })}
                />
                Hide contact info from non-followers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hidePhotoFromNonFollowers}
                  onChange={(e) => setForm({ ...form, hidePhotoFromNonFollowers: e.target.checked })}
                />
                Hide profile photo from non-followers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hidePostsFromNonFollowers}
                  onChange={(e) => setForm({ ...form, hidePostsFromNonFollowers: e.target.checked })}
                />
                Hide your posts from non-followers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hideFollowerCount}
                  onChange={(e) => setForm({ ...form, hideFollowerCount: e.target.checked })}
                />
                Hide follower count
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requiresFollowApproval}
                  onChange={(e) => setForm({ ...form, requiresFollowApproval: e.target.checked })}
                />
                Require approval for new followers
              </label>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Notifications</Label>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.notifyMessages}
                  onCheckedChange={(checked) => setForm({ ...form, notifyMessages: Boolean(checked) })}
                />
                Messages & direct chats
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.notifyFollows}
                  onCheckedChange={(checked) => setForm({ ...form, notifyFollows: Boolean(checked) })}
                />
                Follows & follow requests
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.notifyOpportunities}
                  onCheckedChange={(checked) => setForm({ ...form, notifyOpportunities: Boolean(checked) })}
                />
                Opportunity matches & boosts
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.notifyForums}
                  onCheckedChange={(checked) => setForm({ ...form, notifyForums: Boolean(checked) })}
                />
                Forum reactions & comments
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.notifyJournal}
                  onCheckedChange={(checked) => setForm({ ...form, notifyJournal: Boolean(checked) })}
                />
                Journal invites & updates
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blocked users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingBlocks && <div className="text-sm text-muted-foreground">Loading blocked users...</div>}
          {!loadingBlocks && blockedUsers.length === 0 && (
            <div className="text-sm text-muted-foreground">You have not blocked anyone.</div>
          )}
          {blockedUsers.map((block) => {
            const user = block.blocked ?? block;
            const name = user?.profile?.username || user?.profile?.name || user?.email || "User";
            return (
              <div key={block.id ?? user?.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profile?.imageUrl || undefined} alt={name} />
                    <AvatarFallback>{String(name).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user?.profile?.username ? `@${user.profile.username}` : user?.email}
                    </div>
                  </div>
                </div>
                {user?.id && (
                  <Button variant="outline" size="sm" onClick={() => unblockUser(user.id)}>
                    Unblock
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => runDataAction("clear_history")}>
              Clear history
            </Button>
            <Button variant="outline" onClick={() => runDataAction("clear_interests")}>
              Clear interests
            </Button>
            <Button variant="outline" onClick={() => runDataAction("clear_saves")}>
              Clear saves
            </Button>
            <Button variant="outline" onClick={clearCache}>
              Clear cache
            </Button>
            <Button variant="outline" onClick={() => runDataAction("clear_data")}>
              Clear data
            </Button>
            <Button variant="outline" onClick={() => runDataAction("clear_financial")}>
              Clear financial data
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={deactivateAccount}>
              Deactivate account
            </Button>
            <Button variant="destructive" onClick={deleteAccount}>
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
