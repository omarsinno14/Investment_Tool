

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/components/app/CurrencyProvider";
import { usePersonalFinance, type PortfolioAsset } from "@/components/app/PersonalFinanceProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const PORTFOLIO_ASSET_TYPES = [
  { value: "CASH", label: "Cash" },
  { value: "STOCKS", label: "Stocks" },
  { value: "ETF", label: "ETF" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "PRIVATE_EQUITY", label: "Private Equity" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "WATCH", label: "Watch" },
  { value: "ART", label: "Art" },
  { value: "BUSINESS", label: "Business" },
  { value: "DEBT", label: "Debt" },
  { value: "OTHER", label: "Other" },
] as const;

type PortfolioAssetType = (typeof PORTFOLIO_ASSET_TYPES)[number]["value"];

type ManagedAsset = {
  id: string;
  name: string;
  assetType: PortfolioAssetType;
  currency: string;
  currentValue: number;
  costBasis: number | null;
  quantity: number | null;
  isLiability: boolean;
  passiveIncomeMonthly: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type AssetSummary = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  allocationByType: { assetType: string; value: number; pct: number }[];
  totalPassiveIncomeMonthly: number;
  count: number;
};

function assetTypeLabel(value: string) {
  return PORTFOLIO_ASSET_TYPES.find((t) => t.value === value)?.label ?? value;
}

function emptyAssetForm() {
  return {
    name: "",
    assetType: "CASH" as PortfolioAssetType,
    currency: "USD",
    currentValue: "",
    costBasis: "",
    quantity: "",
    isLiability: false,
    passiveIncomeMonthly: "",
    notes: "",
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function AssetsModule() {
  const { format } = useCurrency();
  const [assets, setAssets] = useState<ManagedAsset[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyAssetForm());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/assets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssets(data.assets ?? []);
      setSummary(data.summary ?? null);
    } catch {
      toast.error("Could not load your assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(emptyAssetForm());
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(asset: ManagedAsset) {
    setForm({
      name: asset.name,
      assetType: asset.assetType,
      currency: asset.currency || "USD",
      currentValue: String(asset.currentValue),
      costBasis: asset.costBasis != null ? String(asset.costBasis) : "",
      quantity: asset.quantity != null ? String(asset.quantity) : "",
      isLiability: asset.isLiability,
      passiveIncomeMonthly: asset.passiveIncomeMonthly != null ? String(asset.passiveIncomeMonthly) : "",
      notes: asset.notes ?? "",
    });
    setEditingId(asset.id);
    setDialogOpen(true);
  }

  function parseOptionalNumber(value: string): number | null {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Add an asset name");
      return;
    }
    const currentValue = Number(form.currentValue);
    if (!Number.isFinite(currentValue)) {
      toast.error("Add a valid current value");
      return;
    }
    const payload = {
      name: form.name.trim(),
      assetType: form.assetType,
      currency: form.currency || "USD",
      currentValue,
      costBasis: parseOptionalNumber(form.costBasis),
      quantity: parseOptionalNumber(form.quantity),
      isLiability: form.isLiability,
      passiveIncomeMonthly: parseOptionalNumber(form.passiveIncomeMonthly),
      notes: form.notes.trim() ? form.notes.trim() : null,
    };
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/user/assets/${editingId}` : "/api/user/assets",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Failed");
      toast.success(editingId ? "Holding updated" : "Holding added");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyAssetForm());
      await load();
    } catch {
      toast.error("Could not save your holding");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/user/assets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Holding removed");
      await load();
    } catch {
      toast.error("Could not remove this holding");
    }
  }

  function handleExport(fmt: "csv" | "json") {
    const url = `/api/user/assets/export?format=${fmt}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfolio-assets.${fmt}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ManagedAsset[]>();
    for (const asset of assets) {
      const list = map.get(asset.assetType) ?? [];
      list.push(asset);
      map.set(asset.assetType, list);
    }
    return Array.from(map.entries());
  }, [assets]);

  const pieData = useMemo(
    () =>
      (summary?.allocationByType ?? []).map((slice) => ({
        name: assetTypeLabel(slice.assetType),
        value: slice.value,
        pct: slice.pct,
      })),
    [summary]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Holdings ledger</h2>
          <p className="text-sm text-muted-foreground">
            A private register of what you own and owe — tracked by hand, kept off the grid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
            Export JSON
          </Button>
          <Button size="sm" onClick={openCreate}>
            Add holding
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net worth</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{format(summary?.netWorth ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total holdings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">{format(summary?.totalAssets ?? 0)}</div>
            <div className="text-xs text-muted-foreground">
              Liabilities {format(summary?.totalLiabilities ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Passive income (monthly)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {format(summary?.totalPassiveIncomeMonthly ?? 0)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-sm text-muted-foreground">Add holdings to see your allocation.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [format(value), name]}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Holdings by type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {grouped.length === 0 ? (
              <div className="text-sm text-muted-foreground">No holdings recorded yet.</div>
            ) : (
              grouped.map(([type, list], groupIdx) => (
                <div key={type} className="space-y-2">
                  {groupIdx > 0 && <Separator />}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-sm font-medium">{assetTypeLabel(type)}</div>
                    <div className="text-xs text-muted-foreground">
                      {list.length} {list.length === 1 ? "holding" : "holdings"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {list.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{asset.name}</span>
                            {asset.isLiability && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Liability
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {asset.passiveIncomeMonthly != null
                              ? `Passive income ${format(asset.passiveIncomeMonthly, { fromCurrency: asset.currency })}/mo`
                              : asset.notes || asset.currency}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              asset.isLiability
                                ? "text-sm font-semibold text-muted-foreground"
                                : "text-sm font-semibold"
                            }
                          >
                            {asset.isLiability ? "-" : ""}
                            {format(asset.currentValue, { fromCurrency: asset.currency })}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => openEdit(asset)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(asset.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Update holding" : "Add holding"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.assetType}
                  onValueChange={(value) => setForm({ ...form, assetType: value as PortfolioAssetType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTFOLIO_ASSET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Current value</Label>
                <Input
                  type="number"
                  value={form.currentValue}
                  onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost basis</Label>
                <Input
                  type="number"
                  value={form.costBasis}
                  onChange={(e) => setForm({ ...form, costBasis: e.target.value })}
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
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passive income (monthly)</Label>
                <Input
                  type="number"
                  value={form.passiveIncomeMonthly}
                  onChange={(e) => setForm({ ...form, passiveIncomeMonthly: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="asset-is-liability"
                checked={form.isLiability}
                onCheckedChange={(checked) => setForm({ ...form, isLiability: checked === true })}
              />
              <Label htmlFor="asset-is-liability" className="cursor-pointer">
                Track this as a liability
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {editingId ? "Save changes" : "Add holding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
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

      <AssetsModule />

      <Separator />

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Working ledger</h2>
        <p className="text-sm text-muted-foreground">
          Your private worksheet for tracking gains and net-worth snapshots over time.
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
