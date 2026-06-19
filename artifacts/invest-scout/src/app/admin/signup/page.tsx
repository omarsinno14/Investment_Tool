

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mx-auto mt-12 max-w-md">
      <Card>
        <CardHeader><CardTitle>Request Vertica Admin Account</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <Label>Username</Label><Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
            <Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            <Label>Confirm password</Label><Input type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} required />
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            {msg ? <p className="text-sm text-green-600">{msg}</p> : null}
            <Button className="w-full">Submit request</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
