import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenError } from "@/components/ScreenError";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface JournalEntry {
  id: string;
  title?: string;
  body: string;
  mood?: string;
  createdAt?: string;
  updatedAt?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function JournalScreen() {
  const colors = useColors();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/journal");
      const data = await res.json().catch(() => ({ entries: [] }));
      setEntries(data.entries ?? data.journals ?? []);
    } catch {
      setError("Couldn't load your journal");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error) return <ScreenError message={error} onRetry={load} />;

  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => e.id}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            {item.mood ? <Text style={styles.mood}>{item.mood}</Text> : null}
          </View>
          {item.title ? <Text style={styles.entryTitle}>{item.title}</Text> : null}
          <Text style={styles.entryBody} numberOfLines={4}>{item.body}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="book-open" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No journal entries</Text>
          <Text style={styles.emptyBody}>Use the journal to record investment thoughts and decisions</Text>
        </View>
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingBottom: 60 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    entryCard: { padding: 16, gap: 8 },
    entryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    date: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    mood: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    entryTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    entryBody: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22 },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
