import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/app/SiteFooter";

function useToken(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? "";
}

export default function ResetPasswordPage() {
  const token = useToken();
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error ?? "Could not reset your password. The link may have expired.");
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/login"), 1800);
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
              <CardTitle className="text-xl font-medium tracking-tight">Choose a new password</CardTitle>
              <CardDescription>
                {done
                  ? "Your password has been updated. Redirecting to sign in..."
                  : "Use at least 8 characters with an uppercase letter, a number, and a symbol."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!token ? (
                <p className="text-sm text-destructive font-medium">
                  This reset link is invalid or incomplete. Request a new one.
                </p>
              ) : done ? null : (
                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      New password
                    </Label>
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      placeholder="••••••••"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Confirm password
                    </Label>
                    <Input
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      type="password"
                      placeholder="••••••••"
                      required
                      className="h-11"
                    />
                  </div>
                  {err && <p className="text-sm text-destructive font-medium">{err}</p>}
                  <Button className="w-full h-11 text-base shadow-md" disabled={loading}>
                    {loading ? "Updating..." : "Update password"}
                  </Button>
                </form>
              )}

              <div className="mt-8 flex flex-col items-center space-y-2 text-sm">
                <Link
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  href="/login"
                >
                  Back to sign in
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
