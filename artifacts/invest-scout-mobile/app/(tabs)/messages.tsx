import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Conversation {
  id: string;
  participants?: { user?: { id: string; profile?: { name?: string; username?: string } } }[];
  messages?: { body: string; createdAt: string; senderId: string }[];
  updatedAt?: string;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/conversations");
      const data = await res.json().catch(() => ({ conversations: [] }));
      setConversations(data.conversations ?? []);
    } catch {
      setError("Failed to load messages");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  function getOtherParticipant(conv: Conversation) {
    return conv.participants?.[0]?.user;
  }

  function getLastMessage(conv: Conversation) {
    return conv.messages?.[conv.messages.length - 1];
  }

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(i) => i.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const other = getOtherParticipant(item);
            const last = getLastMessage(item);
            const name = other?.profile?.name ?? other?.profile?.username ?? "User";
            return (
              <Pressable
                style={({ pressed }) => [styles.convRow, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push(`/conversation/${item.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convTop}>
                    <Text style={styles.convName}>{name}</Text>
                    <Text style={styles.timeText}>{timeAgo(last?.createdAt ?? item.updatedAt)}</Text>
                  </View>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {last?.body ?? "No messages yet"}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No conversations</Text>
              <Text style={styles.emptyBody}>Start a conversation by visiting a user's profile</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
    retryText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    listContent: { paddingBottom: 100 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    convRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarText: { color: colors.primaryForeground, fontSize: 18, fontFamily: "Inter_700Bold" },
    convInfo: { flex: 1 },
    convTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    convName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    timeText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    lastMessage: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptyBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
}
