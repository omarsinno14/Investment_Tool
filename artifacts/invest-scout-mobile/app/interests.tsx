import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
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

const INTEREST_OPTIONS = [
  "Startups", "Real Estate", "Crypto", "Stocks", "Bonds", "Private Equity",
  "Venture Capital", "Angel Investing", "Fintech", "Healthcare", "CleanTech",
  "AI/ML", "SaaS", "Consumer", "B2B", "EdTech", "AgriTech", "SpaceTech",
  "Emerging Markets", "Africa", "Asia", "Europe", "Americas", "Impact Investing",
  "ESG", "Commodities", "Forex", "ETFs", "REITs", "Infrastructure",
];

export default function InterestsScreen() {
  const colors = useColors();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const styles = makeStyles(colors);

  useEffect(() => {
    apiFetch("/api/user/interests").then((r) => r.json()).then((d) => {
      setSelected(d.interests ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function toggle(interest: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }

  async function save() {
    setSaving(true);
    setSuccess(false);
    await apiFetch("/api/user/interests", {
      method: "PUT",
      body: JSON.stringify({ interests: selected }),
    }).catch(() => {});
    setSaving(false);
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.subtitle}>Select the areas that interest you. This helps us personalize your feed.</Text>
        <View style={styles.grid}>
          {INTEREST_OPTIONS.map((interest) => {
            const isSelected = selected.includes(interest);
            return (
              <Pressable
                key={interest}
                style={({ pressed }) => [styles.chip, isSelected && styles.chipSelected, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => toggle(interest)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{interest}</Text>
              </Pressable>
            );
          })}
        </View>
        {success ? <Text style={styles.successText}>Interests saved!</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.selectedCount}>{selected.length} selected</Text>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.7 : 1 }]}
          onPress={save}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.saveBtnText}>Save interests</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { padding: 20, paddingBottom: 40, gap: 16 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    chipTextSelected: { color: colors.primaryForeground },
    successText: { color: colors.success, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    selectedCount: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: colors.radius - 2 },
    saveBtnText: { color: colors.primaryForeground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  });
}
