

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/app/SiteFooter";

const PASSWORD_HINT = "Min 8 chars, at least 1 uppercase letter, 1 number, and 1 symbol.";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    username: "",
    dob: "",
    password: "",
    confirmPassword: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }, [form.password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setSuccess(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data?.error || "Registration failed");
      setLoading(false);
      return;
    }

    setSuccess("Account created. Check your email to confirm your account before first login.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Create your Vertica account</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2"><Label>First name</Label><Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>Last name</Label><Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required /></div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} type="email" required /></div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="letters, numbers, . and _" required /></div>
                  <div className="space-y-2"><Label>Date of birth (18+)</Label><Input value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} type="date" required /></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} type="password" required /></div>
                  <div className="space-y-2"><Label>Confirm password</Label><Input value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} type="password" required /></div>
                </div>
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT} Strength: {passwordStrength}/4</p>
                {err && <p className="text-sm text-red-600">{err}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}
                <Button className="w-full" disabled={loading}>{loading ? "Loading..." : "Create account"}</Button>
              </form>

              <p className="mt-4 text-sm text-muted-foreground">
                Already have an account? <Link className="underline" href="/login">Log in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
