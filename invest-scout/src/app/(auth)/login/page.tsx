"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
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
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);
    if (res?.error) {
      setErr(res.error === "CredentialsSignin" ? "Invalid credentials" : "Unable to sign in");
      return;
    }
    router.push(res?.url ?? "/dashboard");
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
              <h1 className="text-2xl font-semibold">Invesco</h1>
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
            </CardContent>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
