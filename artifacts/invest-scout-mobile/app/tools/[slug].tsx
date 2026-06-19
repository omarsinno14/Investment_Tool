import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

function calculateMortgage(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0 || n === 0) return n === 0 ? 0 : principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function buildAmortization(principal: number, annualRate: number, years: number) {
  const payment = calculateMortgage(principal, annualRate, years);
  const r = annualRate / 100 / 12;
  let balance = principal;
  const rows: { month: number; payment: number; principalPaid: number; interest: number; balance: number }[] = [];
  for (let i = 1; i <= years * 12 && balance > 0; i++) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    rows.push({ month: i, payment, principalPaid, interest, balance });
  }
  return rows;
}

function npvCalc(rate: number, cashflows: number[]): number {
  return cashflows.reduce((acc, cf, idx) => acc + cf / Math.pow(1 + rate, idx + 1), 0);
}

function irrCalc(cashflows: number[]): number {
  let guess = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npvCalc(guess, cashflows);
    const df = cashflows.reduce((acc, cf, idx) => acc - (idx + 1) * cf / Math.pow(1 + guess, idx + 2), 0);
    if (df === 0) break;
    const next = guess - f / df;
    if (Math.abs(next - guess) < 1e-6) return next;
    guess = next;
  }
  return guess;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EXTRA_TOOLS: Record<string, { name: string; description: string }> = {
  "budget-split-50-30-20": { name: "50/30/20 budget split", description: "Plan your take-home pay across needs, wants, and savings." },
  "debt-income-service": { name: "Debt to income and debt to service", description: "Track debt ratios and servicing load over time." },
  "leverage-level": { name: "Leverage level", description: "Measure leverage using assets, liabilities, and equity." },
  "total-salary-income": { name: "Total salary and total income", description: "Add up base pay, bonuses, and additional income streams." },
  "debt-payoff-priority": { name: "Debt payoff priority", description: "Order your debts by interest rate or balance size." },
  "retirement-contribution-requirement": { name: "Retirement contribution requirement", description: "Estimate contribution levels based on retirement targets." },
  "investment-real-return": { name: "Investment real return", description: "Adjust returns for inflation to see real purchasing power." },
  "big-purchase-tco": { name: "Big purchase TCO", description: "Account for maintenance, taxes, and ongoing costs." },
  "hourly-value": { name: "Your hourly value", description: "Estimate your true hourly earnings from salary and hours." },
  "rent-vs-buy-break-even": { name: "Rent vs buy break even", description: "Compare renting and buying over a timeline." },
  "extra-payment-roi": { name: "Extra payment ROI", description: "Measure interest savings from extra payments." },
  "true-car-cost": { name: "True car cost", description: "Include insurance, fuel, depreciation, and upkeep." },
  "tax-drag-raises": { name: "Tax drag on raises", description: "See how taxes affect net raise amounts." },
  "interest-cost-over-time": { name: "Interest cost over time", description: "View total interest paid as a timeline." },
  "debt-snowball-timeline": { name: "Debt snowball timeline", description: "Track snowball payoff milestones." },
};

function FieldInput({ label, value, onChangeText, placeholder, colors }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

function ResultBox({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ backgroundColor: colors.muted, borderRadius: 8, padding: 16, gap: 4 }}>
      <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>{label}</Text>
      <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground }}>{value}</Text>
    </View>
  );
}

