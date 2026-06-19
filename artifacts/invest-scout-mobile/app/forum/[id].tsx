import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
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

interface ForumPost {
  id: string;
  title: string;
  body?: string;
  type?: string;
  tags?: string[];
  author?: { name?: string; username?: string };
  createdAt?: string;
  _count?: { reactions?: number; comments?: number };
}

interface Comment {
  id: string;
  body: string;
  author?: { name?: string; username?: string };
  createdAt?: string;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ForumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const styles = makeStyles(colors);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [postRes, commentsRes] = await Promise.all([
        apiFetch(`/api/forums/${id}`),
        apiFetch(`/api/forums/${id}/comments`),
      ]);
      const postData = await postRes.json().catch(() => ({}));
      const commentsData = await commentsRes.json().catch(() => ({ comments: [] }));
      if (!postRes.ok) throw new Error(postData?.error ?? "Not found");
      setPost(postData.post ?? postData);
      setLiked(postData.isLiked ?? false);
      setComments(commentsData.comments ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function toggleLike() {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    await apiFetch(`/api/forums/${id}/react`, {
      method: "POST",
      body: JSON.stringify({ type: "LIKE" }),
    }).catch(() => {});
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    setSubmitting(true);
    const body = commentText.trim();
    setCommentText("");
    const res = await apiFetch(`/api/forums/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.comment) setComments((prev) => [...prev, data.comment]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (error || !post) return (
    <View style={styles.center}>
      <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
      <Text style={styles.errorText}>{error ?? "Post not found"}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding" keyboardVerticalOffset={0}>
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.postCard}>
              {post.type ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{post.type}</Text>
                </View>
              ) : null}
              <Text style={styles.postTitle}>{post.title}</Text>
              {post.body ? <Text style={styles.postBody}>{post.body}</Text> : null}
              <View style={styles.postMeta}>
                <Text style={styles.authorText}>{post.author?.name ?? "Anonymous"}</Text>
                <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [styles.likeBtn, liked && styles.likeBtnActive, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={toggleLike}
                >
                  <Feather name="heart" size={16} color={liked ? colors.primaryForeground : colors.foreground} />
                  <Text style={[styles.likeBtnText, liked && { color: colors.primaryForeground }]}>
                    {(post._count?.reactions ?? 0) + (liked ? 1 : 0)}
                  </Text>
                </Pressable>
                <View style={styles.commentCount}>
                  <Feather name="message-circle" size={16} color={colors.mutedForeground} />
                  <Text style={styles.commentCountText}>{comments.length} comments</Text>
                </View>
              </View>
            </View>
            {comments.length > 0 ? (
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarText}>{(item.author?.name ?? "?").charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{item.author?.name ?? "Anonymous"}</Text>
                <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.commentBody}>{item.body}</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={28} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
          </View>
        }
      />
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.textInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={500}
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, { opacity: pressed || !commentText.trim() || submitting ? 0.5 : 1 }]}
          onPress={submitComment}
          disabled={!commentText.trim() || submitting}
        >
          <Feather name="send" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    errorText: { color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    listContent: { paddingBottom: 20 },
    postCard: { padding: 20, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    typeBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.muted, borderRadius: 20 },
    typeText: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, textTransform: "uppercase" },
    postTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.3, lineHeight: 30 },
    postBody: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 24 },
    postMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    authorText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    timeText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    actionRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    likeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border },
    likeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    likeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    commentCount: { flexDirection: "row", alignItems: "center", gap: 6 },
    commentCountText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    commentsHeader: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.background },
    commentsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 62 },
    commentCard: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: "flex-start" },
    commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    commentAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.mutedForeground },
    commentContent: { flex: 1, gap: 4 },
    commentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    commentTime: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    commentBody: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
    textInput: { flex: 1, backgroundColor: colors.muted, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, maxHeight: 100 },
    sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  });
}
