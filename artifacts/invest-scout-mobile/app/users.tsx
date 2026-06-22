import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenError } from "@/components/ScreenError";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface UserResult {
  id: string;
  name?: string;
  username?: string;
  bio?: string;
  role?: string;
}

export default function UsersScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); setError(null); return; }
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json().catch(() => ({ users: [] }));
      setResults(data.users ?? []);
    } catch {
      setError("Couldn't load search results");
    } finally {
      setLoading(false);
    }
  }, []);

  function onChangeText(text: string) {
    setQuery(text);
    if (text.length >= 2) search(text);
    else { setResults([]); setSearched(false); setError(null); }
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onChangeText}
          placeholder="Search investors..."
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {query ? (
          <Pressable onPress={() => { setQuery(""); setResults([]); setSearched(false); }}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="small" color={colors.primary} /></View>
      ) : error ? (
        <ScreenError message={error} onRetry={() => search(query)} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.userRow, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push(`/user/${item.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.name ?? item.username ?? "?").charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name ?? item.username ?? "User"}</Text>
                {item.username ? <Text style={styles.userUsername}>@{item.username}</Text> : null}
                {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            searched ? (
              <View style={styles.emptyState}>
                <Feather name="user-x" size={32} color={colors.mutedForeground} />
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptyBody}>Try a different search</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="users" size={32} color={colors.mutedForeground} />
                <Text style={styles.emptyBody}>Search for investors, founders, and professionals</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 10, margin: 16, backgroundColor: colors.muted, borderRadius: colors.radius, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    center: { padding: 20, alignItems: "center" },
    listContent: { paddingBottom: 40 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    userRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarText: { color: colors.primaryForeground, fontSize: 18, fontFamily: "Inter_700Bold" },
    userInfo: { flex: 1, gap: 2 },
    userName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    userUsername: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    userBio: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", paddingTop: 60, gap: 10, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
