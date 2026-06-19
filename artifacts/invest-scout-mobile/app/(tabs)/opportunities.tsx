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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Opp {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  askAmount?: number;
  askCurrency?: string;
  stage?: string;
  type?: string;
  country?: string;
  author?: { name?: string };
  createdAt?: string;
  isBoosted?: boolean;
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

function OppCard({ item, colors }: { item: Opp; colors: ReturnType<typeof useColors> }) {
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
      onPress={() => router.push(`/opportunity/${item.id}`)}
    >
      {item.isBoosted && (
        <View style={styles.boostedBadge}>
          <Feather name="zap" size={10} color={colors.warning} />
          <Text style={[styles.boostedText, { color: colors.warning }]}>Featured</Text>
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      {item.summary ? <Text style={styles.cardBody} numberOfLines={2}>{item.summary}</Text> : null}
      <View style={styles.metaRow}>
        {item.askAmount ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.askCurrency ?? "USD"} {Number(item.askAmount).toLocaleString()}</Text>
          </View>
        ) : null}
        {item.stage ? (
          <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.chipText, { color: colors.secondaryForeground }]}>{item.stage}</Text>
          </View>
        ) : null}
        {item.country ? (
          <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.chipText, { color: colors.secondaryForeground }]}>{item.country}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.authorText}>{item.author?.name ?? "Anonymous"}</Text>
        <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function OpportunitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/opportunities?limit=50");
      const data = await res.json().catch(() => ({ opportunities: [] }));
      setOpps(data.opportunities ?? []);
    } catch {
      setError("Failed to load opportunities");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = opps.filter((o) =>
    !query || o.title.toLowerCase().includes(query.toLowerCase()) || (o.summary ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deals</Text>
      </View>
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search deals..."
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
        />
        {query ? (
          <Pressable onPress={() => setQuery("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
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
          data={filtered}
          keyExtractor={(i) => i.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <OppCard item={item} colors={colors} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="briefcase" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>{query ? "No results" : "No deals yet"}</Text>
              <Text style={styles.emptyBody}>{query ? "Try a different search" : "Investment deals will appear here"}</Text>
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
    header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginVertical: 10, backgroundColor: colors.muted, borderRadius: colors.radius, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    listContent: { paddingVertical: 8, paddingBottom: 100 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    card: { padding: 16, marginHorizontal: 4 },
    boostedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
    boostedText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 22, marginBottom: 6 },
    cardBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 10 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
    chip: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primary, borderRadius: 20 },
    chipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.primaryForeground },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    authorText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    timeText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
