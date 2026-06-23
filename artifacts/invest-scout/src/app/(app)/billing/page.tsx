import { useEffect, useState } from "react";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Plan = {
  tier: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  features: string[];
};

type Subscription = {
  tier: string;
  status: string;
  renewsAt: string | null;
  plan: Plan;
  stripeEnabled: boolean;
};

type PaymentEvent = {
  id: string;
  type: string;
  tier: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  createdAt: string;
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function apiSend(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `${res.status}`);
  return data;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function centsToUsd(amount: number | null, currency: string | null): string {
  if (amount == null) return "—";
  return `${(amount / 100).toLocaleString(undefined, { style: "currency", currency: (currency ?? "usd").toUpperCase() })}`;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const [p, s, h] = await Promise.all([
        apiGet<{ plans: Plan[] }>("/api/billing/plans"),
        apiGet<Subscription>("/api/billing/subscription"),
        apiGet<{ events: PaymentEvent[] }>("/api/billing/history"),
      ]);
      setPlans(p.plans);
      setSub(s);
      setHistory(h.events);
    } catch {
      toast.error("Could not load membership details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function activate(tier: string) {
    if (sub?.stripeEnabled) {
      toast.info("Redirecting to secure checkout...");
      return;
    }
    setBusy(tier);
    try {
      await apiSend("/api/billing/activate", { tier });
      toast.success("Membership updated.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update membership.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    try {
      await apiSend("/api/billing/cancel");
      toast.success("Membership will not renew.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    );
  }

  const currentTier = sub?.tier ?? "FREE";

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Membership</h1>
          <p className="text-sm text-muted-foreground">
            Unlock the full deal room. Subscriptions fund the platform — Vertica never moves
            investment capital.
          </p>
        </div>
      </div>

      {sub && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="text-lg font-semibold">
                {sub.plan.name}{" "}
                <Badge variant="secondary" className="ml-1 align-middle">
                  {sub.status}
                </Badge>
              </p>
              {sub.renewsAt && (
                <p className="text-sm text-muted-foreground">Renews {fmtDate(sub.renewsAt)}</p>
              )}
            </div>
            {currentTier !== "FREE" && sub.status === "ACTIVE" && (
              <Button variant="outline" onClick={cancel} disabled={busy === "cancel"}>
                {busy === "cancel" ? "Cancelling..." : "Cancel membership"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <Card key={plan.tier} className={isCurrent ? "border-foreground shadow-md" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {plan.name}
                  {isCurrent && <Badge>Current</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="pt-2 text-2xl font-bold">
                  {plan.priceMonthly === 0 ? "Free" : `$${plan.priceMonthly}`}
                  {plan.priceMonthly > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {!isCurrent && plan.tier !== "FREE" && (
                  <Button
                    className="w-full"
                    onClick={() => activate(plan.tier)}
                    disabled={busy === plan.tier}
                  >
                    {busy === plan.tier ? "Updating..." : sub?.stripeEnabled ? "Subscribe" : "Choose plan"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {history.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
            )}
            {history.map((e) => (
              <div
                key={e.id}
                className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                <span className="font-medium">{e.type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">{e.tier ?? "—"}</span>
                <span className="text-muted-foreground">{centsToUsd(e.amount, e.currency)}</span>
                <span className="text-muted-foreground sm:text-right">{fmtDate(e.createdAt)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
