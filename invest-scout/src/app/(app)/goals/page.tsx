"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCurrency } from "@/components/app/CurrencyProvider";
import { usePersonalFinance, type GoalEntry } from "@/components/app/PersonalFinanceProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const GOAL_TYPES = [
  "Long-term investment",
  "Short-term savings",
  "Emergency fund",
  "Retirement",
  "Education",
  "Big purchase",
  "Other",
];

export default function GoalsPage() {
  const { format } = useCurrency();
  const { data, totals, addGoal, updateGoal, removeGoal } = usePersonalFinance();

  const [form, setForm] = useState({
    name: "",
    type: GOAL_TYPES[0],
    timeline: "",
    targetAmount: "",
    currentAmount: "",
    comments: "",
    source: "Manual entry",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const goals = data.goals;

  const goalStats = useMemo(() => {
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const completion = totalTarget ? (totalCurrent / totalTarget) * 100 : 0;
    return { totalTarget, totalCurrent, completion };
  }, [goals]);

  function resetForm() {
    setForm({
      name: "",
      type: GOAL_TYPES[0],
      timeline: "",
      targetAmount: "",
      currentAmount: "",
      comments: "",
      source: "Manual entry",
    });
    setEditingId(null);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Add a goal name");
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      timeline: form.timeline,
      targetAmount: Number(form.targetAmount) || 0,
      currentAmount: Number(form.currentAmount) || 0,
      comments: form.comments,
      source: form.source,
    };
    if (editingId) {
      updateGoal(editingId, payload as Partial<GoalEntry>);
      toast.success("Goal updated");
    } else {
      addGoal(payload);
      toast.success("Goal saved");
    }
    resetForm();
  }

  function editGoal(goal: GoalEntry) {
    setForm({
      name: goal.name,
      type: goal.type,
      timeline: goal.timeline,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      comments: goal.comments,
      source: goal.source,
    });
    setEditingId(goal.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals & timelines</h1>
        <p className="text-muted-foreground">
          Track long-term and short-term goals with progress insights and updates over time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total target</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{format(goalStats.totalTarget)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total saved</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{format(goalStats.totalCurrent)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Overall completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{goalStats.completion.toFixed(1)}%</div>
            <Progress value={goalStats.completion} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Update goal" : "Add a goal"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Goal name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Goal type</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timeline / target date</Label>
              <Input
                type="date"
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Target amount</Label>
              <Input
                type="number"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Current amount</Label>
              <Input
                type="number"
                value={form.currentAmount}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              />
              <div className="flex flex-wrap gap-2 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({ ...form, currentAmount: String(totals.totalCash) })}
                >
                  Use portfolio cash
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({ ...form, currentAmount: String(totals.totalAssets) })}
                >
                  Use portfolio total
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
            <Button onClick={handleSubmit}>{editingId ? "Update goal" : "Save goal"}</Button>
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
          <CardTitle>Goal progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No goals yet.</div>
          ) : (
            goals.map((goal) => {
              const pct = goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              return (
                <div key={goal.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{goal.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {goal.type} {goal.timeline ? `• Target: ${goal.timeline}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => editGoal(goal)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeGoal(goal.id)}>
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
                            <DialogTitle>Goal details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 text-sm">
                            <div>Created: {new Date(goal.createdAt).toLocaleString()}</div>
                            <div>Updated: {new Date(goal.updatedAt).toLocaleString()}</div>
                            <div>Source: {goal.source || "Manual entry"}</div>
                            <div>Comments: {goal.comments || "—"}</div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(goal.currentAmount)} of {format(goal.targetAmount)} ({pct.toFixed(1)}%)
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
