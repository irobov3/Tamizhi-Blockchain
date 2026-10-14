import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConversations, flushConversations } from "../../src/store/conversations";
import { useSettings } from "../../src/store/settings";
import { streamClaude } from "../../src/ai/anthropic";

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#0a0a1a",
  card: "#111130",
  border: "#1e1e4a",
  gold: "#d4a017",
  purple: "#7c3aed",
  cyan: "#00d4ff",
  text: "#f0f0ff",
  muted: "#6060a0",
  success: "#00c48c",
  error: "#ff4d4d",
  userBubble: "#d4a017",
  aiBubble: "#1a1040",
};

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -6,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={tyStyles.wrap}>
      <View style={tyStyles.bubble}>
        <Text style={tyStyles.label}>தமிழி AI</Text>
        <View style={tyStyles.dots}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[tyStyles.dot, { transform: [{ translateY: dot }] }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const tyStyles = StyleSheet.create({
  wrap: { alignItems: "flex-start", paddingHorizontal: 14, marginVertical: 4 },
  bubble: {
    backgroundColor: COLORS.aiBubble,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: { color: COLORS.muted, fontSize: 10, fontWeight: "700", marginBottom: 4 },
  dots: { flexDirection: "row", gap: 5, alignItems: "center", height: 14 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.muted },
});

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <View style={[bubStyles.wrap, isUser ? bubStyles.wrapUser : bubStyles.wrapAI]}>
      {!isUser && <Text style={bubStyles.aiLabel}>தமிழி AI</Text>}
      <View style={[bubStyles.bubble, isUser ? bubStyles.bubbleUser : bubStyles.bubbleAI]}>
        <Text style={[bubStyles.text, isUser ? bubStyles.textUser : bubStyles.textAI]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const bubStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, marginVertical: 4, maxWidth: "82%" },
  wrapUser: { alignSelf: "flex-end", alignItems: "flex-end" },
  wrapAI: { alignSelf: "flex-start", alignItems: "flex-start" },
  aiLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700", marginBottom: 2 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: COLORS.userBubble, borderBottomRightRadius: 4 },
  bubbleAI: {
    backgroundColor: COLORS.aiBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: { fontSize: 15, lineHeight: 22 },
  textUser: { color: "#fff", fontWeight: "500" },
  textAI: { color: COLORS.text },
});

// ---------------------------------------------------------------------------
// Conversation Screen
// ---------------------------------------------------------------------------
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const conversations = useConversations((s) => s.conversations);
  const appendMessage = useConversations((s) => s.appendMessage);
  const updateLastAssistant = useConversations((s) => s.updateLastAssistant);
  const deleteConversation = useConversations((s) => s.deleteConversation);

  const settings = useSettings();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const conv = conversations.find((c) => c.id === id);

  if (!conv) {
    return (
      <View style={styles.notFound}>
        <Stack.Screen options={{ title: "Conversation" }} />
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
        <Text style={styles.notFoundText}>Conversation not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const onDelete = () => {
    Alert.alert("Delete Conversation?", conv.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteConversation(conv.id);
          router.back();
        },
      },
    ]);
  };

  const onShare = async () => {
    const transcript = conv.messages
      .map((m) => `${m.role === "user" ? "You" : "Tamizhi AI"}: ${m.content}`)
      .join("\n\n");
    try {
      await Share.share({ message: transcript, title: conv.title });
    } catch {}
  };

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      setError(null);

      appendMessage(id, { role: "user", content: text.trim() });
      appendMessage(id, { role: "assistant", content: "" });
      setInput("");
      setStreaming(true);

      const latestConv = useConversations
        .getState()
        .conversations.find((c) => c.id === id);
      if (!latestConv) { setStreaming(false); return; }

      const apiMsgs = latestConv.messages.filter(
        (m, i) =>
          !(i === latestConv.messages.length - 1 && m.role === "assistant" && m.content === "")
      );

      let acc = "";
      try {
        await streamClaude({
          apiKey: settings.anthropicKey,
          messages: apiMsgs,
          onDelta: (d) => {
            acc += d;
            updateLastAssistant(id, acc);
          },
          onDone: async () => {
            setStreaming(false);
            await flushConversations();
          },
          onError: (err) => {
            setError(err.message);
            setStreaming(false);
          },
        });
      } catch (err: any) {
        setError(err?.message ?? String(err));
        setStreaming(false);
      }
    },
    [id, streaming, appendMessage, updateLastAssistant, settings.anthropicKey]
  );

  const messages = conv.messages;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: conv.title,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Pressable
                style={styles.headerBtn}
                onPress={onShare}
                hitSlop={8}
              >
                <Ionicons name="share-outline" size={20} color={COLORS.muted} />
              </Pressable>
              <Pressable
                style={styles.headerBtn}
                onPress={onDelete}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </Pressable>
            </View>
          ),
        }}
      />

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <MessageBubble role={item.role} content={item.content} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={36} color={COLORS.muted} />
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
        ListFooterComponent={streaming ? <TypingIndicator /> : null}
      />

      {/* Error bar */}
      {error && (
        <View style={styles.errorBar}>
          <Ionicons name="warning" size={14} color={COLORS.error} />
          <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={16} color={COLORS.muted} />
          </Pressable>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Continue the conversation…"
          placeholderTextColor={COLORS.muted}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!streaming}
          returnKeyType="default"
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!input.trim() || streaming) && styles.sendBtnDisabled,
          ]}
          onPress={() => send(input)}
          disabled={!input.trim() || streaming}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  listContent: { paddingVertical: 12, flexGrow: 1 },

  notFound: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 32,
  },
  notFoundText: { color: COLORS.muted, fontSize: 16 },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: { color: COLORS.text, fontWeight: "700" },

  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48, gap: 10 },
  emptyText: { color: COLORS.muted, fontSize: 14 },

  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 4,
    padding: 10,
    backgroundColor: "#2d0a0a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error + "44",
  },
  errorText: { color: COLORS.error, fontSize: 12, flex: 1 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    paddingBottom: Platform.OS === "ios" ? 26 : 10,
    backgroundColor: "#0d0d24",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 120,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    lineHeight: 20,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.gold,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  sendBtnDisabled: { opacity: 0.35 },
});
