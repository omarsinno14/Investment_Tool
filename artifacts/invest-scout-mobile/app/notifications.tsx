import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Notif {
  id: string;
  type: string;
  data?: Record<string, any>;
  readAt?: string | null;
  createdAt?: string;
}

type Group = { title: string; key: string; data: Notif[] };

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function groupLabel(type: string): string {
  if (type.includes("FOLLOW")) return "Follows";
  if (type.includes("LIKE") || type.includes("REACT")) return "Reactions";
  if (type.includes("COMMENT")) return "Comments";
  if (type.includes("MESSAGE")) return "Messages";
  if (type.includes("OPPORTUNITY") || type.includes("DEAL")) return "Deals";
  return "Activity";
}

function groupOrder(key: string): number {
  const order: Record<string, number> = { Messages: 0, Comments: 1, Reactions: 2, Follows: 3, Deals: 4, Activity: 5 };
  return order[key] ?? 99;
}

function notifIcon(type: string): keyof typeof Feather.glyphMap {
  if (type.includes("FOLLOW")) return "user-plus";
  if (type.includes("LIKE") || type.includes("REACT")) return "heart";
  if (type.includes("COMMENT")) return "message-circle";
  if (type.includes("MESSAGE")) return "mail";
  if (type.includes("OPPORTUNITY") || type.includes("DEAL")) return "trending-up";
  return "bell";
}

function deepLink(notif: Notif) {
  const d = notif.data ?? {};
  const type = notif.type;
  if (type.includes("OPPORTUNITY") || type.includes("DEAL")) {
    if (d.opportunityId) return router.push(`/opportunity/${d.opportunityId}`);
  }
  if (type.includes("COMMENT") || type.includes("REACT") || type.includes("LIKE")) {
    if (d.forumPostId) return router.push(`/forum/${d.forumPostId}`);
    if (d.opportunityId) return router.push(`/opportunity/${d.opportunityId}`);
  }
  if (type.includes("MESSAGE")) {
    if (d.conversationId) return router.push(`/conversation/${d.conversationId}`);
  }
  if (type.includes("FOLLOW")) {
    if (d.fromUserId) return router.push(`/user/${d.fromUserId}`);
  }
}

function buildGroups(notifs: Notif[]): Group[] {
  const map: Record<string, Notif[]> = {};
  for (const n of notifs) {
    const key = groupLabel(n.type);
    if (!map[key]) map[key] = [];
    map[key].push(n);
  }
  return Object.entries(map)
    .map(([key, data]) => ({ title: key, key, data }))
    .sort((a, b) => groupOrder(a.key) - groupOrder(b.key));
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/notifications?limit=50");
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

  async function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    await apiFetch(`/api/user/notifications/${id}/read`, { method: "POST" }).catch(() => {});
  }

  async function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await apiFetch("/api/user/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  const unread = notifs.filter((n) => !n.readAt).length;
  const groups = buildGroups(notifs);

  function renderItem({ item }: { item: Notif }) {
    const isUnread = !item.readAt;
    const canDeepLink = !!(item.data?.opportunityId || item.data?.forumPostId || item.data?.conversationId || item.data?.fromUserId);
    const body = item.data?.body ?? item.data?.message ?? item.data?.text ?? null;
    return (
      <Pressable
        onPress={() => {
          if (isUnread) markRead(item.id);
          if (canDeepLink) deepLink(item);
        }}
        style={({ pressed }) => [
          styles.notifRow,
          isUnread && styles.notifUnread,
          pressed && { opacity: 0.75 },
        ]}
      >
        <View style={[styles.iconCircle, isUnread && styles.iconCircleActive]}>
          <Feather name={notifIcon(item.type)} size={17} color={isUnread ? colors.primaryForeground : colors.mutedForeground} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTypeText, isUnread && styles.notifTypeUnread]}>
            {item.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
          {body ? (
            <Text style={styles.notifBody} numberOfLines={2}>{body}</Text>
          ) : null}
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <View style={styles.notifRight}>
          {isUnread && <View style={styles.unreadDot} />}
          {canDeepLink && <Feather name="chevron-right" size={14} color={colors.mutedForeground} />}
        </View>
      </Pressable>
    );
  }

  function renderSectionHeader({ section }: { section: Group }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <View style={styles.sectionHeaderLine} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unread > 0 && (
          <Pressable onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : notifs.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Feather name="bell" size={32} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptyBody}>New deal activity, comments, and follows will appear here.</Text>
        </View>
      ) : (
        <SectionList
          sections={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            unread > 0 ? (
              <View style={styles.unreadBanner}>
                <View style={styles.unreadBannerDot} />
                <Text style={styles.unreadBannerText}>{unread} unread</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    markAllBtn: {
      paddingHorizontal: 12, paddingVertical: 6,
      backgroundColor: colors.muted, borderRadius: 20,
    },
    markAllText: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" },
    unreadBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 16, paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    unreadBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    unreadBannerText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    sectionHeader: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
    },
    sectionHeaderText: {
      fontSize: 11, fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8,
    },
    sectionHeaderLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    notifRow: {
      flexDirection: "row", alignItems: "flex-start",
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
      backgroundColor: colors.card,
    },
    notifUnread: { backgroundColor: colors.card },
    iconCircle: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    iconCircleActive: { backgroundColor: colors.primary },
    notifContent: { flex: 1, gap: 3 },
    notifTypeText: {
      fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground,
    },
    notifTypeUnread: { fontFamily: "Inter_600SemiBold", color: colors.foreground },
    notifBody: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 19 },
    notifTime: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    notifRight: { alignItems: "center", gap: 6, paddingTop: 2 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    listContent: { paddingBottom: 60 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
    emptyIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border,
      alignItems: "center", justifyContent: "center",
    },
    emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}
