import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenError } from "@/components/ScreenError";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

const ASSET_TYPES = [
  { value: "CASH", label: "Cash" },
  { value: "STOCKS", label: "Stocks" },
  { value: "ETF", label: "ETF" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "PRIVATE_EQUITY", label: "Private Equity" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "WATCH", label: "Watch" },
  { value: "ART", label: "Art" },
  { value: "BUSINESS", label: "Business" },
  { value: "DEBT", label: "Debt" },
  { value: "OTHER", label: "Other" },
] as const;

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "GHS"];

type AssetType = (typeof ASSET_TYPES)[number]["value"];

interface PortfolioAsset {
  id: string;
  name: string;
  assetType: AssetType;
  currency: string;
  currentValue: number;
  costBasis?: number | null;
  quantity?: number | null;
  isLiability: boolean;
  passiveIncomeMonthly?: number | null;
  notes?: string | null;
}

interface AssetSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  allocationByType: { assetType: string; value: number; pct: number }[];
  totalPassiveIncomeMonthly: number;
  count: number;
}

function assetTypeLabel(value: string): string {
  return ASSET_TYPES.find((t) => t.value === value)?.label ?? value;
}

interface FormState {
  name: string;
  assetType: AssetType;
  currency: string;
  currentValue: string;
  costBasis: string;
  quantity: string;
  isLiability: boolean;
  passiveIncomeMonthly: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    name: "",
    assetType: "CASH",
    currency: "USD",
    currentValue: "",
    costBasis: "",
    quantity: "",
    isLiability: false,
    passiveIncomeMonthly: "",
    notes: "",
  };
}

