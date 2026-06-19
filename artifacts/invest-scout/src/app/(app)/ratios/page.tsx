

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCurrency } from "@/components/app/CurrencyProvider";
import { usePersonalFinance, type RatioEntry } from "@/components/app/PersonalFinanceProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function LineChart({ points }: { points: { x: number; y: number }[] }) {
  if (points.length < 2) return <div className="text-sm text-muted-foreground">Log entries to build the chart.</div>;
  const maxY = Math.max(...points.map((p) => p.y), 1);
  const minY = Math.min(...points.map((p) => p.y), 0);
  const range = maxY - minY || 1;
  const path = points
    .map((p, idx) => {
      const x = (idx / (points.length - 1)) * 100;
      const y = 100 - ((p.y - minY) / range) * 100;
      return `${idx === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-full h-28">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
    </svg>
  );
}

export default function RatiosPage() {
  const { format } = useCurrency();
  const { data, totals, addRatio, updateRatio, removeRatio } = usePersonalFinance();

  const [form, setForm] = useState({
    debts: "",
    liabilities: "",
    cash: "",
    annualEarnings: "",
    comments: "",
    source: "Manual entry",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const ratios = data.ratios;

  const computed = useMemo(() => {
    const debts = Number(form.debts) || 0;
    const liabilities = Number(form.liabilities) || 0;
    const cash = Number(form.cash) || 0;
    const annualEarnings = Number(form.annualEarnings) || 0;
    const assets = totals.totalAssets;
    const equity = assets - liabilities;
    const debtToEquity = equity > 0 ? debts / equity : 0;
    const wealthRatio = liabilities > 0 ? assets / liabilities : 0;
    const currentRatio = liabilities > 0 ? cash / liabilities : 0;
    const quickRatio = liabilities > 0 ? (cash + assets * 0.2) / liabilities : 0;
    const liquidityRatio = totals.spendingMonthly > 0 ? cash / totals.spendingMonthly : 0;
    const debtToEarnings = annualEarnings > 0 ? debts / annualEarnings : 0;
    return {
      debts,
      liabilities,
      cash,
      annualEarnings,
      debtToEquity,
      wealthRatio,
      currentRatio,
      quickRatio,
      liquidityRatio,
      debtToEarnings,
    };
  }, [form, totals.totalAssets, totals.spendingMonthly]);

  function resetForm() {
    setForm({
      debts: "",
      liabilities: "",
      cash: "",
      annualEarnings: "",
      comments: "",
      source: "Manual entry",
    });
    setEditingId(null);
  }

  function handleSubmit() {
    const payload = {
      debts: Number(form.debts) || 0,
      liabilities: Number(form.liabilities) || 0,
      cash: Number(form.cash) || 0,
      annualEarnings: Number(form.annualEarnings) || 0,
      comments: form.comments,
      source: form.source,
    };
    if (!payload.debts && !payload.liabilities && !payload.cash && !payload.annualEarnings) {
      toast.error("Add at least one ratio input");
      return;
    }
    if (editingId) {
      updateRatio(editingId, payload as Partial<RatioEntry>);
      toast.success("Ratios updated");
    } else {
      addRatio(payload);
      toast.success("Ratios saved");
    }
    resetForm();
  }

  function editRatio(entry: RatioEntry) {
    setForm({
      debts: String(entry.debts),
      liabilities: String(entry.liabilities),
      cash: String(entry.cash),
      annualEarnings: String(entry.annualEarnings),
      comments: entry.comments,
      source: entry.source,
    });
    setEditingId(entry.id);
  }

  const chartPoints = ratios
    .slice()
    .reverse()
    .map((entry, idx) => ({
      x: idx,
      y: entry.annualEarnings ? entry.debts / entry.annualEarnings : 0,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ratios</h1>
        <p className="text-muted-foreground">
          Enter debts, liabilities, cash, and earnings to monitor financial ratios over time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Update ratios" : "Log ratios"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Debts</Label>
              <Input type="number" value={form.debts} onChange={(e) => setForm({ ...form, debts: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Liabilities</Label>
              <Input
                type="number"
                value={form.liabilities}
                onChange={(e) => setForm({ ...form, liabilities: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cash</Label>
              <Input type="number" value={form.cash} onChange={(e) => setForm({ ...form, cash: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Annual earnings</Label>
              <Input
                type="number"
                value={form.annualEarnings}
                onChange={(e) => setForm({ ...form, annualEarnings: e.target.value })}
              />
              <div className="flex flex-wrap gap-2 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({ ...form, cash: String(totals.totalCash) })}
                >
                  Use portfolio cash
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      annualEarnings: String(Math.max(0, totals.netMonthlyIncome * 12)),
                    })
                  }
                >
                  Use cashflow net
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit}>{editingId ? "Update ratios" : "Save ratios"}</Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ratio calculations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Debt-to-Equity Ratio (lower &lt; 1)</span>
            <span className="font-medium">{computed.debtToEquity.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Wealth Ratio (target 1+)</span>
            <span className="font-medium">{computed.wealthRatio.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Ratio (strong &gt; 1.5)</span>
            <span className="font-medium">{computed.currentRatio.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Quick Ratio (&gt; 1.0)</span>
            <span className="font-medium">{computed.quickRatio.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Liquidity Ratio (&gt; 1.0)</span>
            <span className="font-medium">{computed.liquidityRatio.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Debt-to-Earnings Ratio (lower &lt; 1)</span>
            <span className="font-medium">{computed.debtToEarnings.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debt-to-earnings trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <LineChart points={chartPoints} />
          <div className="space-y-2 text-sm text-muted-foreground">
            {ratios.length === 0 ? (
              <div>No ratio history yet.</div>
            ) : (
              ratios.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between">
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                  <span>{entry.annualEarnings ? (entry.debts / entry.annualEarnings).toFixed(2) : "0.00"}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ratio logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ratios.length === 0 ? (
            <div className="text-sm text-muted-foreground">No ratio logs yet.</div>
          ) : (
            ratios.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {new Date(entry.createdAt).toLocaleDateString()} • {format(entry.cash)} cash
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => editRatio(entry)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeRatio(entry.id)}>
                      Delete
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          Info
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ratio log details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                          <div>Created: {new Date(entry.createdAt).toLocaleString()}</div>
                          <div>Updated: {new Date(entry.updatedAt).toLocaleString()}</div>
                          <div>Source: {entry.source || "Manual entry"}</div>
                          <div>Comments: {entry.comments || "—"}</div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Debts: {format(entry.debts)} • Liabilities: {format(entry.liabilities)} • Earnings: {format(entry.annualEarnings)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
