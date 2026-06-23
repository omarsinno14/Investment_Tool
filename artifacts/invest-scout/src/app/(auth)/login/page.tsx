

import { useState } from "react";
import { useLocation } from "wouter";

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-foreground text-background text-2xl font-serif tracking-tight shadow-md">
              V
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Vertica</h1>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                Private Deal Room
              </p>
            </div>
          </div>

          <Card className="border-border/60 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-medium tracking-tight">Sign in</CardTitle>
              <CardDescription>Enter your credentials to access the club.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Email</Label>
                  <Input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    type="email" 
                    placeholder="member@example.com"
                    required 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Password</Label>
                    <Link className="text-xs text-muted-foreground hover:text-foreground transition-colors" href="/forgot-password">
                      Forgot?
                    </Link>
                  </div>
                  <Input 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    type="password" 
                    placeholder="••••••••"
                    required 
                    className="h-11"
                  />
                </div>
                {err && <p className="text-sm text-destructive font-medium">{err}</p>}
                <Button className="w-full h-11 text-base shadow-md" disabled={loading}>
                  {loading ? "Authenticating..." : "Enter"}
                </Button>
              </form>

              <div className="mt-8 flex flex-col items-center space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Not a member?{" "}
                  <Link className="font-medium text-foreground hover:text-accent transition-colors underline underline-offset-4" href="/register">
                    Apply for access
                  </Link>
                </p>
                <Link className="text-xs text-muted-foreground hover:text-foreground transition-colors" href="/admin/login">
                  Admin Portal
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
