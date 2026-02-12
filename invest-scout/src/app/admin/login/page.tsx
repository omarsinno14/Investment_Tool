"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await signIn("credentials", {
      email,
      password,
      requestedRole: "ADMIN",
      redirect: false,
      callbackUrl: "/dashboard",
    });
    if (res?.error) {
      setErr("Admin account required or credentials invalid.");
      return;
    }
    router.push(res?.url ?? "/dashboard");
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
