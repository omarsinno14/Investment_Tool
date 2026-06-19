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

interface Hub {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  isMember?: boolean;
  _count?: { members?: number; posts?: number };
}

function HubCard({ item, colors }: { item: Hub; colors: ReturnType<typeof useColors> }) {
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
      onPress={() => router.push(`/hub/${item.slug}`)}
    >
      <View style={styles.cardRow}>
        <View style={styles.hubAvatar}>
          <Text style={styles.hubAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            {item.isMember && (
              <View style={styles.memberBadge}>
                <Text style={styles.memberText}>Member</Text>
              </View>
            )}
          </View>
          {item.description ? (
            <Text style={styles.cardBody} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Feather name="users" size={12} color={colors.mutedForeground} />
            <Text style={styles.metaText}>{item._count?.members ?? 0} members</Text>
            <Feather name="file-text" size={12} color={colors.mutedForeground} style={{ marginLeft: 10 }} />
            <Text style={styles.metaText}>{item._count?.posts ?? 0} posts</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function HubsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/hubs");
      const data = await res.json().catch(() => ({ hubs: [] }));
      setHubs(data.hubs ?? []);
    } catch {
      setError("Failed to load hubs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = hubs.filter((h) =>
    !query || h.name.toLowerCase().includes(query.toLowerCase()) || (h.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hubs</Text>
      </View>
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search hubs..."
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
          renderItem={({ item }) => <HubCard item={item} colors={colors} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>{query ? "No results" : "No hubs yet"}</Text>
              <Text style={styles.emptyBody}>{query ? "Try a different search" : "Community hubs will appear here"}</Text>
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
    cardRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
    hubAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    hubAvatarText: { color: colors.primaryForeground, fontSize: 18, fontFamily: "Inter_700Bold" },
    cardInfo: { flex: 1, gap: 4 },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 },
    memberBadge: { backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    memberText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    cardBody: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    metaText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
