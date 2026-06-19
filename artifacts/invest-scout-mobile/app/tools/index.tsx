import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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

interface Tool {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  icon?: string;
}

export default function ToolsScreen() {
  const colors = useColors();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/api/tools");
      const data = await res.json().catch(() => ({ tools: [] }));
      setTools(data.tools ?? []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      data={tools}
      keyExtractor={(t) => t.id}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.listContent}
      numColumns={2}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.toolCard, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push(`/tools/${item.slug}`)}
        >
          <View style={styles.toolIcon}>
            <Feather name={(item.icon as any) ?? "tool"} size={22} color={colors.mutedForeground} />
          </View>
          <Text style={styles.toolName}>{item.name}</Text>
          {item.description ? <Text style={styles.toolDesc} numberOfLines={2}>{item.description}</Text> : null}
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="tool" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No tools available</Text>
          <Text style={styles.emptyBody}>Investment tools and calculators will appear here</Text>
        </View>
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { padding: 12, paddingBottom: 60 },
    row: { gap: 12 },
    toolCard: { flex: 1, backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10, marginBottom: 12 },
    toolIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    toolName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    toolDesc: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 },
    emptyState: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
