import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Headline {
  id: string;
  title: string;
  url?: string;
  summary?: string;
  source?: string;
  fetchedAt?: string;
  tags?: string[];
  countryTags?: string[];
}

type FilterMode = "for-you" | "all";

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

function openArticle(url?: string) {
  if (!url) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  Linking.openURL(url);
}

function HeadlineCard({ item, colors }: { item: Headline; colors: ReturnType<typeof useColors> }) {
  const tags = [...(item.countryTags ?? []), ...(item.tags ?? [])].slice(0, 3);
  return (
    <Pressable
      onPress={() => openArticle(item.url)}
      style={({ pressed }) => [{
        backgroundColor: colors.card,
        borderRadius: colors.radius,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginHorizontal: 12,
        marginVertical: 4,
        opacity: pressed ? 0.82 : 1,
      }]}
    >
      {/* Source + time row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {item.source ?? "News"}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          {timeAgo(item.fetchedAt)}
        </Text>
      </View>

      {/* Headline */}
      <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 22, marginBottom: 8 }} numberOfLines={3}>
        {item.title}
      </Text>

      {/* Summary */}
      {item.summary ? (
        <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 10 }} numberOfLines={2}>
          {item.summary}
        </Text>
      ) : null}

      {/* Tags */}
      {tags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {tags.map((tag) => (
            <View key={tag} style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.muted, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Read full article */}
      {item.url && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
          <Feather name="external-link" size={12} color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Inter_500Medium" }}>Read full article</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function HeadlinesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FilterMode>("for-you");
  const [total, setTotal] = useState(0);

  const styles = makeStyles(colors);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      // /api/headlines returns interest-filtered news; fall back to all for "all" tab
      const endpoint = mode === "for-you"
        ? "/api/headlines?limit=60"
        : "/api/headlines?limit=60&all=1";
      const res = await apiFetch(endpoint);
      const data = await res.json().catch(() => ({ headlines: [] }));
      setItems(data.headlines ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("Failed to load headlines");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>News</Text>
        <Text style={styles.headerCount}>{total > 0 ? `${total} articles` : ""}</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {(["for-you", "all"] as FilterMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.tab, mode === m && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === "for-you" ? "For You" : "All News"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <HeadlineCard item={item} colors={colors} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="rss" size={32} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>
                {mode === "for-you" ? "No personalized news yet" : "No headlines available"}
              </Text>
              <Text style={styles.emptyBody}>
                {mode === "for-you"
                  ? "Add countries and topics to your interests to get personalised headlines."
                  : "Pull down to refresh or check back shortly."}
              </Text>
              {mode === "for-you" && (
                <Pressable onPress={() => router.push("/interests")} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Set interests</Text>
                </Pressable>
              )}
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
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    headerCount: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    tabRow: {
      flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    tab: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      backgroundColor: colors.muted,
    },
    tabActive: { backgroundColor: colors.foreground },
    tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    tabTextActive: { color: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    listContent: { paddingTop: 8, paddingBottom: 100 },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 14, paddingHorizontal: 36 },
    emptyIcon: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      alignItems: "center", justifyContent: "center",
    },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}
