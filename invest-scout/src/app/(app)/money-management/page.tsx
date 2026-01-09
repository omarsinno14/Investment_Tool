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
  incomeYearly: string;
  taxRate: string;
  locationCountry: string;
  locationRegion: string;
  investmentsValue: string;
  investmentsCashflow: string;
  debts: string;
  spendingDaily: string;
  liabilities: string;
  spendingDaily: string;
  spendingWeekly: string;
  spendingMonthly: string;
  savingsCurrent: string;
  dependents: string;
  goalSavings: string;
  goalInvestments: string;
  goalNetWorth: string;
  hideSensitive: boolean;
};

const defaultForm: MoneyForm = {
  incomeMonthly: "",
  incomeYearly: "",
  taxRate: "",
  locationCountry: "",
  locationRegion: "",
  investmentsValue: "",
  investmentsCashflow: "",
  debts: "",
  spendingDaily: "",
  liabilities: "",
  spendingDaily: "",
  spendingWeekly: "",
  spendingMonthly: "",
  savingsCurrent: "",
  dependents: "",
  goalSavings: "",
  goalInvestments: "",
  goalNetWorth: "",
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
          incomeYearly: m.incomeYearly?.toString() ?? "",
          taxRate: m.taxRate?.toString() ?? "",
          locationCountry: m.locationCountry ?? "",
          locationRegion: m.locationRegion ?? "",
          investmentsValue: m.investmentsValue?.toString() ?? "",
          investmentsCashflow: m.investmentsCashflow?.toString() ?? "",
          debts: m.debts?.toString() ?? "",
          liabilities: m.liabilities?.toString() ?? "",
          spendingDaily: m.spendingDaily?.toString() ?? "",
          spendingWeekly: m.spendingWeekly?.toString() ?? "",
          spendingMonthly: m.spendingMonthly?.toString() ?? "",
          savingsCurrent: m.savingsCurrent?.toString() ?? "",
          dependents: m.dependents?.toString() ?? "",
          goalSavings: m.goalSavings?.toString() ?? "",
          goalInvestments: m.goalInvestments?.toString() ?? "",
          goalNetWorth: m.goalNetWorth?.toString() ?? "",
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
    const incomeYearly = asNumber(form.incomeYearly);
    const taxRate = asNumber(form.taxRate);
    const investmentsValue = asNumber(form.investmentsValue);
    const investmentsCashflow = asNumber(form.investmentsCashflow);
    const debts = asNumber(form.debts);
    const liabilities = asNumber(form.liabilities);
    const spendingDaily = asNumber(form.spendingDaily);
    const spendingWeekly = asNumber(form.spendingWeekly);
    const spendingMonthly = asNumber(form.spendingMonthly);
    const savingsCurrent = asNumber(form.savingsCurrent);

    const grossMonthly = incomeMonthly || (incomeYearly ? incomeYearly / 12 : 0);
    const netMonthly = grossMonthly * (1 - Math.min(Math.max(taxRate, 0), 100) / 100);
    const spendingTotal = spendingMonthly + spendingWeekly * 4 + spendingDaily * 30;
    const netCashflow = netMonthly + investmentsCashflow - spendingTotal;
    const netWorth = investmentsValue + savingsCurrent - debts - liabilities;

    return { grossMonthly, netMonthly, spendingTotal, netCashflow, netWorth };
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
          incomeYearly: form.incomeYearly === "" ? undefined : Number(form.incomeYearly),
          taxRate: form.taxRate === "" ? undefined : Number(form.taxRate),
          locationCountry: form.locationCountry || undefined,
          locationRegion: form.locationRegion || undefined,
          investmentsValue: form.investmentsValue === "" ? undefined : Number(form.investmentsValue),
          investmentsCashflow: form.investmentsCashflow === "" ? undefined : Number(form.investmentsCashflow),
          debts: form.debts === "" ? undefined : Number(form.debts),
          liabilities: form.liabilities === "" ? undefined : Number(form.liabilities),
          spendingDaily: form.spendingDaily === "" ? undefined : Number(form.spendingDaily),
          spendingWeekly: form.spendingWeekly === "" ? undefined : Number(form.spendingWeekly),
          spendingMonthly: form.spendingMonthly === "" ? undefined : Number(form.spendingMonthly),
          savingsCurrent: form.savingsCurrent === "" ? undefined : Number(form.savingsCurrent),
          dependents: form.dependents === "" ? undefined : Number(form.dependents),
          goalSavings: form.goalSavings === "" ? undefined : Number(form.goalSavings),
          goalInvestments: form.goalInvestments === "" ? undefined : Number(form.goalInvestments),
          goalNetWorth: form.goalNetWorth === "" ? undefined : Number(form.goalNetWorth),
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
          Track income, spending, and goals to understand your monthly cashflow and net worth.
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
            <Label>Yearly income</Label>
            <Input value={form.incomeYearly} onChange={(e) => setForm({ ...form, incomeYearly: e.target.value })} type="number" />
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
          <CardTitle>Investments, debts, and liabilities</CardTitle>
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
            <Label>Liabilities</Label>
            <Input value={form.liabilities} onChange={(e) => setForm({ ...form, liabilities: e.target.value })} type="number" />
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
          <div className="space-y-2">
            <Label>Weekly spending</Label>
            <Input value={form.spendingWeekly} onChange={(e) => setForm({ ...form, spendingWeekly: e.target.value })} type="number" />
          </div>
          <div className="space-y-2">
            <Label>Monthly spending</Label>
            <Input value={form.spendingMonthly} onChange={(e) => setForm({ ...form, spendingMonthly: e.target.value })} type="number" />
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
          <div className="space-y-2">
            <Label>Net worth goal</Label>
            <Input value={form.goalNetWorth} onChange={(e) => setForm({ ...form, goalNetWorth: e.target.value })} type="number" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy & summary</CardTitle>
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
              <div className="text-muted-foreground">Net worth</div>
              <div className="font-semibold">${display(metrics.netWorth)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Savings progress</div>
              <div className="font-semibold">
                {form.hideSensitive
                  ? "•••"
                  : `${formatMoney(asNumber(form.savingsCurrent))} / ${formatMoney(asNumber(form.goalSavings))}`}
              </div>
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
