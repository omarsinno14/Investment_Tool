import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenError } from "@/components/ScreenError";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Profile {
  name?: string;
  username?: string;
  bio?: string;
  role?: string;
}

function MenuItem({ icon, label, onPress, colors, danger }: {
  icon: string; label: string; onPress: () => void;
  colors: ReturnType<typeof useColors>; danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <View style={menuStyles(colors, danger).row}>
        <Feather name={icon as any} size={18} color={danger ? colors.destructive : colors.foreground} />
        <Text style={menuStyles(colors, danger).label}>{label}</Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function menuStyles(colors: ReturnType<typeof useColors>, danger?: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    label: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: danger ? colors.destructive : colors.foreground,
    },
  });
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch("/api/user/profile");
      const d = await r.json();
      setProfile(d.profile ?? d.user ?? {});
    } catch {
      setError("Couldn't load your profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleLogout() {
    await logout();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/login");
  }

  const displayName = profile?.name ?? user?.name ?? user?.email ?? "User";
  const displayUsername = profile?.username ?? user?.username;
  const initials = displayName.charAt(0).toUpperCase();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={() => router.push("/settings")} style={styles.headerBtn}>
          <Feather name="settings" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="small" color={colors.primary} /></View>
        ) : error ? (
          <View style={styles.errorWrap}><ScreenError message={error} onRetry={loadProfile} /></View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.profileName}>{displayName}</Text>
              {displayUsername ? <Text style={styles.profileUsername}>@{displayUsername}</Text> : null}
              {profile?.bio ? <Text style={styles.profileBio}>{profile.bio}</Text> : null}
              {user?.role && user.role !== "USER" ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.role}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Discover</Text>
              <View style={styles.menuGroup}>
                <MenuItem icon="home" label="Dashboard" onPress={() => router.push("/dashboard")} colors={colors} />
                <MenuItem icon="rss" label="Headlines" onPress={() => router.push("/headlines")} colors={colors} />
                <MenuItem icon="bookmark" label="Saved Articles" onPress={() => router.push("/saved-articles")} colors={colors} />
                <MenuItem icon="globe" label="Discover Hubs" onPress={() => router.push("/hubs/discover")} colors={colors} />
                <MenuItem icon="activity" label="Activity" onPress={() => router.push("/activity")} colors={colors} />
                <MenuItem icon="users" label="Investors" onPress={() => router.push("/users")} colors={colors} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Finance</Text>
              <View style={styles.menuGroup}>
                <MenuItem icon="pie-chart" label="Portfolio" onPress={() => router.push("/portfolio")} colors={colors} />
                <MenuItem icon="dollar-sign" label="Cash Flow" onPress={() => router.push("/cashflow")} colors={colors} />
                <MenuItem icon="target" label="Goals" onPress={() => router.push("/goals")} colors={colors} />
                <MenuItem icon="book-open" label="Journal" onPress={() => router.push("/journal")} colors={colors} />
                <MenuItem icon="bar-chart-2" label="Ratios" onPress={() => router.push("/ratios")} colors={colors} />
                <MenuItem icon="tool" label="Tools" onPress={() => router.push("/tools/index")} colors={colors} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={styles.menuGroup}>
                <MenuItem icon="user" label="Edit Profile" onPress={() => router.push("/settings")} colors={colors} />
                <MenuItem icon="credit-card" label="Membership" onPress={() => router.push("/billing")} colors={colors} />
                <MenuItem icon="star" label="Interests" onPress={() => router.push("/interests")} colors={colors} />
                <MenuItem icon="bell" label="Notifications" onPress={() => router.push("/notifications")} colors={colors} />
                <MenuItem icon="user-plus" label="Follow Requests" onPress={() => router.push("/follow-requests")} colors={colors} />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.menuGroup}>
                <MenuItem icon="log-out" label="Sign out" onPress={handleLogout} colors={colors} danger />
              </View>
            </View>

            <Text style={styles.disclaimer}>
              Vertica provides information only and does not constitute financial advice. Always conduct your own due diligence before making investment decisions.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    headerBtn: { padding: 4 },
    scrollContent: { paddingBottom: 100 },
    center: { paddingTop: 40, alignItems: "center" },
    errorWrap: { minHeight: 360 },
    profileCard: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    avatarText: { color: colors.primaryForeground, fontSize: 28, fontFamily: "Inter_700Bold" },
    profileName: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    profileUsername: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    profileBio: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginTop: 4 },
    roleBadge: { backgroundColor: colors.muted, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
    roleText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    section: { paddingHorizontal: 16, marginTop: 24 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 },
    menuGroup: { borderRadius: colors.radius, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    disclaimer: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24, marginTop: 32, lineHeight: 18 },
  });
}
