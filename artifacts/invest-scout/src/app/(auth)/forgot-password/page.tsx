import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/app/SiteFooter";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setLoading(false);
    setSent(true);
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
              <CardTitle className="text-xl font-medium tracking-tight">Reset your password</CardTitle>
              <CardDescription>
                {sent
                  ? "If an account exists for that address, a reset link is on its way."
                  : "Enter your email and we'll send a secure reset link."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <p className="text-sm text-muted-foreground">
                  Check your inbox and follow the link to choose a new password. The link expires in
                  one hour.
                </p>
              ) : (
                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Email
                    </Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="member@example.com"
                      required
                      className="h-11"
                    />
                  </div>
                  <Button className="w-full h-11 text-base shadow-md" disabled={loading}>
                    {loading ? "Sending..." : "Send reset link"}
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
