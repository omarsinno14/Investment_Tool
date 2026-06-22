import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenError } from "@/components/ScreenError";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface DashboardData {
  profile?: { name?: string };
  interests?: string[];
  communityOpportunities?: number;
  headlineCount?: number;
}

function StatCard({ icon, label, value, colors }: { icon: string; label: string; value: string | number; colors: ReturnType<typeof useColors> }) {
  const s = StyleSheet.create({
    card: { flex: 1, backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
    icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center" as const, justifyContent: "center" as const },
    label: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    value: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
  });
  return (
    <View style={s.card}>
      <View style={s.icon}>
        <Feather name={icon as any} size={18} color={colors.mutedForeground} />
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [profileRes, interestsRes, oppsRes, headlinesRes] = await Promise.all([
        apiFetch("/api/user/profile"),
        apiFetch("/api/user/interests"),
        apiFetch("/api/opportunities?type=community&limit=1"),
        apiFetch("/api/opportunities?type=headlines&limit=1"),
      ]);
      const profile = await profileRes.json().catch(() => ({}));
      const interests = await interestsRes.json().catch(() => ({ interests: [] }));
      const opps = await oppsRes.json().catch(() => ({ total: 0 }));
      const headlines = await headlinesRes.json().catch(() => ({ total: 0 }));
      setData({
        profile: profile.profile ?? {},
        interests: interests.interests ?? [],
        communityOpportunities: opps.total ?? opps.opportunities?.length ?? 0,
        headlineCount: headlines.total ?? headlines.opportunities?.length ?? 0,
      });
    } catch {
      setError("Couldn't load your dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const name = data.profile?.name ?? user?.name ?? user?.email ?? "Investor";
  const firstName = name.split(" ")[0];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
    >
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Good day, {firstName}</Text>
        <Text style={styles.greetingSubtext}>Here's what's happening in your investment world</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
      ) : error ? (
        <View style={styles.errorWrap}><ScreenError message={error} onRetry={load} /></View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard icon="briefcase" label="Community Deals" value={data.communityOpportunities ?? 0} colors={colors} />
            <StatCard icon="rss" label="Headlines" value={data.headlineCount ?? 0} colors={colors} />
          </View>

          {data.interests && data.interests.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Interests</Text>
              <View style={styles.tagsRow}>
                {data.interests.slice(0, 8).map((interest) => (
                  <View key={interest} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Links</Text>
            <View style={styles.linksCard}>
              {[
                { icon: "rss", label: "Headlines" },
                { icon: "activity", label: "Activity" },
                { icon: "pie-chart", label: "Portfolio" },
                { icon: "target", label: "Goals" },
              ].map((item, idx, arr) => (
                <View key={item.label} style={[styles.linkRow, idx < arr.length - 1 && styles.linkRowBorder]}>
                  <Feather name={item.icon as any} size={18} color={colors.mutedForeground} />
                  <Text style={styles.linkLabel}>{item.label}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Vertica provides information only. Not financial advice.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 20, paddingBottom: 60 },
    errorWrap: { minHeight: 360 },
    greeting: { gap: 4 },
    greetingText: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.4 },
    greetingSubtext: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    statsRow: { flexDirection: "row", gap: 12 },
    section: { gap: 12 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: colors.muted, borderRadius: 20 },
    tagText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    linksCard: { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    linkRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
    linkRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    linkLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    disclaimer: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
