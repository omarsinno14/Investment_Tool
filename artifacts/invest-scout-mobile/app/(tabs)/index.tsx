import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
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
  createdByUser?: { profile?: { name?: string; username?: string } };
  createdAt?: string;
  fetchedAt?: string;
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
  const isOpp = item.kind === "opportunity";
  const authorName = item.createdByUser?.profile?.name ?? item.author?.name;
  return (
    <Pressable
      style={({ pressed }) => [{
        padding: 16, marginHorizontal: 12, marginVertical: 4,
        backgroundColor: colors.card,
        borderRadius: colors.radius,
        borderWidth: 1, borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
      }]}
      onPress={() => {
        if (isOpp) router.push(`/opportunity/${item.id}`);
        else router.push(`/forum/${item.id}`);
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 4,
          paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
          backgroundColor: isOpp ? colors.primary : colors.muted,
        }}>
          <Feather name={isOpp ? "trending-up" : "message-square"} size={11} color={isOpp ? colors.primaryForeground : colors.mutedForeground} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: isOpp ? colors.primaryForeground : colors.mutedForeground }}>
            {isOpp ? "Deal" : "Forum"}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{timeAgo(item.fetchedAt ?? item.createdAt)}</Text>
      </View>
      <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 22, marginBottom: 6 }} numberOfLines={2}>
        {item.title}
      </Text>
      {(item.summary ?? item.body) ? (
        <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 10 }} numberOfLines={2}>
          {item.summary ?? item.body}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {authorName ? <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>{authorName}</Text> : <View />}
        {isOpp && item.askAmount ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.muted, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
              {item.askCurrency ?? "USD"} {Number(item.askAmount).toLocaleString()}
            </Text>
          </View>
        ) : null}
        {!isOpp && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name="heart" size={13} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{item._count?.reactions ?? 0}</Text>
            <Feather name="message-circle" size={13} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{item._count?.comments ?? 0}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function FABMenu({ colors, onClose }: { colors: ReturnType<typeof useColors>; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 200 }).start();
  }, [scale]);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={onClose}>
        <Animated.View style={{ position: "absolute", bottom: 110, right: 20, gap: 12, transform: [{ scale }] }}>
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}
            onPress={() => { onClose(); router.push("/post-discussion"); }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
              <Feather name="message-square" size={18} color={colors.foreground} />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>New Discussion</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Ask a question or share a view</Text>
            </View>
          </Pressable>
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}
            onPress={() => { onClose(); router.push("/post-deal"); }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.foreground, alignItems: "center", justifyContent: "center" }}>
              <Feather name="trending-up" size={18} color={colors.background} />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Post a Deal</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Share an investment opportunity</Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFAB, setShowFAB] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;

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
      const merged = [...opps, ...forums].sort((a, b) => new Date(b.fetchedAt ?? b.createdAt ?? 0).getTime() - new Date(a.fetchedAt ?? a.createdAt ?? 0).getTime());
      setItems(merged);
    } catch {
      setError("Failed to load feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const pollNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("/api/user/notifications?limit=1");
      const data = await res.json().catch(() => ({}));
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    pollNotifications();
    const interval = setInterval(pollNotifications, 60_000);
    return () => clearInterval(interval);
  }, [pollNotifications]);

  function pressFab() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(fabScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    setShowFAB(true);
  }

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Pressable onPress={() => router.push("/notifications")} style={styles.headerBtn}>
            <Feather name="bell" size={22} color={colors.foreground} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

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

      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <Pressable onPress={pressFab} style={styles.fabInner}>
          <Feather name="plus" size={24} color={colors.background} />
        </Pressable>
      </Animated.View>

      {showFAB && <FABMenu colors={colors} onClose={() => setShowFAB(false)} />}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    headerBtn: { padding: 4, position: "relative" },
    badge: { position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
    badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: colors.primaryForeground },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    listContent: { paddingVertical: 8, paddingBottom: 120 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    fab: { position: "absolute", bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.foreground, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    fabInner: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  });
}
