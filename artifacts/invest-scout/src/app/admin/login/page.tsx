

import { useState } from "react";
import { useLocation } from "wouter";

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [, navigate] = useLocation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, requestedRole: "ADMIN" }),
    });
    if (!res.ok) {
      setErr("Admin account required or credentials invalid.");
      return;
    }
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <Card>
        <CardHeader><CardTitle>Vertica Admin Login</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <Button className="w-full">Login as Admin</Button>
          </form>
          <p className="mt-3 text-sm">Need approval? <Link className="underline" href="/admin/signup">Request admin account</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
