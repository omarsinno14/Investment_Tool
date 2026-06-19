import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
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

interface Hub {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  isMember?: boolean;
  _count?: { members?: number; posts?: number };
}

interface Post {
  id: string;
  title: string;
  body?: string;
  type?: string;
  author?: { name?: string };
  createdAt?: string;
  _count?: { reactions?: number; comments?: number };
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

export default function HubDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const [hub, setHub] = useState<Hub | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [hubRes, postsRes] = await Promise.all([
        apiFetch(`/api/hubs/${slug}`),
        apiFetch(`/api/hubs/${slug}/posts`),
      ]);
      const hubData = await hubRes.json().catch(() => ({}));
      const postsData = await postsRes.json().catch(() => ({ posts: [] }));
      setHub(hubData.hub ?? null);
      setPosts(postsData.posts ?? []);
    } catch {
      setError("Failed to load hub");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function toggleMembership() {
    if (!hub) return;
    setJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const method = hub.isMember ? "DELETE" : "POST";
    await apiFetch(`/api/hubs/${slug}/join`, { method }).catch(() => {});
    setHub((h) => h ? { ...h, isMember: !h.isMember } : h);
    setJoining(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error || !hub) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error ?? "Hub not found"}</Text>
    </View>
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <View style={styles.hubHeader}>
            <View style={styles.hubAvatar}>
              <Text style={styles.hubAvatarText}>{hub.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.hubName}>{hub.name}</Text>
            {hub.description ? <Text style={styles.hubDesc}>{hub.description}</Text> : null}
            <View style={styles.metaRow}>
              <Feather name="users" size={14} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{hub._count?.members ?? 0} members</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.joinBtn, hub.isMember && styles.joinBtnActive, { opacity: pressed || joining ? 0.7 : 1 }]}
              onPress={toggleMembership}
              disabled={joining}
            >
              <Text style={[styles.joinBtnText, hub.isMember && styles.joinBtnTextActive]}>
                {hub.isMember ? "Leave Hub" : "Join Hub"}
              </Text>
            </Pressable>
          </View>
          <View style={styles.postsHeader}>
            <Text style={styles.postsTitle}>Posts</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Text style={styles.postType}>{item.type ?? "POST"}</Text>
            <Text style={styles.postTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
          {item.body ? <Text style={styles.postBody} numberOfLines={2}>{item.body}</Text> : null}
          <View style={styles.postFooter}>
            <Text style={styles.postAuthor}>{item.author?.name ?? "Anonymous"}</Text>
            <View style={styles.statsRow}>
              <Feather name="heart" size={13} color={colors.mutedForeground} />
              <Text style={styles.statText}>{item._count?.reactions ?? 0}</Text>
              <Feather name="message-circle" size={13} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
              <Text style={styles.statText}>{item._count?.comments ?? 0}</Text>
            </View>
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Feather name="file-text" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          {hub.isMember && <Text style={styles.emptyBody}>Join the hub and be the first to post</Text>}
        </View>
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14 },
    listContent: { paddingBottom: 60 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    hubHeader: { alignItems: "center", padding: 24, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    hubAvatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    hubAvatarText: { color: colors.primaryForeground, fontSize: 26, fontFamily: "Inter_700Bold" },
    hubName: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    hubDesc: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    joinBtn: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, marginTop: 4 },
    joinBtnActive: { backgroundColor: colors.muted },
    joinBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    joinBtnTextActive: { color: colors.mutedForeground },
    postsHeader: { paddingHorizontal: 16, paddingVertical: 12 },
    postsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    postCard: { padding: 16 },
    postHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    postType: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    postTime: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    postTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 22, marginBottom: 4 },
    postBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 8 },
    postFooter: { flexDirection: "row", justifyContent: "space-between" },
    postAuthor: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    statsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    statText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", paddingTop: 40, gap: 10, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
