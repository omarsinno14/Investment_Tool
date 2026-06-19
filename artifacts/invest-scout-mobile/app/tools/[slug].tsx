import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Tool {
  id: string;
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  category?: string;
  inputs?: { name: string; label: string; type: string; placeholder?: string }[];
}

export default function ToolDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/tools/${slug}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Tool not found");
      setTool(data.tool ?? data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error || !tool) return (
    <View style={styles.center}>
      <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
      <Text style={styles.errorText}>{error ?? "Tool not found"}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <View style={styles.toolIcon}>
          <Feather name="tool" size={28} color={colors.mutedForeground} />
        </View>
        <Text style={styles.title}>{tool.name}</Text>
        {tool.category ? <Text style={styles.category}>{tool.category}</Text> : null}
      </View>

      {(tool.description || tool.longDescription) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionBody}>{tool.longDescription ?? tool.description}</Text>
        </View>
      ) : null}

      <View style={styles.comingSoon}>
        <Feather name="clock" size={24} color={colors.mutedForeground} />
        <Text style={styles.comingSoonText}>Interactive tool coming soon</Text>
        <Text style={styles.comingSoonBody}>This tool will be available on the web at Vertica. Check back soon for the full mobile experience.</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 60, gap: 24 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14 },
    header: { alignItems: "center", gap: 12 },
    toolIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.4, textAlign: "center" },
    category: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
    section: { gap: 10 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    sectionBody: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 24 },
    comingSoon: { alignItems: "center", gap: 12, backgroundColor: colors.muted, borderRadius: colors.radius, padding: 24 },
    comingSoonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    comingSoonBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}
