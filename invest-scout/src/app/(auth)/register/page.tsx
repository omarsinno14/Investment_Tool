"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/app/SiteFooter";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    if (password.length < 8) {
      setErr("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      const data = isJson ? await res.json().catch(() => ({})) : {};
      const fallback = isJson ? data?.error : await res.text().catch(() => "");
      setErr(fallback || "Registration failed");
      setLoading(false);
      return;
    }

    // auto-login
    const loginRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    if (loginRes?.error) {
      setErr(loginRes.error === "CredentialsSignin" ? "Unable to log in" : "Login failed");
      setLoading(false);
      return;
    }
    router.push(loginRes?.url ?? "/dashboard");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Create account</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                </div>
                <div className="space-y-2">
                  <Label>Password (min 8 chars)</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
                </div>
                {err && <p className="text-sm text-red-600">{err}</p>}
                <Button className="w-full" disabled={loading}>
                  {loading ? "Loading..." : "Create account"}
                </Button>
              </form>

              <p className="mt-4 text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link className="underline" href="/login">
                  Log in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
