import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

interface SavedArticle {
  id: string;
  url: string;
  title: string;
  source?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function openArticle(url?: string) {
  if (!url) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  Linking.openURL(url);
}

export default function SavedArticlesScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const [items, setItems] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/saved-articles");
      const data = await res.json().catch(() => ({ articles: [] }));
      setItems(data.articles ?? []);
    } catch {
      setError("Failed to load saved articles");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function unsave(url: string) {
    setItems((prev) => prev.filter((a) => a.url !== url));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await apiFetch(`/api/user/saved-articles?url=${encodeURIComponent(url)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch {
      load();
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => load()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Pressable style={{ flex: 1 }} onPress={() => openArticle(item.url)}>
            <View style={styles.metaRow}>
              <Text style={styles.source}>{item.source ?? "News"}</Text>
              <Text style={styles.date}>{fmtDate(item.publishedAt ?? item.createdAt)}</Text>
            </View>
            <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
            {item.url ? (
              <View style={styles.readRow}>
                <Feather name="external-link" size={12} color={colors.primary} />
                <Text style={styles.readText}>Read full article</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => unsave(item.url)} style={styles.bookmarkBtn} hitSlop={10}>
            <Feather name="bookmark" size={20} color={colors.primary} />
          </Pressable>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="bookmark" size={32} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No saved articles</Text>
          <Text style={styles.emptyBody}>Bookmark headlines from the News feed to read them later.</Text>
        </View>
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.background },
    errorText: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    listContent: { padding: 12, paddingBottom: 100, gap: 8 },
    card: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 16,
    },
    metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    source: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.accent, textTransform: "uppercase", letterSpacing: 0.5 },
    date: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    title: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 22, marginBottom: 8 },
    readRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    readText: { fontSize: 12, color: colors.primary, fontFamily: "Inter_500Medium" },
    bookmarkBtn: { padding: 2 },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 14, paddingHorizontal: 36 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}
