import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface ActivityItem {
  id: string;
  type: string;
  body?: string;
  actor?: { name?: string; username?: string };
  createdAt?: string;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function activityIcon(type: string): string {
  if (type.includes("FOLLOW")) return "user-plus";
  if (type.includes("LIKE") || type.includes("REACT")) return "heart";
  if (type.includes("COMMENT")) return "message-circle";
  if (type.includes("OPPORTUNITY")) return "trending-up";
  return "activity";
}

export default function ActivityScreen() {
  const colors = useColors();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/activity");
      const data = await res.json().catch(() => ({ activities: [], notifications: [] }));
      setItems(data.activities ?? data.notifications ?? []);
    } catch {
      setError("Failed to load activity");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={styles.icon}>
                <Feather name={activityIcon(item.type) as any} size={18} color={colors.mutedForeground} />
              </View>
              <View style={styles.content}>
                <Text style={styles.typeText}>{item.type.replace(/_/g, " ")}</Text>
                {item.body ? <Text style={styles.body} numberOfLines={2}>{item.body}</Text> : null}
                {item.actor?.name ? <Text style={styles.actor}>{item.actor.name}</Text> : null}
              </View>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="activity" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyBody}>Your recent activity will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    listContent: { paddingBottom: 40 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    itemRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    content: { flex: 1, gap: 3 },
    typeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, textTransform: "capitalize" },
    body: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 },
    actor: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    time: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", paddingTop: 2 },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
