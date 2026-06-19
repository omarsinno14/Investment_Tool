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

interface PortfolioItem {
  id: string;
  name: string;
  type?: string;
  currentValue?: number;
  purchaseValue?: number;
  currency?: string;
}

export default function PortfolioScreen() {
  const colors = useColors();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/api/user/portfolio");
      const data = await res.json().catch(() => ({ items: [] }));
      setItems(data.items ?? data.portfolio ?? []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalValue = items.reduce((sum, i) => sum + (i.currentValue ?? 0), 0);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        items.length > 0 ? (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
            <Text style={styles.summaryValue}>USD {totalValue.toLocaleString()}</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const gain = item.currentValue && item.purchaseValue ? item.currentValue - item.purchaseValue : 0;
        const isPositive = gain >= 0;
        return (
          <View style={styles.itemRow}>
            <View style={styles.itemIcon}>
              <Feather name="pie-chart" size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.type ? <Text style={styles.itemType}>{item.type}</Text> : null}
            </View>
            <View style={styles.itemValues}>
              {item.currentValue ? (
                <Text style={styles.itemValue}>{item.currency ?? "USD"} {item.currentValue.toLocaleString()}</Text>
              ) : null}
              {gain !== 0 ? (
                <Text style={[styles.itemGain, { color: isPositive ? colors.success : colors.destructive }]}>
                  {isPositive ? "+" : ""}{gain.toLocaleString()}
                </Text>
              ) : null}
            </View>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="pie-chart" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No portfolio items</Text>
          <Text style={styles.emptyBody}>Add investments to track your portfolio performance</Text>
        </View>
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingBottom: 60 },
    summary: { padding: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 4 },
    summaryLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    summaryValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    itemIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    itemInfo: { flex: 1, gap: 2 },
    itemName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    itemType: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    itemValues: { alignItems: "flex-end", gap: 2 },
    itemValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    itemGain: { fontSize: 12, fontFamily: "Inter_500Medium" },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
