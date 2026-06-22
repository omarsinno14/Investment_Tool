

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSignupPage() {
  const [form, setForm] = useState({ email: "", username: "", password: "", confirmPassword: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/signup-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data?.error ?? "Failed");
    setMsg("Request submitted. A super admin must approve before admin login.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-background font-serif text-xl shadow-md">
            V
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Application</h1>
        </div>
        
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Request Access</CardTitle>
            <CardDescription>Apply for administrative privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Username</Label>
                <Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Confirm Password</Label>
                <Input type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} required className="h-10" />
              </div>
              
              {err ? <p className="text-sm text-destructive font-medium">{err}</p> : null}
              {msg ? <p className="text-sm text-primary font-medium p-3 bg-primary/10 rounded-md border border-primary/20">{msg}</p> : null}
              
              <Button className="w-full mt-2">Submit Request</Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                <Link className="font-medium text-foreground underline underline-offset-4 hover:text-accent transition-colors" href="/admin/login">Return to Admin Login</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
