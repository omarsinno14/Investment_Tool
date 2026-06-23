import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface ProfileForm {
  name: string;
  username: string;
  bio: string;
  notifyMessages: boolean;
  notifyFollows: boolean;
  notifyOpportunities: boolean;
  notifyForums: boolean;
  notifyJournal: boolean;
  notifyPayments: boolean;
  notifyDigest: boolean;
}

const NOTIFY_FIELDS: { key: keyof ProfileForm; label: string }[] = [
  { key: "notifyMessages", label: "Messages & direct chats" },
  { key: "notifyFollows", label: "Follows & follow requests" },
  { key: "notifyOpportunities", label: "Opportunity matches" },
  { key: "notifyForums", label: "Forum reactions & comments" },
  { key: "notifyJournal", label: "Journal invites & updates" },
  { key: "notifyPayments", label: "Payment receipts & membership" },
  { key: "notifyDigest", label: "Weekly opportunity digest" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    username: "",
    bio: "",
    notifyMessages: true,
    notifyFollows: true,
    notifyOpportunities: true,
    notifyForums: true,
    notifyJournal: true,
    notifyPayments: true,
    notifyDigest: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const styles = makeStyles(colors);

  useEffect(() => {
    apiFetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => {
        const p = d.profile ?? {};
        setForm((prev) => ({
          ...prev,
          name: p.name ?? "",
          username: p.username ?? "",
          bio: p.bio ?? "",
          notifyMessages: p.notifyMessages !== false,
          notifyFollows: p.notifyFollows !== false,
          notifyOpportunities: p.notifyOpportunities !== false,
          notifyForums: p.notifyForums !== false,
          notifyJournal: p.notifyJournal !== false,
          notifyPayments: p.notifyPayments !== false,
          notifyDigest: p.notifyDigest !== false,
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const res = await apiFetch("/api/user/profile", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Save failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    try {
      const res = await apiFetch("/api/auth/logout-all", { method: "POST" });
      if (!res.ok) throw new Error();
      router.replace("/login");
    } catch {
      setError("Could not sign out other sessions.");
      setSigningOut(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Profile</Text>

      {[
        { label: "Full name", key: "name", placeholder: "Your name" },
        { label: "Username", key: "username", placeholder: "username" },
      ].map((f) => (
        <View style={styles.field} key={f.key}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={styles.input}
            value={String(form[f.key as keyof ProfileForm])}
            onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
            placeholder={f.placeholder}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ))}

      <View style={styles.field}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={form.bio}
          onChangeText={(v) => setForm((prev) => ({ ...prev, bio: v }))}
          placeholder="Tell others about yourself"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          autoCorrect={false}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Notifications</Text>
      <View style={styles.toggleGroup}>
        {NOTIFY_FIELDS.map((f) => (
          <View style={styles.toggleRow} key={f.key}>
            <Text style={styles.toggleLabel}>{f.label}</Text>
            <Switch
              value={Boolean(form[f.key])}
              onValueChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>Settings saved!</Text> : null}

      <Pressable
        style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.7 : 1 }]}
        onPress={save}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.saveBtnText}>Save changes</Text>}
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Security</Text>
      <Pressable
        style={({ pressed }) => [styles.outlineBtn, { opacity: pressed || signingOut ? 0.7 : 1 }]}
        onPress={signOutEverywhere}
        disabled={signingOut}
      >
        {signingOut ? <ActivityIndicator color={colors.foreground} /> : <Text style={styles.outlineBtnText}>Sign out of all devices</Text>}
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 14, paddingBottom: 60 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    field: { gap: 6 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius - 2, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    bioInput: { height: 100, textAlignVertical: "top" },
    toggleGroup: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius - 2, overflow: "hidden" },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    toggleLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, paddingRight: 12 },
    errorText: { color: colors.destructive, fontSize: 13, fontFamily: "Inter_400Regular" },
    successText: { color: colors.success, fontSize: 13, fontFamily: "Inter_500Medium" },
    saveBtn: { backgroundColor: colors.primary, borderRadius: colors.radius - 2, paddingVertical: 14, alignItems: "center", marginTop: 8 },
    saveBtnText: { color: colors.primaryForeground, fontSize: 15, fontFamily: "Inter_600SemiBold" },
    outlineBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius - 2, paddingVertical: 14, alignItems: "center" },
    outlineBtnText: { color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