export default function ToolDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const styles = makeStyles(colors);

  const [principal, setPrincipal] = useState("350000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");
  const [cashflows, setCashflows] = useState("-10000, 2000, 3000, 4000, 5000");
  const [npvRate, setNpvRate] = useState("0.08");

  const monthlyPayment = useMemo(() => {
    const p = Number(principal), r = Number(rate), y = Number(term);
    if (!isFinite(p) || !isFinite(r) || !isFinite(y) || y === 0) return 0;
    return calculateMortgage(p, r, y);
  }, [principal, rate, term]);

  const amortRows = useMemo(() => {
    const p = Number(principal), r = Number(rate), y = Number(term);
    if (!isFinite(p) || !isFinite(r) || !isFinite(y) || y === 0) return [];
    return buildAmortization(p, r, y).slice(0, 12);
  }, [principal, rate, term]);

  const parsedCashflows = useMemo(() =>
    cashflows.split(",").map((v) => Number(v.trim())).filter((v) => isFinite(v)),
    [cashflows]);

  const irrValue = useMemo(() => parsedCashflows.length > 0 ? irrCalc(parsedCashflows) : 0, [parsedCashflows]);
  const npvValue = useMemo(() => {
    const r = Number(npvRate);
    if (!isFinite(r)) return 0;
    return npvCalc(r, parsedCashflows);
  }, [npvRate, parsedCashflows]);

  const isKnown = ["mortgage-calculator", "irr-calculator", "npv-calculator"].includes(slug ?? "");
  const extra = EXTRA_TOOLS[slug ?? ""];

  if (!slug) return null;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">

        {!isKnown && !extra && (
          <View style={styles.card}>
            <View style={styles.emptyState}>
              <Feather name="alert-circle" size={28} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Tool not found.</Text>
            </View>
          </View>
        )}

        {extra && !isKnown && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{extra.name}</Text>
            <Text style={styles.cardBody}>{extra.description}</Text>
            <Text style={styles.cardBody}>
              This calculator is queued for implementation. In the meantime, use the personal finance sections to log the underlying data for this tool.
            </Text>
          </View>
        )}

        {slug === "mortgage-calculator" && (
          <View style={[styles.card, { gap: 16 }]}>
            <Text style={styles.cardTitle}>Mortgage calculator</Text>
            <FieldInput label="Loan amount" value={principal} onChangeText={setPrincipal} placeholder="350000" colors={colors} />
            <FieldInput label="Interest rate (%)" value={rate} onChangeText={setRate} placeholder="6.5" colors={colors} />
            <FieldInput label="Term (years)" value={term} onChangeText={setTerm} placeholder="30" colors={colors} />
            <ResultBox label="Monthly payment" value={`$${fmt(monthlyPayment)}`} colors={colors} />

            {amortRows.length > 0 && (
              <View style={styles.tableWrap}>
                <Text style={styles.tableTitle}>First 12 months</Text>
                <View style={styles.tableHeader}>
                  {["Mo", "Payment", "Principal", "Interest", "Balance"].map((h) => (
                    <Text key={h} style={styles.tableHead}>{h}</Text>
                  ))}
                </View>
                {amortRows.map((row) => (
                  <View key={row.month} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{row.month}</Text>
                    <Text style={styles.tableCell}>${fmt(row.payment)}</Text>
                    <Text style={styles.tableCell}>${fmt(row.principalPaid)}</Text>
                    <Text style={styles.tableCell}>${fmt(row.interest)}</Text>
                    <Text style={styles.tableCell}>${fmt(row.balance)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {slug === "irr-calculator" && (
          <View style={[styles.card, { gap: 16 }]}>
            <Text style={styles.cardTitle}>IRR calculator</Text>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>Cash flows (comma-separated)</Text>
              <TextInput
                style={[{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, height: 80, textAlignVertical: "top" }]}
                value={cashflows}
                onChangeText={setCashflows}
                placeholder="-10000, 2000, 3000, 4000, 5000"
                placeholderTextColor={colors.mutedForeground}
                multiline
              />
            </View>
            <ResultBox label="IRR" value={`${(irrValue * 100).toFixed(2)}%`} colors={colors} />
          </View>
        )}

        {slug === "npv-calculator" && (
          <View style={[styles.card, { gap: 16 }]}>
            <Text style={styles.cardTitle}>NPV calculator</Text>
            <FieldInput label="Discount rate (decimal, e.g. 0.08)" value={npvRate} onChangeText={setNpvRate} placeholder="0.08" colors={colors} />
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>Cash flows (comma-separated)</Text>
              <TextInput
                style={[{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, height: 80, textAlignVertical: "top" }]}
                value={cashflows}
                onChangeText={setCashflows}
                placeholder="-10000, 2000, 3000, 4000, 5000"
                placeholderTextColor={colors.mutedForeground}
                multiline
              />
            </View>
            <ResultBox label="NPV" value={`$${fmt(npvValue)}`} colors={colors} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16, paddingBottom: 60 },
    card: { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 20 },
    cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 },
    cardBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 8 },
    emptyState: { alignItems: "center", paddingVertical: 20, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    tableWrap: { gap: 4 },
    tableTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    tableHeader: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHead: { flex: 1, fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textAlign: "right" },
    tableRow: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    tableCell: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: colors.foreground, textAlign: "right" },
  });
}
