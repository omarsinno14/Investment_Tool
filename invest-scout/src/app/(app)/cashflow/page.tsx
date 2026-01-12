"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/components/app/CurrencyProvider";
import { usePersonalFinance, type SpendingItem } from "@/components/app/PersonalFinanceProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const EMPTY_BREAKDOWN: SpendingItem[] = [
  { id: "rent", label: "Rent / mortgage", amount: 0 },
  { id: "utilities", label: "Utilities", amount: 0 },
  { id: "groceries", label: "Groceries", amount: 0 },
  { id: "transport", label: "Transport", amount: 0 },
  { id: "subscriptions", label: "Subscriptions", amount: 0 },
];

export default function CashflowPage() {
  const { format } = useCurrency();
  const { data, totals, saveCashflow, updateCashflow, removeCashflow } = usePersonalFinance();
  const [grossMonthly, setGrossMonthly] = useState("");
  const [netMonthly, setNetMonthly] = useState("");
  const [breakdown, setBreakdown] = useState<SpendingItem[]>(EMPTY_BREAKDOWN);
  const [extraSpend, setExtraSpend] = useState("");
  const [comments, setComments] = useState("");
  const [source, setSource] = useState("Manual entry");
  const [editingId, setEditingId] = useState<string | null>(null);

  const breakdownTotal = useMemo(() => {
    return breakdown.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) + (Number(extraSpend) || 0);
  }, [breakdown, extraSpend]);

  const cashflows = data.cashflows;

  function resetForm() {
    setGrossMonthly("");
    setNetMonthly("");
    setBreakdown(EMPTY_BREAKDOWN);
    setExtraSpend("");
    setComments("");
    setSource("Manual entry");
    setEditingId(null);
  }

  function handleSave() {
    const gross = Number(grossMonthly) || 0;
    const net = Number(netMonthly) || 0;
    if (!gross && !net) {
      toast.error("Add at least gross or net monthly income");
      return;
    }
    const payload = {
      grossMonthly: gross,
      netMonthly: net,
      spendingTotal: breakdownTotal,
      spendingBreakdown: breakdown,
      comments,
      source,
    };
    if (editingId) {
      updateCashflow(editingId, payload);
      toast.success("Cashflow updated");
    } else {
      saveCashflow(payload);
      toast.success("Cashflow saved");
    }
    resetForm();
  }

  function editEntry(id: string) {
    const entry = cashflows.find((item) => item.id === id);
    if (!entry) return;
    setGrossMonthly(entry.grossMonthly ? String(entry.grossMonthly) : "");
    setNetMonthly(entry.netMonthly ? String(entry.netMonthly) : "");
    setBreakdown(entry.spendingBreakdown.length ? entry.spendingBreakdown : EMPTY_BREAKDOWN);
    setExtraSpend("0");
    setComments(entry.comments ?? "");
    setSource(entry.source ?? "Manual entry");
    setEditingId(entry.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cashflow</h1>
        <p className="text-muted-foreground">
          Capture monthly income and spending to fuel ratios, goals, and portfolio insights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net monthly income</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {format(totals.netMonthlyIncome || 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Monthly spend</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {format(totals.spendingMonthly || 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net cashflow</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {format((totals.netMonthlyIncome || 0) - (totals.spendingMonthly || 0))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Update cashflow" : "Log cashflow"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Gross monthly income</Label>
              <Input value={grossMonthly} onChange={(e) => setGrossMonthly(e.target.value)} type="number" />
            </div>
            <div className="space-y-2">
              <Label>Net monthly income</Label>
              <Input value={netMonthly} onChange={(e) => setNetMonthly(e.target.value)} type="number" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Monthly spend breakdown</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setBreakdown((prev) => [
                    ...prev,
                    { id: `custom-${prev.length + 1}`, label: "New category", amount: 0 },
                  ])
                }
              >
                Add category
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {breakdown.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      setBreakdown((prev) =>
                        prev.map((row, idx) => (idx === index ? { ...row, label: e.target.value } : row))
                      )
                    }
                  />
                  <Input
                    type="number"
                    value={item.amount}
                    onChange={(e) =>
                      setBreakdown((prev) =>
                        prev.map((row, idx) =>
                          idx === index ? { ...row, amount: Number(e.target.value) } : row
                        )
                      )
                    }
                  />
                  {item.id.startsWith("custom-") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setBreakdown((prev) => prev.filter((row) => row.id !== item.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Other spending</Label>
              <Input value={extraSpend} onChange={(e) => setExtraSpend(e.target.value)} type="number" />
            </div>
            <div className="text-sm text-muted-foreground">
              Total monthly spend: <span className="font-medium">{format(breakdownTotal)}</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Manual entry" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave}>{editingId ? "Update cashflow" : "Save cashflow"}</Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cashflow history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cashflows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No cashflow logs yet.</div>
          ) : (
            cashflows.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {new Date(entry.createdAt).toLocaleDateString()} • {format(entry.netMonthly)} net
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => editEntry(entry.id)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCashflow(entry.id)}
                    >
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
                          <DialogTitle>Cashflow log details</DialogTitle>
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
                  Gross: {format(entry.grossMonthly)} • Net: {format(entry.netMonthly)} • Spend: {format(entry.spendingTotal)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
