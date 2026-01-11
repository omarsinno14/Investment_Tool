"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [form, setForm] = useState<any>({
    name: "",
    username: "",
    phone: "",
    imageUrl: "",
    cvUrl: "",
    age: "",
    bio: "",
    occupation: "",
    currency: "USD",
    familySituation: "",
    netWorth: "",
    riskTolerance: "MEDIUM" as RiskValue,
    investAmount: "",
    layoutPreference: "TOP",
    emailVerified: false,
    phoneVerified: false,
    hideAgeFromNonFollowers: false,
    hideContactFromNonFollowers: false,
    hidePhotoFromNonFollowers: false,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
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
            cvUrl: p.cvUrl ?? "",
            age: p.age ?? "",
            bio: p.bio ?? "",
            occupation: p.occupation ?? "",
            currency: p.currency ?? "USD",
            familySituation: p.familySituation ?? "",
            netWorth: p.netWorth ?? "",
            riskTolerance: p.riskTolerance ?? "MEDIUM",
            investAmount: p.investAmount ?? "",
            layoutPreference: p.layoutPreference ?? "TOP",
            emailVerified: Boolean(p.emailVerified),
            phoneVerified: Boolean(p.phoneVerified),
            hideAgeFromNonFollowers: Boolean(p.hideAgeFromNonFollowers),
            hideContactFromNonFollowers: Boolean(p.hideContactFromNonFollowers),
            hidePhotoFromNonFollowers: Boolean(p.hidePhotoFromNonFollowers),
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
        hideAgeFromNonFollowers: form.hideAgeFromNonFollowers,
        hideContactFromNonFollowers: form.hideContactFromNonFollowers,
        hidePhotoFromNonFollowers: form.hidePhotoFromNonFollowers,
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
            <Label>Layout preference</Label>
            <Select
              value={form.layoutPreference}
              onValueChange={(value) => setForm({ ...form, layoutPreference: value })}
            >
              <SelectTrigger className="w-full md:w-[260px]">
                <SelectValue placeholder="Choose layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOP">Top navigation (current)</SelectItem>
                <SelectItem value="SIDEBAR">Left sidebar navigation</SelectItem>
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
            </div>
          </div>

          <div className="md:col-span-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
