

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/app/SiteFooter";

const PASSWORD_HINT = "Min 8 chars, 1 uppercase, 1 number, 1 symbol.";

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

    setSuccess("Application received. Check your email to confirm your identity.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <div className="flex flex-1 items-center justify-center p-4 py-12">
        <div className="w-full max-w-[500px] space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-foreground text-background text-2xl font-serif tracking-tight shadow-md">
              V
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Apply for Access</h1>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                Vertica Membership
              </p>
            </div>
          </div>

          <Card className="border-border/60 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-medium tracking-tight">Applicant Details</CardTitle>
              <CardDescription>Submit your information to be considered for membership.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">First Name</Label>
                    <Input className="h-11" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Last Name</Label>
                    <Input className="h-11" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Email Address</Label>
                  <Input className="h-11" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} type="email" required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Username</Label>
                    <Input className="h-11" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="letters, numbers, ._" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Date of Birth</Label>
                    <Input className="h-11" value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} type="date" required />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Password</Label>
                    <Input className="h-11" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} type="password" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Confirm Password</Label>
                    <Input className="h-11" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} type="password" required />
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{PASSWORD_HINT}</span>
                  <span className="font-medium text-foreground bg-secondary px-2 py-0.5 rounded-sm">Strength: {passwordStrength}/4</span>
                </div>
                
                {err && <p className="text-sm text-destructive font-medium">{err}</p>}
                {success && <p className="text-sm text-primary font-medium p-3 bg-primary/10 rounded-md border border-primary/20">{success}</p>}
                
                <Button className="w-full h-11 text-base shadow-md mt-2" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </form>

              <div className="mt-8 flex justify-center text-sm">
                <p className="text-muted-foreground">
                  Already a member?{" "}
                  <Link className="font-medium text-foreground hover:text-accent transition-colors underline underline-offset-4" href="/login">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
