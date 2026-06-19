import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
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
}

export default function SettingsScreen() {
  const colors = useColors();
  const [form, setForm] = useState<ProfileForm>({ name: "", username: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  useEffect(() => {
    apiFetch("/api/user/profile").then((r) => r.json()).then((d) => {
      const p = d.profile ?? {};
      setForm({ name: p.name ?? "", username: p.username ?? "", bio: p.bio ?? "" });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const res = await apiFetch("/api/user/profile", {
      method: "PUT",
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
            value={form[f.key as keyof ProfileForm]}
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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>Profile saved!</Text> : null}

      <Pressable
        style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.7 : 1 }]}
        onPress={save}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.saveBtnText}>Save changes</Text>}
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
    errorText: { color: colors.destructive, fontSize: 13, fontFamily: "Inter_400Regular" },
    successText: { color: colors.success, fontSize: 13, fontFamily: "Inter_500Medium" },
    saveBtn: { backgroundColor: colors.primary, borderRadius: colors.radius - 2, paddingVertical: 14, alignItems: "center", marginTop: 8 },
    saveBtnText: { color: colors.primaryForeground, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
