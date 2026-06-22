import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenError } from "@/components/ScreenError";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface CashflowEntry {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category?: string;
  date?: string;
  currency?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CashflowScreen() {
  const colors = useColors();
  const [entries, setEntries] = useState<CashflowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/cashflow");
      const data = await res.json().catch(() => ({ entries: [] }));
      setEntries(data.entries ?? data.cashflow ?? []);
    } catch {
      setError("Couldn't load your cash flow");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const income = entries.filter((e) => e.type === "INCOME").reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter((e) => e.type === "EXPENSE").reduce((s, e) => s + e.amount, 0);
  const net = income - expense;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error) return <ScreenError message={error} onRetry={load} />;

  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => e.id}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        entries.length > 0 ? (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>+{income.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={[styles.summaryValue, { color: colors.destructive }]}>-{expense.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net</Text>
                <Text style={[styles.summaryValue, { color: net >= 0 ? colors.success : colors.destructive }]}>
                  {net >= 0 ? "+" : ""}{net.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.entryRow}>
          <View style={[styles.entryIcon, { backgroundColor: item.type === "INCOME" ? colors.success + "20" : colors.destructive + "20" }]}>
            <Feather name={item.type === "INCOME" ? "arrow-down-left" : "arrow-up-right"} size={16} color={item.type === "INCOME" ? colors.success : colors.destructive} />
          </View>
          <View style={styles.entryInfo}>
            <Text style={styles.entryDesc}>{item.description}</Text>
            {item.category ? <Text style={styles.entryCategory}>{item.category}</Text> : null}
            <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
          </View>
          <Text style={[styles.entryAmount, { color: item.type === "INCOME" ? colors.success : colors.destructive }]}>
            {item.type === "INCOME" ? "+" : "-"}{item.currency ?? "USD"} {item.amount.toLocaleString()}
          </Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="dollar-sign" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No cashflow entries</Text>
          <Text style={styles.emptyBody}>Track your income and expenses here</Text>
        </View>
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingBottom: 60 },
    summary: { padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    summaryRow: { flexDirection: "row", alignItems: "center" },
    summaryItem: { flex: 1, alignItems: "center", gap: 4 },
    summaryLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
    summaryDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    entryRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    entryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    entryInfo: { flex: 1, gap: 2 },
    entryDesc: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground },
    entryCategory: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    entryDate: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    entryAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
