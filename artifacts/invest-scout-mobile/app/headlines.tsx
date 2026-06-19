import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
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

interface Headline {
  id: string;
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  fetchedAt?: string;
  tags?: string[];
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

export default function HeadlinesScreen() {
  const colors = useColors();
  const [items, setItems] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/opportunities?type=headlines&limit=50");
      const data = await res.json().catch(() => ({ opportunities: [] }));
      setItems(data.opportunities ?? []);
    } catch {
      setError("Failed to load headlines");
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
            <Pressable
              style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { if (item.url) Linking.openURL(item.url); }}
            >
              <View style={styles.cardHeader}>
                {item.source ? <Text style={styles.source}>{item.source}</Text> : null}
                <Text style={styles.time}>{timeAgo(item.publishedAt ?? item.fetchedAt)}</Text>
              </View>
              <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
              {item.summary ? <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text> : null}
              {item.url ? (
                <View style={styles.linkRow}>
                  <Feather name="external-link" size={12} color={colors.mutedForeground} />
                  <Text style={styles.linkText}>Read full article</Text>
                </View>
              ) : null}
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="rss" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No headlines</Text>
              <Text style={styles.emptyBody}>Investment news and headlines will appear here</Text>
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
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    card: { padding: 16, gap: 8 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    source: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.3 },
    time: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    title: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 22 },
    summary: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    linkRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    linkText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
