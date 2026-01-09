"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [form, setForm] = useState<any>({
    name: "",
    imageUrl: "",
    age: "",
    familySituation: "",
    netWorth: "",
    riskTolerance: "MEDIUM",
    investAmount: "",
  });
  const [saving, setSaving] = useState(false);
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
            age: p.age ?? "",
            familySituation: p.familySituation ?? "",
            netWorth: p.netWorth ?? "",
            riskTolerance: p.riskTolerance ?? "MEDIUM",
            investAmount: p.investAmount ?? "",
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
          imageUrl: form.imageUrl || undefined,
          age: form.age === "" ? undefined : Number(form.age),
          familySituation: form.familySituation || undefined,
          netWorth: form.netWorth === "" ? undefined : Number(form.netWorth),
          riskTolerance: form.riskTolerance,
          investAmount: form.investAmount === "" ? undefined : Number(form.investAmount),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Your profile preferences for recommendations.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Profile photo URL</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={form.imageUrl || undefined} alt="Profile preview" />
                <AvatarFallback>{String(form.name || "IN").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                Paste a public image URL to update your profile photo.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Age</Label>
            <Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} type="number" />
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
            <Label>Risk tolerance (LOW / MEDIUM / HIGH)</Label>
            <Input value={form.riskTolerance} onChange={(e) => setForm({ ...form, riskTolerance: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Amount you’re looking to invest</Label>
            <Input value={form.investAmount} onChange={(e) => setForm({ ...form, investAmount: e.target.value })} type="number" />
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
