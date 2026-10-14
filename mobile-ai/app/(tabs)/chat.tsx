import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConversations, type Conversation } from "../../src/store/conversations";
import { useSettings } from "../../src/store/settings";
import { streamClaude } from "../../src/ai/anthropic";
import { flushConversations } from "../../src/store/conversations";

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
// Typing indicator — 3 animated dots
// ---------------------------------------------------------------------------
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
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
    maxWidth: "75%",
  },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dots: { flexDirection: "row", gap: 5, alignItems: "center", height: 14 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.muted,
  },
});

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
interface BubbleProps {
  role: "user" | "assistant";
  content: string;
}

function MessageBubble({ role, content }: BubbleProps) {
  const isUser = role === "user";
  return (
    <View
      style={[
        bubStyles.wrap,
        isUser ? bubStyles.wrapUser : bubStyles.wrapAI,
      ]}
    >
      {!isUser && <Text style={bubStyles.aiLabel}>தமிழி AI</Text>}
      <View
        style={[
          bubStyles.bubble,
          isUser ? bubStyles.bubbleUser : bubStyles.bubbleAI,
        ]}
      >
        <Text
          style={[
            bubStyles.text,
            isUser ? bubStyles.textUser : bubStyles.textAI,
          ]}
        >
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
  aiLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
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
// API key missing banner
// ---------------------------------------------------------------------------
function NoKeyBanner() {
  const router = useRouter();
  return (
    <View style={noKeyStyles.wrap}>
      <Ionicons name="key-outline" size={20} color={COLORS.gold} />
      <Text style={noKeyStyles.text}>
        No API key set. Go to{" "}
        <Text
          style={noKeyStyles.link}
          onPress={() => router.push("/(tabs)/settings")}
        >
          Settings
        </Text>{" "}
        to add your Anthropic key.
      </Text>
    </View>
  );
}

const noKeyStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 12,
    padding: 12,
    backgroundColor: COLORS.gold + "18",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + "44",
  },
  text: { color: COLORS.text, fontSize: 13, flex: 1, lineHeight: 18 },
  link: { color: COLORS.gold, fontWeight: "700", textDecorationLine: "underline" },
});

// ---------------------------------------------------------------------------
// Main Chat Screen
// ---------------------------------------------------------------------------
export default function ChatScreen() {
  const params = useLocalSearchParams<{ seed?: string }>();
  const conversations = useConversations((s) => s.conversations);
  const activeId = useConversations((s) => s.activeId);
  const setActive = useConversations((s) => s.setActive);
  const newConversation = useConversations((s) => s.newConversation);
  const appendMessage = useConversations((s) => s.appendMessage);
  const updateLastAssistant = useConversations((s) => s.updateLastAssistant);

  const settings = useSettings();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const seedApplied = useRef(false);

  // Ensure an active conversation exists
  const active: Conversation | undefined = conversations.find(
    (c) => c.id === activeId
  );

  useEffect(() => {
    if (!active) {
      const c = newConversation();
      setActive(c.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply seed prompt once on mount
  useEffect(() => {
    if (!seedApplied.current && params.seed && typeof params.seed === "string") {
      seedApplied.current = true;
      setInput(params.seed);
    }
  }, [params.seed]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      setError(null);

      let convId = activeId;
      if (!convId) {
        const c = newConversation();
        setActive(c.id);
        convId = c.id;
      }

      appendMessage(convId, { role: "user", content: text.trim() });
      appendMessage(convId, { role: "assistant", content: "" });
      setInput("");
      setStreaming(true);

      const conv = useConversations
        .getState()
        .conversations.find((c) => c.id === convId);
      if (!conv) {
        setStreaming(false);
        return;
      }

      const apiMsgs = conv.messages.filter(
        (m, i) =>
          !(
            i === conv.messages.length - 1 &&
            m.role === "assistant" &&
            m.content === ""
          )
      );

      let acc = "";
      try {
        await streamClaude({
          apiKey: settings.anthropicKey,
          messages: apiMsgs,
          onDelta: (d) => {
            acc += d;
            updateLastAssistant(convId!, acc);
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
    [
      streaming,
      activeId,
      newConversation,
      setActive,
      appendMessage,
      updateLastAssistant,
      settings.anthropicKey,
    ]
  );

  const messages = active?.messages ?? [];
  const hasKey = Boolean(settings.anthropicKey);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
      keyboardVerticalOffset={90}
    >
      {/* API key warning */}
      {!hasKey && <NoKeyBanner />}

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <MessageBubble role={item.role} content={item.content} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="sparkles-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>எதையும் கேளுங்கள்</Text>
            <Text style={styles.emptySub}>
              Ask anything in Tamil or English
            </Text>
          </View>
        }
        ListFooterComponent={streaming ? <TypingIndicator /> : null}
      />

      {/* Error bar */}
      {error && (
        <View style={styles.errorBar}>
          <Ionicons name="warning" size={14} color={COLORS.error} />
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={16} color={COLORS.muted} />
          </Pressable>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="உங்கள் கேள்வி… / Ask something"
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

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 64, gap: 10 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  emptySub: { color: COLORS.muted, fontSize: 13 },

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
