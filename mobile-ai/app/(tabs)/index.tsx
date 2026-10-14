import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConversations } from "../../src/store/conversations";
import { formatTimestamp } from "../../src/utils/tamil";

// ---------------------------------------------------------------------------
// Theme (matches design spec)
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
};

// ---------------------------------------------------------------------------
// Quick-start prompt cards data
// ---------------------------------------------------------------------------
interface QuickCard {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  prompt: string;
  color: string;
}

const QUICK_CARDS: QuickCard[] = [
  {
    id: "lit",
    icon: "book-outline",
    label: "Tamil Literature",
    prompt: "Tell me about Thirukkural — its structure, themes, and a famous couplet.",
    color: COLORS.gold,
  },
  {
    id: "stake",
    icon: "layers-outline",
    label: "Blockchain Help",
    prompt: "How do I stake TMZ tokens on the Tamizhi blockchain? Walk me through the steps.",
    color: COLORS.cyan,
  },
  {
    id: "history",
    icon: "time-outline",
    label: "Tamil History",
    prompt: "Give me an overview of the history of Tamil civilization from ancient Sangam to modern times.",
    color: COLORS.purple,
  },
  {
    id: "translate",
    icon: "language-outline",
    label: "Translate",
    prompt: "Translate the following English text to Tamil:\n\n",
    color: COLORS.success,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const router = useRouter();
  const conversations = useConversations((s) => s.conversations);
  const newConversation = useConversations((s) => s.newConversation);
  const setActive = useConversations((s) => s.setActive);

  const startNew = useCallback(
    (seed?: string) => {
      const conv = newConversation();
      setActive(conv.id);
      router.push({
        pathname: "/(tabs)/chat",
        params: seed ? { seed } : {},
      });
    },
    [newConversation, setActive, router]
  );

  const recentConvs = conversations.slice(0, 3);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.greeting}>வணக்கம்!</Text>
        <Text style={styles.subtitle}>Tamizhi AI Assistant</Text>
        <Text style={styles.tagline}>Tamil culture · blockchain · AI</Text>
      </View>

      {/* ── Quick-start 2×2 grid ── */}
      <Text style={styles.sectionLabel}>Quick Start</Text>
      <View style={styles.grid}>
        {QUICK_CARDS.map((card) => (
          <Pressable
            key={card.id}
            style={({ pressed }) => [
              styles.quickCard,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => startNew(card.prompt)}
          >
            <View
              style={[styles.quickCardIcon, { backgroundColor: card.color + "22" }]}
            >
              <Ionicons name={card.icon} size={22} color={card.color} />
            </View>
            <Text style={styles.quickCardLabel}>{card.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Recent conversations ── */}
      <Text style={styles.sectionLabel}>Recent</Text>
      {recentConvs.length === 0 ? (
        <View style={styles.emptyRecent}>
          <Ionicons name="chatbubbles-outline" size={36} color={COLORS.muted} />
          <Text style={styles.emptyRecentText}>No conversations yet</Text>
        </View>
      ) : (
        <View style={styles.recentList}>
          {recentConvs.map((conv) => (
            <Pressable
              key={conv.id}
              style={({ pressed }) => [
                styles.recentRow,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => router.push(`/conversation/${conv.id}`)}
            >
              <View style={styles.recentIcon}>
                <Ionicons name="sparkles" size={16} color={COLORS.gold} />
              </View>
              <View style={styles.recentText}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {conv.title}
                </Text>
                <Text style={styles.recentMeta}>
                  {conv.messages.length} msg · {formatTimestamp(conv.updatedAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {/* ── bottom spacer for FAB ── */}
      <View style={{ height: 96 }} />

      {/* ── Floating action button ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => startNew()}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 28,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 42,
    fontWeight: "900",
    color: COLORS.gold,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Section label
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },

  // 2×2 grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    width: "47%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  quickCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickCardLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },

  // Recent list
  recentList: {
    gap: 8,
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  recentIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.gold + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  recentText: {
    flex: 1,
  },
  recentTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  recentMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyRecent: {
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  emptyRecentText: {
    color: COLORS.muted,
    fontSize: 13,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 32,
    right: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.gold,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
