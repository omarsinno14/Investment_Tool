import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Message {
  id: string;
  body: string;
  senderId: string;
  createdAt?: string;
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const styles = makeStyles(colors);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/user/conversations/${id}/messages`);
    const data = await res.json().catch(() => ({ messages: [] }));
    setMessages((data.messages ?? []).reverse());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const body = text.trim();
    setText("");
    const res = await apiFetch(`/api/user/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.message) {
        setMessages((prev) => [data.message, ...prev]);
      }
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding" keyboardVerticalOffset={0}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{item.body}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        }
      />
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, { opacity: pressed || !text.trim() || sending ? 0.5 : 1 }]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          <Feather name="send" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { padding: 16, gap: 8, flexDirection: "column" },
    bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginVertical: 2 },
    bubbleMe: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    bubbleThem: { alignSelf: "flex-start", backgroundColor: colors.muted, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
    bubbleTextMe: { color: colors.primaryForeground },
    bubbleTextThem: { color: colors.foreground },
    emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
    textInput: { flex: 1, backgroundColor: colors.muted, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, maxHeight: 120 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  });
}
