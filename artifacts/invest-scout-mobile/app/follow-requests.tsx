import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

interface FollowRequest {
  id: string;
  follower?: { id?: string; name?: string; username?: string; bio?: string };
  createdAt?: string;
}

export default function FollowRequestsScreen() {
  const colors = useColors();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/api/user/follow-requests");
      const data = await res.json().catch(() => ({ requests: [] }));
      setRequests(data.requests ?? []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function respond(requestId: string, accept: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    await apiFetch(`/api/user/follow-requests/${requestId}`, {
      method: "POST",
      body: JSON.stringify({ accept }),
    }).catch(() => {});
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      data={requests}
      keyExtractor={(r) => r.id}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const name = item.follower?.name ?? item.follower?.username ?? "User";
        return (
          <View style={styles.requestRow}>
            <Pressable onPress={() => { if (item.follower?.id) router.push(`/user/${item.follower.id}`); }}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            </Pressable>
            <View style={styles.info}>
              <Text style={styles.name}>{name}</Text>
              {item.follower?.bio ? <Text style={styles.bio} numberOfLines={1}>{item.follower.bio}</Text> : null}
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.acceptBtn} onPress={() => respond(item.id, true)}>
                <Feather name="check" size={16} color={colors.primaryForeground} />
              </Pressable>
              <Pressable style={styles.declineBtn} onPress={() => respond(item.id, false)}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="user-plus" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptyBody}>Follow requests will appear here</Text>
        </View>
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingBottom: 40 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    requestRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarText: { color: colors.primaryForeground, fontSize: 18, fontFamily: "Inter_700Bold" },
    info: { flex: 1, gap: 2 },
    name: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    bio: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    actions: { flexDirection: "row", gap: 8 },
    acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    declineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
