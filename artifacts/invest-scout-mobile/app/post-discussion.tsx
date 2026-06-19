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

const POPULAR_TAGS = ["Markets", "Startups", "Africa", "Real Estate", "Crypto", "VC", "Strategy", "Question"];

export default function PostDiscussionScreen() {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  function toggleTag(tag: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setCustomTag("");
    }
  }

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!body.trim()) { setError("Body is required"); return; }
    setError(null);
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await apiFetch("/api/forums", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim(), tags }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Error ${res.status}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Failed to post discussion");
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
        <Text style={styles.navTitle}>New Discussion</Text>
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

        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.mutedForeground}
          maxLength={120}
        />

        <TextInput
          style={styles.bodyInput}
          value={body}
          onChangeText={setBody}
          placeholder="Share your thoughts, ask a question, or start a discussion…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.sectionLabel}>Tags</Text>
        <View style={styles.tagsWrap}>
          {POPULAR_TAGS.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.tagChip, tags.includes(tag) && styles.tagChipActive]}
            >
              <Text style={[styles.tagChipText, tags.includes(tag) && styles.tagChipTextActive]}>{tag}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.customTagRow}>
          <TextInput
            style={styles.customTagInput}
            value={customTag}
            onChangeText={setCustomTag}
            onSubmitEditing={addCustomTag}
            placeholder="Add custom tag…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            autoCapitalize="words"
          />
          <Pressable onPress={addCustomTag} style={styles.addTagBtn}>
            <Text style={styles.addTagBtnText}>Add</Text>
          </Pressable>
        </View>

        {tags.length > 0 ? (
          <View style={styles.selectedTags}>
            {tags.map((t) => (
              <Pressable key={t} onPress={() => toggleTag(t)} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>{t} ×</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.disclaimer}>
          Be respectful and constructive. Spam or misleading content will be removed.
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
    errorBanner: { backgroundColor: colors.destructive + "20", color: colors.destructive, padding: 12, borderRadius: 8, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 12 },
    titleInput: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.foreground, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 12, marginBottom: 16 },
    bodyInput: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, height: 160, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 8, marginBottom: 24, lineHeight: 22 },
    sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
    tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
    tagChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    tagChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tagChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    tagChipTextActive: { color: colors.primaryForeground },
    customTagRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    customTagInput: { flex: 1, backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    addTagBtn: { backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, justifyContent: "center" },
    addTagBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    selectedTags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
    selectedTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.foreground },
    selectedTagText: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.background },
    disclaimer: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, marginTop: 8 },
  });
}
