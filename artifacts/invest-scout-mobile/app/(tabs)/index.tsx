import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface FeedItem {
  id: string;
  kind: "opportunity" | "forum";
  title: string;
  summary?: string;
  body?: string;
  tags?: string[];
  askAmount?: number;
  askCurrency?: string;
  author?: { name?: string; username?: string };
  createdAt?: string;
  _count?: { reactions?: number; comments?: number };
}

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

function FeedCard({ item, colors }: { item: FeedItem; colors: ReturnType<typeof useColors> }) {
  const styles = makeStyles(colors);
  const isOpp = item.kind === "opportunity";
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
      onPress={() => {
        if (isOpp) router.push(`/opportunity/${item.id}`);
        else router.push(`/forum/${item.id}`);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.kindBadge, { backgroundColor: isOpp ? colors.primary : colors.secondary }]}>
          <Feather name={isOpp ? "trending-up" : "message-square"} size={11} color={isOpp ? colors.primaryForeground : colors.mutedForeground} />
          <Text style={[styles.kindBadgeText, { color: isOpp ? colors.primaryForeground : colors.mutedForeground }]}>
            {isOpp ? "Deal" : "Forum"}
          </Text>
        </View>
        <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      {(item.summary || item.body) ? (
        <Text style={styles.cardBody} numberOfLines={2}>{item.summary ?? item.body}</Text>
      ) : null}
      <View style={styles.cardFooter}>
        {item.author?.name ? (
          <Text style={styles.authorText}>{item.author.name}</Text>
        ) : null}
        {isOpp && item.askAmount ? (
          <Text style={styles.amountText}>
            {item.askCurrency ?? "USD"} {Number(item.askAmount).toLocaleString()}
          </Text>
        ) : null}
        {!isOpp && (
          <View style={styles.statsRow}>
            <Feather name="heart" size={13} color={colors.mutedForeground} />
            <Text style={styles.statText}>{item._count?.reactions ?? 0}</Text>
            <Feather name="message-circle" size={13} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
            <Text style={styles.statText}>{item._count?.comments ?? 0}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [oppRes, forumRes] = await Promise.all([
        apiFetch("/api/opportunities?type=community&limit=20"),
        apiFetch("/api/forums?limit=20"),
      ]);
      const oppData = await oppRes.json().catch(() => ({ opportunities: [] }));
      const forumData = await forumRes.json().catch(() => ({ posts: [] }));
      const opps: FeedItem[] = (oppData.opportunities ?? []).map((o: any) => ({ ...o, kind: "opportunity" as const }));
      const forums: FeedItem[] = (forumData.posts ?? []).map((f: any) => ({ ...f, kind: "forum" as const }));
      const merged = [...opps, ...forums].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      setItems(merged);
    } catch (e: any) {
      setError("Failed to load feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <Pressable onPress={() => router.push("/notifications")} style={styles.headerBtn}>
          <Feather name="bell" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => `${i.kind}-${i.id}`}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <FeedCard item={item} colors={colors} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Feed is empty</Text>
              <Text style={styles.emptyBody}>Check back soon for new deals and discussions</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    headerBtn: { padding: 4 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    listContent: { paddingVertical: 8, paddingBottom: 100 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    card: { padding: 16, marginHorizontal: 16, marginVertical: 2 },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    kindBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    kindBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    timeText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 22, marginBottom: 6 },
    cardBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 8 },
    cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    authorText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    amountText: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    statsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    statText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
