import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C+", "Growth", "Other"];
const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "GHS"];

function FieldLabel({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 6 }}>{label}</Text>;
}

function StyledInput({ value, onChangeText, placeholder, multiline, colors, numeric }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string;
  multiline?: boolean; colors: ReturnType<typeof useColors>; numeric?: boolean;
}) {
  return (
    <TextInput
      style={{
        backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 12, fontSize: 15, fontFamily: "Inter_400Regular",
        color: colors.foreground, height: multiline ? 100 : undefined, textAlignVertical: multiline ? "top" : "center",
      }}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      multiline={multiline}
      keyboardType={numeric ? "decimal-pad" : "default"}
    />
  );
}

export default function PostDealScreen() {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [askAmount, setAskAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [stage, setStage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!summary.trim()) { setError("Summary is required"); return; }
    setError(null);
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await apiFetch("/api/user/opportunities", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          details: details.trim() || undefined,
          askAmount: askAmount ? Number(askAmount) : undefined,
          askCurrency: currency,
          stage: stage || undefined,
          contactEmail: contactEmail.trim() || undefined,
          tags: tagsArr,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Error ${res.status}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Failed to post deal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.navTitle}>Post a Deal</Text>
        <Pressable
          onPress={submit}
          disabled={submitting}
          style={({ pressed }) => [styles.postBtn, { opacity: pressed || submitting ? 0.7 : 1 }]}
        >
          {submitting
            ? <ActivityIndicator size="small" color={colors.primaryForeground} />
            : <Text style={styles.postBtnText}>Post</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <View style={styles.field}>
          <FieldLabel label="Deal title *" colors={colors} />
          <StyledInput value={title} onChangeText={setTitle} placeholder="What is this deal?" colors={colors} />
        </View>

        <View style={styles.field}>
          <FieldLabel label="Summary *" colors={colors} />
          <StyledInput value={summary} onChangeText={setSummary} placeholder="Briefly describe the opportunity…" multiline colors={colors} />
        </View>

        <View style={styles.field}>
          <FieldLabel label="Details" colors={colors} />
          <StyledInput value={details} onChangeText={setDetails} placeholder="Provide full details, traction, use of funds…" multiline colors={colors} />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <FieldLabel label="Ask amount" colors={colors} />
            <StyledInput value={askAmount} onChangeText={setAskAmount} placeholder="0" colors={colors} numeric />
          </View>
          <View style={[styles.field, { width: 90 }]}>
            <FieldLabel label="Currency" colors={colors} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {CURRENCIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[styles.pill, currency === c && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, currency === c && styles.pillTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={styles.field}>
          <FieldLabel label="Stage" colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {STAGES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStage(stage === s ? "" : s)}
                  style={[styles.pill, stage === s && styles.pillActive]}
                >
                  <Text style={[styles.pillText, stage === s && styles.pillTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.field}>
          <FieldLabel label="Tags (comma-separated)" colors={colors} />
          <StyledInput value={tags} onChangeText={setTags} placeholder="SaaS, Africa, B2B…" colors={colors} />
        </View>

        <View style={styles.field}>
          <FieldLabel label="Contact email" colors={colors} />
          <StyledInput value={contactEmail} onChangeText={setContactEmail} placeholder="contact@company.com" colors={colors} />
        </View>

        <Text style={styles.disclaimer}>
          By posting, you confirm this deal is genuine. Misrepresentations may result in account suspension.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    cancelBtn: { padding: 4 },
    cancelText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    navTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    postBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    postBtnText: { color: colors.primaryForeground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    form: { padding: 20, gap: 4, paddingBottom: 60 },
    errorBanner: { backgroundColor: colors.destructive + "20", color: colors.destructive, padding: 12, borderRadius: 8, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 8 },
    field: { gap: 6, marginBottom: 18 },
    row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    pillTextActive: { color: colors.primaryForeground },
    disclaimer: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, marginTop: 8 },
  });
}
