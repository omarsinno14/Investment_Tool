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

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  currency?: string;
  targetDate?: string;
  status?: string;
}

function ProgressBar({ progress, colors }: { progress: number; colors: ReturnType<typeof useColors> }) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" }}>
      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 3 }} />
    </View>
  );
}

export default function GoalsScreen() {
  const colors = useColors();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/goals");
      const data = await res.json().catch(() => ({ goals: [] }));
      setGoals(data.goals ?? []);
    } catch {
      setError("Couldn't load your goals");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error) return <ScreenError message={error} onRetry={load} />;

  return (
    <FlatList
      data={goals}
      keyExtractor={(g) => g.id}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const progress = item.targetAmount ? (item.currentAmount ?? 0) / item.targetAmount : 0;
        return (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>{item.title}</Text>
              {item.status ? (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              ) : null}
            </View>
            {item.description ? <Text style={styles.goalDesc} numberOfLines={2}>{item.description}</Text> : null}
            {item.targetAmount ? (
              <>
                <ProgressBar progress={progress} colors={colors} />
                <View style={styles.amountRow}>
                  <Text style={styles.currentAmount}>{item.currency ?? "USD"} {(item.currentAmount ?? 0).toLocaleString()}</Text>
                  <Text style={styles.targetAmount}>of {(item.targetAmount).toLocaleString()}</Text>
                </View>
              </>
            ) : null}
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="target" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptyBody}>Set financial goals to track your investment progress</Text>
        </View>
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingBottom: 60 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    goalCard: { padding: 16, gap: 10 },
    goalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    goalTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 },
    statusBadge: { backgroundColor: colors.muted, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    statusText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
    goalDesc: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    amountRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    currentAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    targetAmount: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
