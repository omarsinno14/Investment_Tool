"use client";

import { Calculator, LineChart, PiggyBank, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tools = [
  {
    title: "Mortgage calculator",
    description: "Estimate monthly payments with taxes, insurance, and rates.",
    icon: Calculator,
    action: "Open calculator",
  },
  {
    title: "Amortization table",
    description: "View principal vs. interest over time and export schedules.",
    icon: LineChart,
    action: "View table",
  },
  {
    title: "Investment return model",
    description: "Forecast compounded growth with contribution planning.",
    icon: TrendingUp,
    action: "Model returns",
  },
  {
    title: "Budget & cashflow planner",
    description: "Track income, expenses, and monthly runway at a glance.",
    icon: Wallet,
    action: "Plan cashflow",
  },
  {
    title: "Retirement readiness",
    description: "Project retirement milestones and safe withdrawal targets.",
    icon: PiggyBank,
    action: "Check readiness",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">
          Practical calculators and planning tools to help you make smarter investment decisions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card key={tool.title}>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{tool.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{tool.description}</p>
                <Button variant="outline" size="sm">
                  {tool.action}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