export default function PortfolioScreen() {
  const colors = useColors();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/assets");
      const data = await res.json().catch(() => ({ assets: [], summary: null }));
      setAssets(data.assets ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setError("Couldn't load your assets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
    setModalVisible(true);
  }

  function openEdit(asset: PortfolioAsset) {
    setForm({
      name: asset.name,
      assetType: asset.assetType,
      currency: asset.currency || "USD",
      currentValue: String(asset.currentValue ?? ""),
      costBasis: asset.costBasis != null ? String(asset.costBasis) : "",
      quantity: asset.quantity != null ? String(asset.quantity) : "",
      isLiability: asset.isLiability,
      passiveIncomeMonthly: asset.passiveIncomeMonthly != null ? String(asset.passiveIncomeMonthly) : "",
      notes: asset.notes ?? "",
    });
    setEditingId(asset.id);
    setFormError(null);
    setModalVisible(true);
  }

  function parseOptional(value: string): number | null {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  async function submit() {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    const currentValue = Number(form.currentValue);
    if (!Number.isFinite(currentValue)) {
      setFormError("A valid current value is required");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        assetType: form.assetType,
        currency: form.currency || "USD",
        currentValue,
        costBasis: parseOptional(form.costBasis),
        quantity: parseOptional(form.quantity),
        isLiability: form.isLiability,
        passiveIncomeMonthly: parseOptional(form.passiveIncomeMonthly),
        notes: form.notes.trim() ? form.notes.trim() : null,
      };
      const res = await apiFetch(
        editingId ? `/api/user/assets/${editingId}` : "/api/user/assets",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Error ${res.status}`);
      }
      setModalVisible(false);
      setEditingId(null);
      setForm(emptyForm());
      await load();
    } catch (e: any) {
      setFormError(e.message ?? "Failed to save holding");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await apiFetch(`/api/user/assets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Couldn't remove this holding");
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, PortfolioAsset[]>();
    for (const asset of assets) {
      const list = map.get(asset.assetType) ?? [];
      list.push(asset);
      map.set(asset.assetType, list);
    }
    return Array.from(map.entries());
  }, [assets]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error) return <ScreenError message={error} onRetry={load} />;

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Net Worth</Text>
          <Text style={styles.summaryValue}>USD {(summary?.netWorth ?? 0).toLocaleString()}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summarySub}>
              Holdings {(summary?.totalAssets ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.summarySub}>
              Liabilities {(summary?.totalLiabilities ?? 0).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.summarySub}>
            Passive income {(summary?.totalPassiveIncomeMonthly ?? 0).toLocaleString()} / mo
          </Text>
        </View>

        {summary && summary.allocationByType.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allocation</Text>
            {summary.allocationByType.map((slice) => (
              <View key={slice.assetType} style={styles.allocRow}>
                <Text style={styles.allocLabel}>{assetTypeLabel(slice.assetType)}</Text>
                <View style={styles.allocBarTrack}>
                  <View style={[styles.allocBarFill, { width: `${Math.min(slice.pct, 100)}%` }]} />
                </View>
                <Text style={styles.allocPct}>{slice.pct.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        ) : null}

        {grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="pie-chart" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No holdings yet</Text>
            <Text style={styles.emptyBody}>Add what you own and owe to track your net worth</Text>
          </View>
        ) : (
          grouped.map(([type, list]) => (
            <View key={type} style={styles.section}>
              <Text style={styles.sectionTitle}>{assetTypeLabel(type)}</Text>
              {list.map((asset) => (
                <View key={asset.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={styles.itemName}>{asset.name}</Text>
                      {asset.isLiability ? <Text style={styles.liabilityTag}>Liability</Text> : null}
                    </View>
                    {asset.passiveIncomeMonthly != null ? (
                      <Text style={styles.itemType}>
                        {asset.currency} {asset.passiveIncomeMonthly.toLocaleString()} / mo
                      </Text>
                    ) : asset.notes ? (
                      <Text style={styles.itemType} numberOfLines={1}>
                        {asset.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.itemRight}>
                    <Text
                      style={[
                        styles.itemValue,
                        asset.isLiability ? { color: colors.mutedForeground } : null,
                      ]}
                    >
                      {asset.isLiability ? "-" : ""}
                      {asset.currency} {asset.currentValue.toLocaleString()}
                    </Text>
                    <View style={styles.itemActions}>
                      <Pressable onPress={() => openEdit(asset)} hitSlop={8} style={styles.actionBtn}>
                        <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                      </Pressable>
                      <Pressable onPress={() => remove(asset.id)} hitSlop={8} style={styles.actionBtn}>
                        <Feather name="trash-2" size={16} color={colors.destructive} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={openCreate}
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.navBar}>
            <Pressable onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.navTitle}>{editingId ? "Edit Holding" : "Add Holding"}</Text>
            <Pressable
              onPress={submit}
              disabled={saving}
              style={({ pressed }) => [styles.postBtn, { opacity: pressed || saving ? 0.7 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={styles.postBtnText}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {formError ? <Text style={styles.errorBanner}>{formError}</Text> : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="What do you own?"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pillRow}>
                  {ASSET_TYPES.map((t) => (
                    <Pressable
                      key={t.value}
                      onPress={() => setForm({ ...form, assetType: t.value })}
                      style={[styles.pill, form.assetType === t.value && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, form.assetType === t.value && styles.pillTextActive]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Current value</Text>
                <TextInput
                  style={styles.input}
                  value={form.currentValue}
                  onChangeText={(v) => setForm({ ...form, currentValue: v })}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Cost basis</Text>
                <TextInput
                  style={styles.input}
                  value={form.costBasis}
                  onChangeText={(v) => setForm({ ...form, costBasis: v })}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pillRow}>
                  {CURRENCIES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setForm({ ...form, currency: c })}
                      style={[styles.pill, form.currency === c && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, form.currency === c && styles.pillTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={form.quantity}
                  onChangeText={(v) => setForm({ ...form, quantity: v })}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Passive income / mo</Text>
                <TextInput
                  style={styles.input}
                  value={form.passiveIncomeMonthly}
                  onChangeText={(v) => setForm({ ...form, passiveIncomeMonthly: v })}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                placeholder="Optional"
                placeholderTextColor={colors.mutedForeground}
                multiline
              />
            </View>

            <Pressable
              onPress={() => setForm({ ...form, isLiability: !form.isLiability })}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, form.isLiability && styles.checkboxChecked]}>
                {form.isLiability ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>Track this as a liability</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { paddingBottom: 100 },
    summary: { padding: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 4 },
    summaryLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    summaryValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    summaryRow: { flexDirection: "row", gap: 16, marginTop: 4 },
    summarySub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    section: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    allocRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    allocLabel: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium", width: 96 },
    allocBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.muted, overflow: "hidden" },
    allocBarFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
    allocPct: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium", width: 48, textAlign: "right" },
    itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    itemInfo: { flex: 1, gap: 2 },
    itemNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    itemName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    liabilityTag: { fontSize: 10, fontFamily: "Inter_500Medium", color: colors.mutedForeground, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, overflow: "hidden" },
    itemType: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    itemRight: { alignItems: "flex-end", gap: 6 },
    itemValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    itemActions: { flexDirection: "row", gap: 14 },
    actionBtn: { padding: 2 },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    fab: { position: "absolute", right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    modalRoot: { flex: 1, backgroundColor: colors.background },
    navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    cancelBtn: { padding: 4 },
    cancelText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    navTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    postBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    postBtnText: { color: colors.primaryForeground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    form: { padding: 20, paddingBottom: 60 },
    errorBanner: { backgroundColor: colors.destructive + "20", color: colors.destructive, padding: 12, borderRadius: 8, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 12 },
    field: { gap: 6, marginBottom: 18 },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    input: { backgroundColor: colors.muted, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    inputMultiline: { height: 90, textAlignVertical: "top" },
    row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    pillRow: { flexDirection: "row", gap: 8 },
    pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    pillTextActive: { color: colors.primaryForeground },
    checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkboxLabel: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
  });
}
