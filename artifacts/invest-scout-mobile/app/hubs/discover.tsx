import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
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
  description?: string | null;
  isPrivate: boolean;
  isMember?: boolean;
  _count?: { memberships: number; posts: number };
}

const TABS = [
  { key: "all", label: "All Hubs" },
  { key: "mine", label: "My Hubs" },
  { key: "featured", label: "Featured" },
];

const FEATURED_SLUGS = ["vertica", "news", "deals", "private-equity", "venture-capital", "real-estate", "africa"];

function HubCard({ hub, onJoin, colors }: { hub: Hub; onJoin: (id: string) => void; colors: ReturnType<typeof useColors> }) {
  const memberCount = hub._count?.memberships ?? 0;
  const postCount = hub._count?.posts ?? 0;
  const initial = hub.name.charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/hub/${hub.slug}`);
      }}
      style={({ pressed }) => [{
        backgroundColor: colors.card,
        borderRadius: colors.radius,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginHorizontal: 12,
        marginVertical: 4,
        opacity: pressed ? 0.85 : 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }]}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.primaryForeground }}>
          {initial}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }} numberOfLines={1}>
            {hub.name}
          </Text>
          {hub.isPrivate && (
            <Feather name="lock" size={12} color={colors.mutedForeground} />
          )}
        </View>
        {hub.description ? (
          <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 }} numberOfLines={2}>
            {hub.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Feather name="users" size={11} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {memberCount.toLocaleString()}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Feather name="message-square" size={11} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              {postCount.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onJoin(hub.id);
        }}
        style={({ pressed }) => [{
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 20,
          borderWidth: 1,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: hub.isMember ? colors.muted : colors.primary,
          borderColor: hub.isMember ? colors.border : colors.primary,
        }]}
      >
        <Text style={{
          fontSize: 13, fontFamily: "Inter_600SemiBold",
          color: hub.isMember ? colors.mutedForeground : colors.primaryForeground,
        }}>
          {hub.isMember ? "Joined" : "Join"}
        </Text>
      </Pressable>
    </Pressable>
  );
}

export default function HubDiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "mine" | "featured">("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = makeStyles(colors);

  const loadHubs = useCallback(async (q = "") => {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "100");
      const res = await apiFetch(`/api/hubs?${params.toString()}`);
      const data = await res.json().catch(() => ({ hubs: [] }));
      setHubs(data.hubs ?? []);
    } catch {
      setHubs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadHubs(""); }, [loadHubs]);

  function onSearchChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadHubs(text), 300);
  }

  async function toggleJoin(hubId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hub = hubs.find((h) => h.id === hubId);
    if (!hub) return;
    const wasMember = hub.isMember;
    setHubs((prev) => prev.map((h) => h.id === hubId ? { ...h, isMember: !wasMember } : h));
    try {
      await apiFetch(`/api/hubs/${hub.slug}/join`, { method: "POST" });
    } catch {
      setHubs((prev) => prev.map((h) => h.id === hubId ? { ...h, isMember: wasMember } : h));
    }
  }

  const displayed = hubs.filter((h) => {
    if (tab === "mine") return h.isMember;
    if (tab === "featured") return FEATURED_SLUGS.includes(h.slug);
    return true;
  });

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Discover Hubs</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onSearchChange}
          placeholder="Search countries, topics…"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(""); loadHubs(""); }} hitSlop={8} style={{ marginRight: 12 }}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key as any)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(h) => h.id}
          renderItem={({ item }) => <HubCard hub={item} onJoin={toggleJoin} colors={colors} />}
          contentContainerStyle={styles.listContent}
          onRefresh={() => { setRefreshing(true); loadHubs(query); }}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="globe" size={32} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>
                {tab === "mine" ? "You haven't joined any hubs yet" : "No hubs found"}
              </Text>
              <Text style={styles.emptyBody}>
                {tab === "mine"
                  ? "Join hubs to build your investment community."
                  : "Try a different search term."}
              </Text>
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
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    searchBar: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: colors.muted,
      borderRadius: 12, marginHorizontal: 12, marginVertical: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    searchInput: {
      flex: 1, paddingVertical: 11, paddingHorizontal: 8,
      fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground,
    },
    tabRow: {
      flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.muted },
    tabActive: { backgroundColor: colors.foreground },
    tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    tabTextActive: { color: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingTop: 8, paddingBottom: 100 },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 14, paddingHorizontal: 36 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}
