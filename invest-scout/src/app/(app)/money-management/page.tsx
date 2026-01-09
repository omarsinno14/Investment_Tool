"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MoneyForm = {
  incomeMonthly: string;
  taxRate: string;
  locationCountry: string;
  locationRegion: string;
  investmentsValue: string;
  investmentsCashflow: string;
  debts: string;
  spendingDaily: string;
  savingsCurrent: string;
  dependents: string;
  goalSavings: string;
  goalInvestments: string;
  hideSensitive: boolean;
};

const defaultForm: MoneyForm = {
  incomeMonthly: "",
  taxRate: "",
  locationCountry: "",
  locationRegion: "",
  investmentsValue: "",
  investmentsCashflow: "",
  debts: "",
  spendingDaily: "",
  savingsCurrent: "",
  dependents: "",
  goalSavings: "",
  goalInvestments: "",
  hideSensitive: false,
};

function asNumber(value: string) {
  if (value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function MoneyManagementPage() {
  const [form, setForm] = useState<MoneyForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/money-management", { credentials: "include" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        const ct = res.headers.get("content-type") ?? "";
        const isJson = ct.includes("application/json");
        const data = isJson ? await res.json().catch(() => ({})) : {};

        if (!res.ok || !isJson) {
          throw new Error(data?.error ?? "Failed to load money management");
        }

        const m = data.money ?? {};
        setForm({
          incomeMonthly: m.incomeMonthly?.toString() ?? "",
          taxRate: m.taxRate?.toString() ?? "",
          locationCountry: m.locationCountry ?? "",
          locationRegion: m.locationRegion ?? "",
          investmentsValue: m.investmentsValue?.toString() ?? "",
          investmentsCashflow: m.investmentsCashflow?.toString() ?? "",
          debts: m.debts?.toString() ?? "",
          spendingDaily: m.spendingDaily?.toString() ?? "",
          savingsCurrent: m.savingsCurrent?.toString() ?? "",
          dependents: m.dependents?.toString() ?? "",
          goalSavings: m.goalSavings?.toString() ?? "",
          goalInvestments: m.goalInvestments?.toString() ?? "",
          hideSensitive: Boolean(m.hideSensitive),
        });
      } catch (e) {
        console.error(e);
        toast.error("Unable to load money management");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    const incomeMonthly = asNumber(form.incomeMonthly);
    const taxRate = asNumber(form.taxRate);
    const investmentsValue = asNumber(form.investmentsValue);
    const investmentsCashflow = asNumber(form.investmentsCashflow);
    const debts = asNumber(form.debts);
    const spendingDaily = asNumber(form.spendingDaily);
    const savingsCurrent = asNumber(form.savingsCurrent);

    const grossMonthly = incomeMonthly;
    const netMonthly = grossMonthly * (1 - Math.min(Math.max(taxRate, 0), 100) / 100);
    const spendingTotal = spendingDaily * 30;
    const netCashflow = netMonthly + investmentsCashflow - spendingTotal;
    const emergencyTarget = spendingTotal * 3;
    const savingsRunway = spendingTotal > 0 ? savingsCurrent / spendingTotal : 0;
    const savingsGap = emergencyTarget - savingsCurrent;
    const debtToIncome = grossMonthly > 0 ? debts / (grossMonthly * 12) : 0;
    const allocationNeeds = netMonthly * 0.5;
    const allocationWants = netMonthly * 0.3;
    const allocationInvest = netMonthly * 0.2;

    return {
      grossMonthly,
      netMonthly,
      spendingTotal,
      netCashflow,
      emergencyTarget,
      savingsRunway,
      savingsGap,
      debtToIncome,
      allocationNeeds,
      allocationWants,
      allocationInvest,
    };
  }, [form]);

  function display(value: number) {
    if (form.hideSensitive) return "•••";
    return formatMoney(value);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/money-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          incomeMonthly: form.incomeMonthly === "" ? undefined : Number(form.incomeMonthly),
          taxRate: form.taxRate === "" ? undefined : Number(form.taxRate),
          locationCountry: form.locationCountry || undefined,
          locationRegion: form.locationRegion || undefined,
          investmentsValue: form.investmentsValue === "" ? undefined : Number(form.investmentsValue),
          investmentsCashflow: form.investmentsCashflow === "" ? undefined : Number(form.investmentsCashflow),
          debts: form.debts === "" ? undefined : Number(form.debts),
          spendingDaily: form.spendingDaily === "" ? undefined : Number(form.spendingDaily),
          savingsCurrent: form.savingsCurrent === "" ? undefined : Number(form.savingsCurrent),
          dependents: form.dependents === "" ? undefined : Number(form.dependents),
          goalSavings: form.goalSavings === "" ? undefined : Number(form.goalSavings),
          goalInvestments: form.goalInvestments === "" ? undefined : Number(form.goalInvestments),
          hideSensitive: form.hideSensitive,
        }),
      });

      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      const body = isJson ? await res.json().catch(() => ({})) : {};

      if (!res.ok) {
        throw new Error(body?.error ?? "Save failed");
      }

      toast.success("Money management saved");
    } catch (e) {
      console.error(e);
      toast.error("Unable to save money management");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Money management</h1>
        <p className="text-muted-foreground">
          Track income, spending, and goals to understand your monthly cashflow and savings runway.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gross monthly</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${display(metrics.grossMonthly)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net monthly</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${display(metrics.netMonthly)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net cashflow</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${display(metrics.netCashflow)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income & taxes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Monthly income</Label>
            <Input value={form.incomeMonthly} onChange={(e) => setForm({ ...form, incomeMonthly: e.target.value })} type="number" />
          </div>
          <div className="space-y-2">
            <Label>Tax rate (%)</Label>
            <Input value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} type="number" />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={form.locationCountry} onChange={(e) => setForm({ ...form, locationCountry: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>State / province</Label>
            <Input value={form.locationRegion} onChange={(e) => setForm({ ...form, locationRegion: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investments and debts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Investments value</Label>
            <Input value={form.investmentsValue} onChange={(e) => setForm({ ...form, investmentsValue: e.target.value })} type="number" />
          </div>
          <div className="space-y-2">
            <Label>Investments cashflow (monthly)</Label>
            <Input value={form.investmentsCashflow} onChange={(e) => setForm({ ...form, investmentsCashflow: e.target.value })} type="number" />
          </div>
          <div className="space-y-2">
            <Label>Debts</Label>
            <Input value={form.debts} onChange={(e) => setForm({ ...form, debts: e.target.value })} type="number" />
          </div>
          <div className="space-y-2">
            <Label>Current savings</Label>
            <Input value={form.savingsCurrent} onChange={(e) => setForm({ ...form, savingsCurrent: e.target.value })} type="number" />
          </div>
          <div className="space-y-2">
            <Label>Dependents</Label>
            <Input value={form.dependents} onChange={(e) => setForm({ ...form, dependents: e.target.value })} type="number" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending habits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Daily spending</Label>
            <Input value={form.spendingDaily} onChange={(e) => setForm({ ...form, spendingDaily: e.target.value })} type="number" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested allocation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">Needs (50%)</div>
            <div className="text-lg font-semibold">${display(metrics.allocationNeeds)}</div>
            <div className="text-muted-foreground text-xs">Housing, essentials, insurance</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">Wants (30%)</div>
            <div className="text-lg font-semibold">${display(metrics.allocationWants)}</div>
            <div className="text-muted-foreground text-xs">Lifestyle, travel, extras</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">Invest / save (20%)</div>
            <div className="text-lg font-semibold">${display(metrics.allocationInvest)}</div>
            <div className="text-muted-foreground text-xs">Savings, investments, debt</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Saving goal</Label>
            <Input value={form.goalSavings} onChange={(e) => setForm({ ...form, goalSavings: e.target.value })} type="number" />
          </div>
          <div className="space-y-2">
            <Label>Investment goal</Label>
            <Input value={form.goalInvestments} onChange={(e) => setForm({ ...form, goalInvestments: e.target.value })} type="number" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy, insights, and next steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="hideSensitive"
              checked={form.hideSensitive}
              onCheckedChange={(value) => setForm({ ...form, hideSensitive: Boolean(value) })}
            />
            <Label htmlFor="hideSensitive">Hide sensitive values</Label>
          </div>

          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <div className="text-muted-foreground">Monthly spending total</div>
              <div className="font-semibold">${display(metrics.spendingTotal)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Savings progress</div>
              <div className="font-semibold">
                {form.hideSensitive
                  ? "•••"
                  : `${formatMoney(asNumber(form.savingsCurrent))} / ${formatMoney(asNumber(form.goalSavings))}`}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Emergency fund target (3x spend)</div>
              <div className="font-semibold">${display(metrics.emergencyTarget)}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <div className="text-muted-foreground">Savings runway</div>
              <div className="font-semibold">
                {form.hideSensitive ? "•••" : `${metrics.savingsRunway.toFixed(1)} months`}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Savings gap to target</div>
              <div className="font-semibold">${display(Math.max(metrics.savingsGap, 0))}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Debt-to-income ratio</div>
              <div className="font-semibold">
                {form.hideSensitive ? "•••" : `${(metrics.debtToIncome * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 text-sm space-y-2">
            <div className="font-semibold">Smart tips</div>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Keep daily spend below 30% of net monthly for better savings velocity.</li>
              <li>Build a 3–6 month emergency fund before increasing investment risk.</li>
              <li>Use the exclude keywords filter in Opportunities to keep your feed focused.</li>
              <li>Negative cashflow? Reduce daily spend or adjust tax rate to see impact.</li>
            </ul>
          </div>

          <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
            <div className="font-semibold">Money snapshot</div>
            <div className="text-muted-foreground">
              {form.hideSensitive
                ? "•••"
                : `Net monthly $${formatMoney(metrics.netMonthly)}, daily spend $${formatMoney(asNumber(form.spendingDaily))}, cashflow $${formatMoney(metrics.netCashflow)}.`}
            </div>
            <div className="text-muted-foreground">
              {metrics.netCashflow < 0
                ? "You're spending more than you bring in. Trim daily spend or increase income to turn cashflow positive."
                : "Cashflow positive. Consider boosting savings or investment goals."}
            </div>
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save money management"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
