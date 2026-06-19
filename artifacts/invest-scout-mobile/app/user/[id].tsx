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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface UserProfile {
  id: string;
  name?: string;
  username?: string;
  bio?: string;
  role?: string;
  isFollowing?: boolean;
  _count?: { followers?: number; following?: number; opportunities?: number };
}

interface Opp {
  id: string;
  title: string;
  summary?: string;
  askAmount?: number;
  askCurrency?: string;
  createdAt?: string;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);
  const isOwnProfile = currentUser?.id === id;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [profileRes, oppsRes] = await Promise.all([
        apiFetch(`/api/users/${id}`),
        apiFetch(`/api/opportunities?authorId=${id}&limit=10`),
      ]);
      const profileData = await profileRes.json().catch(() => ({}));
      const oppsData = await oppsRes.json().catch(() => ({ opportunities: [] }));
      if (!profileRes.ok) throw new Error(profileData?.error ?? "User not found");
      const u = profileData.user ?? profileData;
      setProfile(u);
      setFollowing(u.isFollowing ?? false);
      setOpps(oppsData.opportunities ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    if (!profile) return;
    setFollowLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const method = following ? "DELETE" : "POST";
    await apiFetch(`/api/users/${id}/follow`, { method }).catch(() => {});
    setFollowing((v) => !v);
    setFollowLoading(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error || !profile) return (
    <View style={styles.center}>
      <Feather name="user-x" size={40} color={colors.mutedForeground} />
      <Text style={styles.errorText}>{error ?? "User not found"}</Text>
    </View>
  );

  const displayName = profile.name ?? profile.username ?? "User";

  return (
    <FlatList
      data={opps}
      keyExtractor={(o) => o.id}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            {profile.username ? <Text style={styles.profileUsername}>@{profile.username}</Text> : null}
            {profile.bio ? <Text style={styles.profileBio}>{profile.bio}</Text> : null}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile._count?.followers ?? 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile._count?.following ?? 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile._count?.opportunities ?? 0}</Text>
                <Text style={styles.statLabel}>Deals</Text>
              </View>
            </View>

            {!isOwnProfile ? (
              <Pressable
                style={({ pressed }) => [styles.followBtn, following && styles.followBtnActive, { opacity: pressed || followLoading ? 0.7 : 1 }]}
                onPress={toggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={following ? colors.foreground : colors.primaryForeground} />
                ) : (
                  <>
                    <Feather name={following ? "user-check" : "user-plus"} size={15} color={following ? colors.foreground : colors.primaryForeground} />
                    <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                      {following ? "Following" : "Follow"}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>

          {opps.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Opportunities</Text>
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.oppCard}>
          <Text style={styles.oppTitle} numberOfLines={2}>{item.title}</Text>
          {item.summary ? <Text style={styles.oppSummary} numberOfLines={1}>{item.summary}</Text> : null}
          {item.askAmount ? (
            <Text style={styles.oppAmount}>{item.askCurrency ?? "USD"} {Number(item.askAmount).toLocaleString()}</Text>
          ) : null}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        opps.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="briefcase" size={28} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No opportunities posted yet</Text>
          </View>
        ) : null
      }
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    listContent: { paddingBottom: 60 },
    profileCard: { alignItems: "center", padding: 24, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    avatarText: { color: colors.primaryForeground, fontSize: 28, fontFamily: "Inter_700Bold" },
    profileName: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    profileUsername: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    profileBio: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    statsRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    statItem: { flex: 1, alignItems: "center", gap: 2 },
    statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    statLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border },
    followBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 10, borderRadius: colors.radius, backgroundColor: colors.primary, marginTop: 8 },
    followBtnActive: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    followBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground },
    followBtnTextActive: { color: colors.foreground },
    sectionHeader: { paddingHorizontal: 16, paddingVertical: 12 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    oppCard: { padding: 16, gap: 4 },
    oppTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, lineHeight: 21 },
    oppSummary: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    oppAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 4 },
    emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
