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

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Ratio {
  id: string;
  name: string;
  value?: number;
  benchmark?: number;
  description?: string;
  category?: string;
}

export default function RatiosScreen() {
  const colors = useColors();
  const [ratios, setRatios] = useState<Ratio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/api/user/ratios");
      const data = await res.json().catch(() => ({ ratios: [] }));
      setRatios(data.ratios ?? []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      data={ratios}
      keyExtractor={(r) => r.id}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const isGood = item.value != null && item.benchmark != null ? item.value >= item.benchmark : null;
        return (
          <View style={styles.ratioRow}>
            <View style={styles.ratioInfo}>
              <Text style={styles.ratioName}>{item.name}</Text>
              {item.category ? <Text style={styles.ratioCategory}>{item.category}</Text> : null}
              {item.description ? <Text style={styles.ratioDesc} numberOfLines={2}>{item.description}</Text> : null}
            </View>
            <View style={styles.ratioValues}>
              {item.value != null ? (
                <Text style={[styles.ratioValue, isGood === true && { color: colors.success }, isGood === false && { color: colors.destructive }]}>
                  {item.value.toFixed(2)}
                </Text>
              ) : <Text style={styles.ratioValue}>—</Text>}
              {item.benchmark != null ? (
                <Text style={styles.ratioBenchmark}>Target: {item.benchmark.toFixed(2)}</Text>
              ) : null}
            </View>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No ratios available</Text>
          <Text style={styles.emptyBody}>Financial ratios for your portfolio will appear here</Text>
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
    ratioRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    ratioInfo: { flex: 1, gap: 3 },
    ratioName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    ratioCategory: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.3 },
    ratioDesc: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 },
    ratioValues: { alignItems: "flex-end", gap: 3 },
    ratioValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    ratioBenchmark: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
