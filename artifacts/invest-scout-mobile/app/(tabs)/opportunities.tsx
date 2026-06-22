import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
  countryTags?: string[];
  askAmount?: number;
  askCurrency?: string;
  stage?: string;
  type?: string;
  country?: string;
  createdByUser?: { profile?: { name?: string; username?: string } };
  author?: { name?: string };
  fetchedAt?: string;
  createdAt?: string;
  isBoosted?: boolean;
  boostedUntil?: string;
}

type FilterType = "all" | "community" | "headlines";
type SortTab = "latest" | "trending";

const TYPE_FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "community", label: "Community" },
  { key: "headlines", label: "Headlines" },
];

const SORT_TABS: { key: SortTab; label: string }[] = [
  { key: "latest", label: "Latest" },
  { key: "trending", label: "Trending" },
];

const AMOUNT_RANGES = [
  { label: "Any", min: 0, max: Infinity },
  { label: "<$100K", min: 0, max: 100_000 },
  { label: "$100K–$1M", min: 100_000, max: 1_000_000 },
  { label: "$1M–$10M", min: 1_000_000, max: 10_000_000 },
  { label: ">$10M", min: 10_000_000, max: Infinity },
];

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function FilterChip({
  label, active, onPress, colors,
}: { label: string; active: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={[
        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: active ? colors.foreground : colors.background, borderColor: active ? colors.foreground : colors.border },
      ]}
    >
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: active ? colors.background : colors.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

function OppCard({ item, colors }: { item: Opp; colors: ReturnType<typeof useColors> }) {
  const authorName = item.createdByUser?.profile?.name ?? item.author?.name ?? "Anonymous";
  const isBoosted = item.isBoosted || (item.boostedUntil && new Date(item.boostedUntil) > new Date());
  return (
    <Pressable
      style={({ pressed }) => [{ padding: 16, marginHorizontal: 4, opacity: pressed ? 0.8 : 1 }]}
      onPress={() => router.push(`/opportunity/${item.id}`)}
    >
      {isBoosted && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
          <Feather name="zap" size={10} color={colors.bronze} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.bronze }}>Featured</Text>
        </View>
      )}
      <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 22, marginBottom: 6 }} numberOfLines={2}>
        {item.title}
      </Text>
      {item.summary ? (
        <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 10 }} numberOfLines={2}>
          {item.summary}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {item.askAmount ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.foreground, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.background }}>
              {item.askCurrency ?? "USD"} {Number(item.askAmount).toLocaleString()}
            </Text>
          </View>
        ) : null}
        {(item.countryTags ?? []).slice(0, 2).map((tag) => (
          <View key={tag} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.muted, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.foreground }}>{tag}</Text>
          </View>
        ))}
        {(item.tags ?? []).slice(0, 3).map((tag) => (
          <View key={tag} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.muted, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{tag}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>{authorName}</Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{timeAgo(item.fetchedAt ?? item.createdAt)}</Text>
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
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [sortTab, setSortTab] = useState<SortTab>("latest");
  const [amountRange, setAmountRange] = useState(0);
  const [tagFilter, setTagFilter] = useState<string>("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const styles = makeStyles(colors);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (sortTab === "trending") params.set("tab", "trending");
    if (query.trim()) params.set("q", query.trim());
    return `/api/opportunities?${params.toString()}`;
  }, [typeFilter, sortTab, query]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(buildUrl());
      const data = await res.json().catch(() => ({ opportunities: [] }));
      const items: Opp[] = data.opportunities ?? [];
      setOpps(items);
      const allTags = Array.from(new Set(items.flatMap((o) => [...(o.tags ?? []), ...(o.countryTags ?? [])])));
      setAvailableTags(allTags.slice(0, 20));
    } catch {
      setError("Failed to load deals");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildUrl]);

  useEffect(() => { load(); }, [load]);

  const range = AMOUNT_RANGES[amountRange];
  const filtered = opps.filter((o) => {
    if (tagFilter && !o.tags?.includes(tagFilter) && !o.countryTags?.includes(tagFilter)) return false;
    if (range.min > 0 || range.max < Infinity) {
      const amt = o.askAmount ?? 0;
      if (amt < range.min || amt > range.max) return false;
    }
    return true;
  });

  const activeFilterCount = (tagFilter ? 1 : 0) + (amountRange !== 0 ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Deals</Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Pressable
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilters((v) => !v); }}
          >
            <Feather name="sliders" size={15} color={showFilters ? colors.background : colors.foreground} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>
            )}
          </Pressable>
          <Pressable
            style={styles.postFab}
            onPress={() => router.push("/post-deal")}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={(t) => setQuery(t)}
          onSubmitEditing={() => load()}
          returnKeyType="search"
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
        {SORT_TABS.map((s) => (
          <FilterChip
            key={s.key}
            label={s.label}
            active={sortTab === s.key}
            onPress={() => setSortTab(s.key)}
            colors={colors}
          />
        ))}
        <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 4 }} />
        {TYPE_FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            active={typeFilter === f.key}
            onPress={() => setTypeFilter(f.key)}
            colors={colors}
          />
        ))}
      </ScrollView>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterPanelLabel}>Ask amount</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8 }}>
            {AMOUNT_RANGES.map((r, idx) => (
              <FilterChip key={r.label} label={r.label} active={amountRange === idx} onPress={() => setAmountRange(idx)} colors={colors} />
            ))}
          </ScrollView>

          {availableTags.length > 0 && (
            <>
              <Text style={[styles.filterPanelLabel, { marginTop: 10 }]}>Tags & regions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <FilterChip label="Any" active={!tagFilter} onPress={() => setTagFilter("")} colors={colors} />
                {availableTags.map((tag) => (
                  <FilterChip key={tag} label={tag} active={tagFilter === tag} onPress={() => setTagFilter(tagFilter === tag ? "" : tag)} colors={colors} />
                ))}
              </ScrollView>
            </>
          )}

          {activeFilterCount > 0 && (
            <Pressable
              onPress={() => { setAmountRange(0); setTagFilter(""); setTypeFilter("all"); }}
              style={styles.clearBtn}
            >
              <Text style={styles.clearBtnText}>Clear all filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
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
              <Text style={styles.emptyTitle}>{query || activeFilterCount > 0 ? "No results" : "No deals yet"}</Text>
              <Text style={styles.emptyBody}>{query || activeFilterCount > 0 ? "Try different filters" : "Investment deals will appear here"}</Text>
              {activeFilterCount > 0 && (
                <Pressable onPress={() => { setAmountRange(0); setTagFilter(""); setTypeFilter("all"); }} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Clear filters</Text>
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
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    filterToggle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", position: "relative" },
    filterToggleActive: { backgroundColor: colors.foreground },
    filterBadge: { position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    filterBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: colors.primaryForeground },
    postFab: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.foreground, alignItems: "center", justifyContent: "center" },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginVertical: 8, backgroundColor: colors.muted, borderRadius: colors.radius, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    sortRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: "row", alignItems: "center" },
    filterPanel: { backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, padding: 16, gap: 8 },
    filterPanelLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
    clearBtn: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.muted, borderRadius: 20, marginTop: 6 },
    clearBtnText: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    listContent: { paddingVertical: 8, paddingBottom: 100 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
