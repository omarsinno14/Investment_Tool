import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

interface Plan {
  tier: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  features: string[];
}

interface Subscription {
  tier: string;
  status: string;
  renewsAt: string | null;
  plan: Plan;
  stripeEnabled: boolean;
}

interface PaymentEvent {
  id: string;
  type: string;
  tier: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  createdAt: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function centsToUsd(amount: number | null, currency: string | null): string {
  if (amount == null) return "—";
  return (amount / 100).toLocaleString(undefined, { style: "currency", currency: (currency ?? "usd").toUpperCase() });
}

export default function BillingScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pRes, sRes, hRes] = await Promise.all([
        apiFetch("/api/billing/plans"),
        apiFetch("/api/billing/subscription"),
        apiFetch("/api/billing/history"),
      ]);
      if (!pRes.ok || !sRes.ok || !hRes.ok) throw new Error("billing request failed");
      const p = await pRes.json().catch(() => ({ plans: [] }));
      const s = await sRes.json().catch(() => null);
      const h = await hRes.json().catch(() => ({ events: [] }));
      setPlans(p.plans ?? []);
      setSub(s);
      setHistory(h.events ?? []);
    } catch {
      setError("Failed to load membership details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function activate(tier: string) {
    setBusy(tier);
    setNotice(null);
    try {
      const res = await apiFetch("/api/billing/activate", {
        method: "POST",
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotice("Membership updated.");
      await load();
    } catch {
      setNotice("Could not update membership.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    setNotice(null);
    try {
      const res = await apiFetch("/api/billing/cancel", { method: "POST" });
      if (!res.ok) throw new Error();
      setNotice("Membership cancelled.");
      await load();
    } catch {
      setNotice("Could not cancel.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => { setLoading(true); load(); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const currentTier = sub?.tier ?? "FREE";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {/* Current subscription */}
      {sub && (
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>Current membership</Text>
          <Text style={styles.currentTier}>{sub.plan?.name ?? sub.tier}</Text>
          <Text style={styles.currentStatus}>
            {sub.status}{sub.renewsAt ? ` · renews ${fmtDate(sub.renewsAt)}` : ""}
          </Text>
          {currentTier !== "FREE" && (
            <Pressable
              style={({ pressed }) => [styles.outlineBtn, { opacity: pressed || busy === "cancel" ? 0.7 : 1 }]}
              onPress={cancel}
              disabled={busy === "cancel"}
            >
              {busy === "cancel" ? <ActivityIndicator color={colors.foreground} /> : <Text style={styles.outlineBtnText}>Cancel membership</Text>}
            </Pressable>
          )}
        </View>
      )}

      {/* Plans */}
      <Text style={styles.sectionTitle}>Plans</Text>
      {plans.map((plan) => {
        const isCurrent = plan.tier === currentTier;
        return (
          <View key={plan.tier} style={[styles.planCard, isCurrent && styles.planCardActive]}>
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planTagline}>{plan.tagline}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.planPrice}>{plan.priceMonthly === 0 ? "Free" : `$${plan.priceMonthly}`}</Text>
                {plan.priceMonthly > 0 ? <Text style={styles.planPer}>/ month</Text> : null}
              </View>
            </View>
            <View style={styles.featureList}>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Feather name="check" size={14} color={colors.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            {isCurrent ? (
              <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current plan</Text></View>
            ) : plan.tier !== "FREE" ? (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { opacity: pressed || busy === plan.tier ? 0.7 : 1 }]}
                onPress={() => activate(plan.tier)}
                disabled={busy === plan.tier}
              >
                {busy === plan.tier
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={styles.primaryBtnText}>{sub?.stripeEnabled ? "Subscribe" : "Choose plan"}</Text>}
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {/* Payment history */}
      <Text style={styles.sectionTitle}>Payment history</Text>
      <View style={styles.historyCard}>
        {history.length === 0 ? (
          <Text style={styles.historyEmpty}>No payments yet.</Text>
        ) : (
          history.map((e) => (
            <View key={e.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{fmtDate(e.createdAt)}</Text>
              <Text style={styles.historyTier}>{e.tier ?? "—"}</Text>
              <Text style={styles.historyAmount}>{centsToUsd(e.amount, e.currency)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 12, paddingBottom: 60 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.background },
    errorText: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    notice: { color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13, backgroundColor: colors.muted, padding: 10, borderRadius: 8, textAlign: "center" },
    currentCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.foreground, borderRadius: colors.radius, padding: 16, gap: 4 },
    currentLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    currentTier: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    currentStatus: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 8 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
    planCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, padding: 16, gap: 12 },
    planCardActive: { borderColor: colors.foreground },
    planHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    planName: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground },
    planTagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    planPrice: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    planPer: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    featureList: { gap: 8 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    featureText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: colors.radius - 2, paddingVertical: 12, alignItems: "center" },
    primaryBtnText: { color: colors.primaryForeground, fontSize: 15, fontFamily: "Inter_600SemiBold" },
    outlineBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius - 2, paddingVertical: 12, alignItems: "center", marginTop: 4 },
    outlineBtnText: { color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    currentBadge: { backgroundColor: colors.muted, borderRadius: colors.radius - 2, paddingVertical: 10, alignItems: "center" },
    currentBadgeText: { color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    historyCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, overflow: "hidden" },
    historyEmpty: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, padding: 16, textAlign: "center" },
    historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    historyDate: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground },
    historyTier: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    historyAmount: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, textAlign: "right" },
  });
}
