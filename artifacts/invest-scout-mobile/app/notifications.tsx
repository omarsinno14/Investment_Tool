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

interface Notif {
  id: string;
  type: string;
  body?: string;
  isRead?: boolean;
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

function notifIcon(type: string): string {
  if (type.includes("FOLLOW")) return "user-plus";
  if (type.includes("LIKE") || type.includes("REACT")) return "heart";
  if (type.includes("COMMENT")) return "message-circle";
  if (type.includes("MESSAGE")) return "mail";
  return "bell";
}

export default function NotificationsScreen() {
  const colors = useColors();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/notifications");
      const data = await res.json().catch(() => ({ notifications: [] }));
      setNotifs(data.notifications ?? []);
    } catch {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    await apiFetch("/api/user/notifications/read-all", { method: "POST" }).catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

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
          data={notifs}
          keyExtractor={(n) => n.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          ListHeaderComponent={
            notifs.some((n) => !n.isRead) ? (
              <Pressable onPress={markAllRead} style={styles.markAllBtn}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[styles.notifRow, !item.isRead && styles.notifUnread]}>
              <View style={[styles.notifIcon, !item.isRead && styles.notifIconActive]}>
                <Feather name={notifIcon(item.type) as any} size={18} color={!item.isRead ? colors.primaryForeground : colors.mutedForeground} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifType}>{item.type.replace(/_/g, " ")}</Text>
                {item.body ? <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text> : null}
              </View>
              <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="bell" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyBody}>You're all caught up!</Text>
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
    markAllBtn: { paddingVertical: 12, alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    markAllText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primary },
    listContent: { paddingBottom: 40 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    notifRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    notifUnread: { backgroundColor: colors.muted + "60" },
    notifIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    notifIconActive: { backgroundColor: colors.primary },
    notifContent: { flex: 1, gap: 3 },
    notifType: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, textTransform: "capitalize" },
    notifBody: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 },
    notifTime: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", paddingTop: 2 },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
