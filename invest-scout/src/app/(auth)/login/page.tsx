"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });

    setLoading(false);
    // next-auth handles redirect; errors show via URL typically
    if ((res as any)?.error) setErr("Invalid credentials");
  }

  return (
    <div className="mx-auto max-w-md">
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
        </CardContent>
      </Card>
    </div>
  );
}
