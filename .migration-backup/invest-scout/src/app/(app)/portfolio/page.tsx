"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/components/app/CurrencyProvider";
import { usePersonalFinance, type PortfolioAsset } from "@/components/app/PersonalFinanceProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ASSET_TYPES = [
  "Property",
  "Cash",
  "Shares",
  "Bonds",
  "Retirement",
  "Private Equity",
  "Crypto",
  "Commodities",
  "Vehicles",
  "Business",
  "Collectibles",
  "Other",
];

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#0ea5e9", "#eab308", "#ef4444", "#14b8a6", "#f472b6", "#6366f1"];

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function LineChart({ points }: { points: { x: number; y: number }[] }) {
  if (points.length < 2) return <div className="text-sm text-muted-foreground">Add snapshots to build the chart.</div>;
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
    <svg viewBox="0 0 100 100" className="w-full h-32">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
    </svg>
  );
}

export default function PortfolioPage() {
  const { currency, format } = useCurrency();
  const { data, totals, addAsset, updateAsset, removeAsset, addPortfolioSnapshot } = usePersonalFinance();

  const [form, setForm] = useState({
    name: "",
    type: "Property",
    initialValue: "",
    currentValue: "",
    currency,
    comments: "",
    source: "Manual entry",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const asset of data.assets) {
      map.set(asset.type, (map.get(asset.type) ?? 0) + asset.currentValue);
    }
    const total = totals.totalAssets || 1;
    return Array.from(map.entries()).map(([type, value], idx) => ({
      type,
      value,
      percent: (value / total) * 100,
      color: COLORS[idx % COLORS.length],
    }));
  }, [data.assets, totals.totalAssets]);

  const mix = useMemo(() => {
    const total = totals.totalAssets || 1;
    return breakdown.map((item) => ({ ...item, percent: (item.value / total) * 100 }));
  }, [breakdown, totals.totalAssets]);

  const snapshots = data.portfolioSnapshots.slice().reverse();
  const chartPoints = snapshots.map((snap, idx) => ({ x: idx, y: snap.netWorth }));

  function resetForm() {
    setForm({
      name: "",
      type: "Property",
      initialValue: "",
      currentValue: "",
      currency,
      comments: "",
      source: "Manual entry",
    });
    setEditingId(null);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Add an asset name");
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      initialValue: Number(form.initialValue) || 0,
      currentValue: Number(form.currentValue) || 0,
      currency: form.currency || currency,
      comments: form.comments,
      source: form.source,
    };
    if (editingId) {
      updateAsset(editingId, payload as Partial<PortfolioAsset>);
      toast.success("Asset updated");
    } else {
      addAsset(payload);
      toast.success("Asset logged");
    }
    resetForm();
  }

  function editAsset(asset: PortfolioAsset) {
    setForm({
      name: asset.name,
      type: asset.type,
      initialValue: String(asset.initialValue),
      currentValue: String(asset.currentValue),
      currency: asset.currency || currency,
      comments: asset.comments,
      source: asset.source,
    });
    setEditingId(asset.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">
          Log assets, track gains, and watch your net worth trend over time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total portfolio value</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{format(totals.totalAssets)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total gain</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {format(totals.totalAssets - totals.totalInitialAssets)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net worth (after debts)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{format(totals.netWorth)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Update asset" : "Log an asset"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Asset name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Asset type</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Initial value</Label>
              <Input
                type="number"
                value={form.initialValue}
                onChange={(e) => setForm({ ...form, initialValue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Current value</Label>
              <Input
                type="number"
                value={form.currentValue}
                onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(value) => setForm({ ...form, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleSubmit}>{editingId ? "Update asset" : "Save asset"}</Button>
            <Button variant="outline" onClick={addPortfolioSnapshot}>
              Save portfolio snapshot
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {breakdown.length === 0 ? (
              <div className="text-sm text-muted-foreground">Add assets to see composition.</div>
            ) : (
              <>
                <div className="flex h-4 overflow-hidden rounded-full border">
                  {breakdown.map((item) => (
                    <div
                      key={item.type}
                      style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                      title={`${item.type} ${formatPercent(item.percent)}`}
                    />
                  ))}
                </div>
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  {breakdown.map((item) => (
                    <div key={item.type} className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="flex-1">{item.type}</span>
                      <span className="text-muted-foreground">{format(item.value)} ({formatPercent(item.percent)})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investment mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mix.length === 0 ? (
              <div className="text-sm text-muted-foreground">Add assets to see mix.</div>
            ) : (
              mix.map((item) => (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.type}</span>
                    <span className="text-muted-foreground">{formatPercent(item.percent)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net worth over time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LineChart points={chartPoints} />
          <div className="space-y-2 text-sm text-muted-foreground">
            {snapshots.length === 0 ? (
              <div>No snapshots yet.</div>
            ) : (
              snapshots.map((snap) => (
                <div key={snap.id} className="flex items-center justify-between">
                  <span>{new Date(snap.createdAt).toLocaleDateString()}</span>
                  <span>{format(snap.netWorth)}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.assets.length === 0 ? (
            <div className="text-sm text-muted-foreground">No assets logged yet.</div>
          ) : (
            data.assets.map((asset) => {
              const gain = asset.currentValue - asset.initialValue;
              const gainPct = asset.initialValue ? (gain / asset.initialValue) * 100 : 0;
              return (
                <div key={asset.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.type}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => editAsset(asset)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeAsset(asset.id)}>
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
                            <DialogTitle>Asset log details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 text-sm">
                            <div>Created: {new Date(asset.createdAt).toLocaleString()}</div>
                            <div>Updated: {new Date(asset.updatedAt).toLocaleString()}</div>
                            <div>Source: {asset.source || "Manual entry"}</div>
                            <div>Comments: {asset.comments || "—"}</div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current: {format(asset.currentValue, { fromCurrency: asset.currency })} • Initial: {format(asset.initialValue, { fromCurrency: asset.currency })}
                  </div>
                  <div className="text-sm">
                    Gain: {format(gain, { fromCurrency: asset.currency })} ({gainPct.toFixed(1)}%)
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
