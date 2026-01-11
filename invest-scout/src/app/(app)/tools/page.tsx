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
