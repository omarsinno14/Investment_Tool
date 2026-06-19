

import { useState } from "react";
import { useLocation } from "wouter";

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/app/SiteFooter";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error ?? "Invalid credentials");
      return;
    }
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white text-lg font-semibold">
              I
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Vertica</h1>
              <p className="text-sm text-muted-foreground">Welcome back. Sign in to continue.</p>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Log in</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
                </div>
                {err && <p className="text-sm text-red-600">{err}</p>}
                <Button className="w-full" disabled={loading}>
                  {loading ? "Loading..." : "Log in"}
                </Button>
              </form>

              <p className="mt-4 text-sm text-muted-foreground">
                No account?{" "}
                <Link className="underline" href="/register">
                  Create one
                </Link>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Need admin access? <Link className="underline" href="/admin/login">Admin account</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
