import { Feather } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const styles = makeStyles(colors);

  async function handleLogin() {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError(null);
    const err = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.appName}>Vertica</Text>
          <Text style={styles.tagline}>Investment Scout Platform</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                <Feather name={showPw ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.btn, { opacity: pressed || loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/register")} style={styles.switchLink}>
          <Text style={styles.switchText}>No account? <Text style={styles.switchAction}>Create one</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: 24, flexGrow: 1, justifyContent: "center" },
    logo: { alignItems: "center", marginBottom: 40 },
    logoCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    logoText: { color: colors.primaryForeground, fontSize: 22, fontFamily: "Inter_700Bold" },
    appName: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    tagline: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
    card: { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 24, gap: 16 },
    cardTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 4 },
    field: { gap: 6 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius - 2, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    pwRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    eyeBtn: { padding: 10 },
    errorText: { color: colors.destructive, fontSize: 13, fontFamily: "Inter_400Regular" },
    btn: { backgroundColor: colors.primary, borderRadius: colors.radius - 2, paddingVertical: 14, alignItems: "center" },
    btnText: { color: colors.primaryForeground, fontSize: 15, fontFamily: "Inter_600SemiBold" },
    switchLink: { marginTop: 24, alignItems: "center" },
    switchText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    switchAction: { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
  });
}
