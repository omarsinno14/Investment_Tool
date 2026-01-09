"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const rows = [];
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

export default function ToolsPage() {
  const [principal, setPrincipal] = useState("350000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");
  const [showAmortization, setShowAmortization] = useState(false);

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
    if (!showAmortization) return [];
    const p = Number(principal);
    const r = Number(rate);
    const y = Number(term);
    if (!Number.isFinite(p) || !Number.isFinite(r) || !Number.isFinite(y)) return [];
    return buildAmortization(p, r, y);
  }, [principal, rate, term, showAmortization]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">
          Financial calculators and explanations for common investment decisions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mortgage calculator</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="Loan amount" />
          <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Interest rate (%)" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term (years)" />
          <div className="md:col-span-3 text-sm text-muted-foreground">
            Monthly payment: <span className="font-semibold">${monthlyPayment.toFixed(2)}</span>
          </div>
          <Button type="button" variant="outline" onClick={() => setShowAmortization((prev) => !prev)}>
            {showAmortization ? "Hide amortization table" : "Show amortization table"}
          </Button>
          {showAmortization && (
            <div className="md:col-span-3 overflow-auto max-h-64 text-xs">
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
          )}
          <div className="md:col-span-3 text-xs text-muted-foreground">
            Mortgage payments combine interest and principal to fully repay the loan over the term.
            Use this when comparing loan options, refinancing, or understanding total interest costs.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IRR calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={cashflows}
            onChange={(e) => setCashflows(e.target.value)}
            placeholder="Cashflows (comma-separated)"
          />
          <div className="text-sm text-muted-foreground">
            IRR estimates the annualized return of a series of cashflows. Higher is typically better
            if risk is similar. Compare IRR against your required return or cost of capital.
          </div>
          <div className="text-base font-semibold">IRR: {(irrValue * 100).toFixed(2)}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NPV calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={npvRate}
            onChange={(e) => setNpvRate(e.target.value)}
            placeholder="Discount rate (decimal)"
          />
          <div className="text-sm text-muted-foreground">
            NPV discounts future cashflows to today's value using a discount rate. Positive NPV
            suggests value creation versus the target rate; negative NPV suggests value destruction.
          </div>
          <div className="text-base font-semibold">NPV: ${npvValue.toFixed(2)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
