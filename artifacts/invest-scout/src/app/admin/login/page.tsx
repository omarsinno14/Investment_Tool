

import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-background font-serif text-xl shadow-md">
            V
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Portal</h1>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Authorized Personnel Only</CardTitle>
            <CardDescription>Sign in to manage Vertica</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Admin Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-10" />
              </div>
              {err ? <p className="text-sm text-destructive font-medium">{err}</p> : null}
              <Button className="w-full mt-2" variant="default">Login as Admin</Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Need approval? <Link className="font-medium text-foreground underline underline-offset-4 hover:text-accent transition-colors" href="/admin/signup">Request admin account</Link>
              </p>
              <p className="mt-2">
                <Link className="text-xs text-muted-foreground hover:text-foreground transition-colors" href="/login">Return to Member Login</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
