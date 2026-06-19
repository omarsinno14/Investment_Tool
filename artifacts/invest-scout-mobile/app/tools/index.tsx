import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const TOOLS = [
  { slug: "mortgage-calculator", name: "Mortgage calculator", description: "Estimate monthly payments and export amortization tables." },
  { slug: "irr-calculator", name: "IRR calculator", description: "Calculate internal rate of return for multi-year cashflows." },
  { slug: "npv-calculator", name: "NPV calculator", description: "Discount future cashflows to understand present value." },
  { slug: "budget-split-50-30-20", name: "50/30/20 budget split", description: "Split take-home pay into needs, wants, and savings targets." },
  { slug: "debt-income-service", name: "Debt to income and debt to service", description: "Compare total debt and servicing costs against income." },
  { slug: "leverage-level", name: "Leverage level", description: "Gauge leverage from total assets and liabilities." },
  { slug: "total-salary-income", name: "Total salary and total income", description: "Combine salary, bonuses, and side income in one view." },
  { slug: "debt-payoff-priority", name: "Debt payoff priority", description: "Rank debts to focus payments based on interest or balance." },
  { slug: "retirement-contribution-requirement", name: "Retirement contribution requirement", description: "Estimate how much to contribute based on goal and timeline." },
  { slug: "investment-real-return", name: "Investment real return", description: "Convert nominal returns into inflation-adjusted results." },
  { slug: "big-purchase-tco", name: "Big purchase TCO", description: "Estimate total cost of ownership for major purchases." },
  { slug: "hourly-value", name: "Your hourly value", description: "Calculate your effective hourly rate from income and hours." },
  { slug: "rent-vs-buy-break-even", name: "Rent vs buy break even", description: "Estimate when buying outperforms renting over time." },
  { slug: "extra-payment-roi", name: "Extra payment ROI", description: "Measure interest saved from extra debt payments." },
  { slug: "true-car-cost", name: "True car cost", description: "Model a full vehicle cost including insurance and upkeep." },
  { slug: "tax-drag-raises", name: "Tax drag on raises", description: "See how taxes affect take-home raise amounts." },
  { slug: "interest-cost-over-time", name: "Interest cost over time", description: "Visualize total interest paid across a timeline." },
  { slug: "debt-snowball-timeline", name: "Debt snowball timeline", description: "Track payoff progress with a snowball schedule." },
];

export default function ToolsScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const styles = makeStyles(colors);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter((t) => `${t.name} ${t.description}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search tools..."
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
        />
        {query ? (
          <Pressable onPress={() => setQuery("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.slug}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.toolCard, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push(`/tools/${item.slug}`)}
          >
            <View style={styles.toolIcon}>
              <Feather name="tool" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolName}>{item.name}</Text>
              <Text style={styles.toolDesc} numberOfLines={2}>{item.description}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No tools match "{query}"</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 10, margin: 16, backgroundColor: colors.muted, borderRadius: colors.radius, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    listContent: { paddingBottom: 60 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
    toolCard: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    toolIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    toolInfo: { flex: 1, gap: 3 },
    toolName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    toolDesc: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 },
    emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
