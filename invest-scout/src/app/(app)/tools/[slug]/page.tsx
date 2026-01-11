"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function calculateMortgage(principal: number, annualRate: number, years: number) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function buildAmortization(principal: number, annualRate: number, years: number) {
  const payment = calculateMortgage(principal, annualRate, years);
  const r = annualRate / 100 / 12;
  let balance = principal;
  const rows = [] as { month: number; payment: number; principalPaid: number; interest: number; balance: number }[];
  for (let i = 1; i <= years * 12; i += 1) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    rows.push({ month: i, payment, principalPaid, interest, balance });
    if (balance <= 0) break;
  }
  return rows;
}

function npv(rate: number, cashflows: number[]) {
  return cashflows.reduce((acc, cf, idx) => acc + cf / Math.pow(1 + rate, idx + 1), 0);
}

function irr(cashflows: number[]) {
  let guess = 0.1;
  for (let i = 0; i < 100; i += 1) {
    const f = npv(guess, cashflows);
    const df = cashflows.reduce(
      (acc, cf, idx) => acc - (idx + 1) * cf / Math.pow(1 + guess, idx + 2),
      0
    );
    const next = guess - f / df;
    if (Math.abs(next - guess) < 1e-6) return next;
    guess = next;
  }
  return guess;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

export default function ToolDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [principal, setPrincipal] = useState("350000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");

  const [cashflows, setCashflows] = useState("-10000, 2000, 3000, 4000, 5000");
  const [npvRate, setNpvRate] = useState("0.08");

  const monthlyPayment = useMemo(() => {
    const p = Number(principal);
    const r = Number(rate);
    const y = Number(term);
    if (!Number.isFinite(p) || !Number.isFinite(r) || !Number.isFinite(y)) return 0;
    return calculateMortgage(p, r, y);
  }, [principal, rate, term]);

  const amortizationRows = useMemo(() => {
    const p = Number(principal);
    const r = Number(rate);
    const y = Number(term);
    if (!Number.isFinite(p) || !Number.isFinite(r) || !Number.isFinite(y)) return [];
    return buildAmortization(p, r, y);
  }, [principal, rate, term]);

  const parsedCashflows = useMemo(() => {
    return cashflows
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
  }, [cashflows]);

  const irrValue = useMemo(() => {
    if (parsedCashflows.length === 0) return 0;
    return irr(parsedCashflows);
  }, [parsedCashflows]);

  const npvValue = useMemo(() => {
    const rateNum = Number(npvRate);
    if (!Number.isFinite(rateNum)) return 0;
    return npv(rateNum, parsedCashflows);
  }, [npvRate, parsedCashflows]);

  if (!slug) {
    return null;
  }

  const known = ["mortgage-calculator", "irr-calculator", "npv-calculator"].includes(slug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="px-0">
            <Link href="/tools">Back to tools</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {slug === "mortgage-calculator"
              ? "Mortgage calculator"
              : slug === "irr-calculator"
                ? "IRR calculator"
                : slug === "npv-calculator"
                  ? "NPV calculator"
                  : "Tool"}
          </h1>
        </div>
      </div>

      {!known && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Tool not found.
          </CardContent>
        </Card>
      )}

      {slug === "mortgage-calculator" && (
        <Card>
          <CardHeader>
            <CardTitle>Mortgage calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="Loan amount" />
              <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Interest rate (%)" />
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term (years)" />
            </div>
            <div className="text-sm text-muted-foreground">
              Monthly payment: <span className="font-semibold">${monthlyPayment.toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  downloadCsv("mortgage-amortization.csv", [
                    ["Month", "Payment", "Principal", "Interest", "Balance"],
                    ...amortizationRows.map((row) => [
                      row.month,
                      row.payment.toFixed(2),
                      row.principalPaid.toFixed(2),
                      row.interest.toFixed(2),
                      row.balance.toFixed(2),
                    ]),
                  ])
                }
              >
                Download amortization (CSV)
              </Button>
              <Input
                type="file"
                accept=".csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const rows = parseCsv(text);
                  const header = rows[0]?.map((h) => h.toLowerCase()) ?? [];
                  const dataRow = rows[1] ?? [];
                  const getValue = (key: string) => {
                    const idx = header.indexOf(key);
                    return idx >= 0 ? dataRow[idx] : undefined;
                  };
                  setPrincipal(getValue("principal") ?? principal);
                  setRate(getValue("annualrate") ?? rate);
                  setTerm(getValue("years") ?? term);
                }}
              />
            </div>
            <div className="overflow-auto max-h-64 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1">Month</th>
                    <th>Payment</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {amortizationRows.map((row) => (
                    <tr key={row.month}>
                      <td className="py-1">{row.month}</td>
                      <td>${row.payment.toFixed(2)}</td>
                      <td>${row.principalPaid.toFixed(2)}</td>
                      <td>${row.interest.toFixed(2)}</td>
                      <td>${row.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {slug === "irr-calculator" && (
        <Card>
          <CardHeader>
            <CardTitle>IRR calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={cashflows}
              onChange={(e) => setCashflows(e.target.value)}
              placeholder="Cashflows (comma-separated)"
              rows={4}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  downloadCsv("irr-results.csv", [
                    ["Cashflows", parsedCashflows.join(" ")],
                    ["IRR (%)", (irrValue * 100).toFixed(2)],
                  ])
                }
              >
                Download IRR results (CSV)
              </Button>
              <Input
                type="file"
                accept=".csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const rows = parseCsv(text);
                  const values = rows
                    .flat()
                    .map((v) => Number(v))
                    .filter((v) => Number.isFinite(v));
                  if (values.length > 0) setCashflows(values.join(", "));
                }}
              />
            </div>
            <div className="text-base font-semibold">IRR: {(irrValue * 100).toFixed(2)}%</div>
          </CardContent>
        </Card>
      )}

      {slug === "npv-calculator" && (
        <Card>
          <CardHeader>
            <CardTitle>NPV calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={npvRate}
              onChange={(e) => setNpvRate(e.target.value)}
              placeholder="Discount rate (decimal)"
            />
            <Textarea
              value={cashflows}
              onChange={(e) => setCashflows(e.target.value)}
              placeholder="Cashflows (comma-separated)"
              rows={4}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  downloadCsv("npv-results.csv", [
                    ["Discount rate", npvRate],
                    ["Cashflows", parsedCashflows.join(" ")],
                    ["NPV", npvValue.toFixed(2)],
                  ])
                }
              >
                Download NPV results (CSV)
              </Button>
              <Input
                type="file"
                accept=".csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const rows = parseCsv(text);
                  const values = rows
                    .flat()
                    .map((v) => Number(v))
                    .filter((v) => Number.isFinite(v));
                  if (values.length > 0) setCashflows(values.join(", "));
                }}
              />
            </div>
            <div className="text-base font-semibold">NPV: ${npvValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
