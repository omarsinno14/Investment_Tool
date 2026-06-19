import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Opp {
  id: string;
  title: string;
  summary?: string;
  description?: string;
  tags?: string[];
  stage?: string;
  type?: string;
  country?: string;
  askAmount?: number;
  askCurrency?: string;
  expectedRoiPercent?: number;
  isBoosted?: boolean;
  author?: { name?: string; username?: string };
  createdAt?: string;
  benefits?: string[];
}

function Tag({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  const s = StyleSheet.create({ tag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.muted, borderRadius: 20 }, text: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground } });
  return <View style={s.tag}><Text style={s.text}>{label}</Text></View>;
}

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  const s = StyleSheet.create({ row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, label: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", flex: 1 }, value: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground } });
  return (
    <View style={s.row}>
      <Feather name={icon as any} size={16} color={colors.mutedForeground} />
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const [opp, setOpp] = useState<Opp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [interested, setInterested] = useState(false);

  const styles = makeStyles(colors);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/opportunities/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Not found");
      setOpp(data.opportunity ?? data);
      setSaved(data.isSaved ?? false);
      setInterested(data.isInterested ?? false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function toggleReaction(type: "SAVED" | "VERY_INTERESTED") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await apiFetch(`/api/opportunities/${id}/react`, {
      method: "POST",
      body: JSON.stringify({ type }),
    }).catch(() => {});
    if (type === "SAVED") setSaved((v) => !v);
    else setInterested((v) => !v);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error || !opp) return (
    <View style={styles.center}>
      <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
      <Text style={styles.errorText}>{error ?? "Opportunity not found"}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.topRow}>
        {opp.isBoosted && (
          <View style={styles.boostedBadge}>
            <Feather name="zap" size={11} color={colors.warning} />
            <Text style={[styles.boostedText, { color: colors.warning }]}>Featured</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{opp.title}</Text>
      {opp.summary ? <Text style={styles.summary}>{opp.summary}</Text> : null}

      <View style={styles.actionRow}>
        <Pressable style={[styles.actionBtn, saved && styles.actionBtnActive]} onPress={() => toggleReaction("SAVED")}>
          <Feather name="bookmark" size={16} color={saved ? colors.primaryForeground : colors.foreground} />
          <Text style={[styles.actionBtnText, saved && { color: colors.primaryForeground }]}>Save</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, interested && styles.actionBtnActive]} onPress={() => toggleReaction("VERY_INTERESTED")}>
          <Feather name="star" size={16} color={interested ? colors.primaryForeground : colors.foreground} />
          <Text style={[styles.actionBtnText, interested && { color: colors.primaryForeground }]}>Interested</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {opp.askAmount ? <InfoRow icon="dollar-sign" label="Ask Amount" value={`${opp.askCurrency ?? "USD"} ${Number(opp.askAmount).toLocaleString()}`} colors={colors} /> : null}
        {opp.expectedRoiPercent ? <InfoRow icon="percent" label="Expected ROI" value={`${opp.expectedRoiPercent}%`} colors={colors} /> : null}
        {opp.stage ? <InfoRow icon="layers" label="Stage" value={opp.stage} colors={colors} /> : null}
        {opp.type ? <InfoRow icon="tag" label="Type" value={opp.type} colors={colors} /> : null}
        {opp.country ? <InfoRow icon="map-pin" label="Country" value={opp.country} colors={colors} /> : null}
        {opp.author?.name ? <InfoRow icon="user" label="Posted by" value={opp.author.name} colors={colors} /> : null}
      </View>

      {opp.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionBody}>{opp.description}</Text>
        </View>
      ) : null}

      {opp.tags && opp.tags.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {opp.tags.map((t) => <Tag key={t} label={t} colors={colors} />)}
          </View>
        </View>
      ) : null}

      <View style={styles.disclaimer}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={styles.disclaimerText}>This information is provided for reference only and does not constitute financial advice. Always conduct your own due diligence.</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 60, gap: 16 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    topRow: { flexDirection: "row", alignItems: "center" },
    boostedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    boostedText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5, lineHeight: 32 },
    summary: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 24 },
    actionRow: { flexDirection: "row", gap: 12 },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    actionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    card: { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
    section: { gap: 10 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    sectionBody: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 24 },
    tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    disclaimer: { flexDirection: "row", gap: 10, backgroundColor: colors.muted, borderRadius: colors.radius, padding: 14, alignItems: "flex-start" },
    disclaimerText: { flex: 1, fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18 },
  });
}
