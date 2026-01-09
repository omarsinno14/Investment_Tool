"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const [form, setForm] = useState<any>({
    name: "",
    username: "",
    phone: "",
    imageUrl: "",
    age: "",
    bio: "",
    occupation: "",
    currency: "USD",
    familySituation: "",
    netWorth: "",
    riskTolerance: "MEDIUM",
    investAmount: "",
    emailVerified: false,
    phoneVerified: false,
    hideAgeFromNonFollowers: false,
    hideContactFromNonFollowers: false,
    hidePhotoFromNonFollowers: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
            age: p.age ?? "",
            bio: p.bio ?? "",
            occupation: p.occupation ?? "",
            currency: p.currency ?? "USD",
            familySituation: p.familySituation ?? "",
            netWorth: p.netWorth ?? "",
            riskTolerance: p.riskTolerance ?? "MEDIUM",
            investAmount: p.investAmount ?? "",
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
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name || undefined,
          username: form.username || undefined,
          phone: form.phone || undefined,
          age: form.age === "" ? undefined : Number(form.age),
          familySituation: form.familySituation || undefined,
          netWorth: form.netWorth === "" ? undefined : Number(form.netWorth),
          riskTolerance: form.riskTolerance,
          investAmount: form.investAmount === "" ? undefined : Number(form.investAmount),
          emailVerified: form.emailVerified,
          phoneVerified: form.phoneVerified,
          hideAgeFromNonFollowers: form.hideAgeFromNonFollowers,
          hideContactFromNonFollowers: form.hideContactFromNonFollowers,
          hidePhotoFromNonFollowers: form.hidePhotoFromNonFollowers,
        }),
      });

      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      const body = isJson ? await res.json().catch(() => ({})) : {};

      if (!res.ok) {
        throw new Error(body?.error ?? "Save failed");
      }

      if (!isJson) {
        const txt = await res.text();
        throw new Error(`Unexpected response (${ct}): ${txt.slice(0, 120)}`);
      }

      toast.success("Settings saved");
    } catch (e) {
      console.error(e);
      toast.error("Unable to save settings");
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
      if (!res.ok) {
        throw new Error(data?.error ?? "Upload failed");
      }
      setForm((prev: any) => ({ ...prev, imageUrl: data.imageUrl ?? "" }));
      toast.success("Profile photo updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Your profile preferences for recommendations.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/70"
              title="Upload profile photo"
            >
              <Avatar className="h-24 w-24">
                <AvatarImage src={form.imageUrl || undefined} alt="Profile preview" />
                <AvatarFallback>{String(form.name || "IN").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div className="text-sm text-muted-foreground">
              Click your photo to upload a JPG, PNG, or other image.
            </div>
            {uploading && <div className="text-xs text-muted-foreground">Uploading photo...</div>}
          </div>

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
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <div className="text-sm text-muted-foreground">
                Click your avatar to upload a JPG, PNG, or other image.
              </div>
            </div>
            {uploading && <div className="text-xs text-muted-foreground">Uploading photo...</div>}
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

          <div className="space-y-2">
            <Label>Family situation</Label>
            <Input value={form.familySituation} onChange={(e) => setForm({ ...form, familySituation: e.target.value })} />
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
                max={riskOptions.length - 1}
                value={riskIndex}
                onChange={(e) =>
                  setForm({ ...form, riskTolerance: riskOptions[Number(e.target.value)] })
                }
                className="w-full"
              />
              <div className="text-sm text-muted-foreground">
                {riskLabels[form.riskTolerance as keyof typeof riskLabels]}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amount you’re looking to invest</Label>
            <Input value={form.investAmount} onChange={(e) => setForm({ ...form, investAmount: e.target.value })} type="number" />
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
