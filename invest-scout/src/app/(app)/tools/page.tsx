"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TOOLS = [
  {
    slug: "mortgage-calculator",
    name: "Mortgage calculator",
    description: "Estimate monthly payments and export amortization tables.",
  },
  {
    slug: "irr-calculator",
    name: "IRR calculator",
    description: "Calculate internal rate of return for multi-year cashflows.",
  },
  {
    slug: "npv-calculator",
    name: "NPV calculator",
    description: "Discount future cashflows to understand present value.",
  },
  {
    slug: "budget-split-50-30-20",
    name: "50/30/20 budget split",
    description: "Split take-home pay into needs, wants, and savings targets.",
  },
  {
    slug: "debt-income-service",
    name: "Debt to income and debt to service",
    description: "Compare total debt and servicing costs against income.",
  },
  {
    slug: "leverage-level",
    name: "Leverage level",
    description: "Gauge leverage from total assets and liabilities.",
  },
  {
    slug: "total-salary-income",
    name: "Total salary and total income",
    description: "Combine salary, bonuses, and side income in one view.",
  },
  {
    slug: "debt-payoff-priority",
    name: "Debt payoff priority",
    description: "Rank debts to focus payments based on interest or balance.",
  },
  {
    slug: "retirement-contribution-requirement",
    name: "Retirement contribution requirement",
    description: "Estimate how much to contribute based on goal and timeline.",
  },
  {
    slug: "investment-real-return",
    name: "Investment real return",
    description: "Convert nominal returns into inflation-adjusted results.",
  },
  {
    slug: "big-purchase-tco",
    name: "Big purchase TCO",
    description: "Estimate total cost of ownership for major purchases.",
  },
  {
    slug: "hourly-value",
    name: "Your hourly value",
    description: "Calculate your effective hourly rate from income and hours.",
  },
  {
    slug: "rent-vs-buy-break-even",
    name: "Rent vs buy break even",
    description: "Estimate when buying outperforms renting over time.",
  },
  {
    slug: "extra-payment-roi",
    name: "Extra payment ROI",
    description: "Measure interest saved from extra debt payments.",
  },
  {
    slug: "true-car-cost",
    name: "True car cost",
    description: "Model a full vehicle cost including insurance and upkeep.",
  },
  {
    slug: "tax-drag-raises",
    name: "Tax drag on raises",
    description: "See how taxes affect take-home raise amounts.",
  },
  {
    slug: "interest-cost-over-time",
    name: "Interest cost over time",
    description: "Visualize total interest paid across a timeline.",
  },
  {
    slug: "debt-snowball-timeline",
    name: "Debt snowball timeline",
    description: "Track payoff progress with a snowball schedule.",
  },
];

export default function ToolsPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter((tool) =>
      `${tool.name} ${tool.description}`.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">
          Browse calculators and templates. Search by tool name to jump right in.
        </p>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Search tools..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((tool) => (
          <Card key={tool.slug} className="hover:shadow-sm transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={`/tools/${tool.slug}`} className="hover:underline">
                  {tool.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {tool.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
