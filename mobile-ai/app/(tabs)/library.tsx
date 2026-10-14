import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConversations } from "../../src/store/conversations";

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
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface LibraryCard {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
}

interface LibrarySection {
  id: string;
  heading: string;
  subheading: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  cards: LibraryCard[];
}

const SECTIONS: LibrarySection[] = [
  {
    id: "classics",
    heading: "Tamil Classics",
    subheading: "இலக்கியம் · Literature",
    icon: "book-outline",
    color: COLORS.gold,
    cards: [
      {
        id: "thirukkural",
        title: "Thirukkural",
        description:
          "133 chapters of timeless wisdom by Thiruvalluvar on virtue, wealth, and love.",
        prompt:
          "Tell me about Thirukkural — its author Thiruvalluvar, the three sections (Aram, Porul, Inbam), and give me a famous couplet with Tamil text and meaning.",
        icon: "star-outline",
        accent: COLORS.gold,
      },
      {
        id: "silappatikaram",
        title: "Silappatikaram",
        description:
          "Epic tale of Kannagi and Kovalan by Ilanko Adigal — one of the Five Great Epics.",
        prompt:
          "Explain Silappatikaram — its story, significance as one of the Five Great Epics of Tamil literature, and why the story of Kannagi remains powerful today.",
        icon: "flame-outline",
        accent: COLORS.gold,
      },
      {
        id: "manimekalai",
        title: "Manimekalai",
        description:
          "Buddhist epic sequel to Silappatikaram, exploring philosophy and compassion.",
        prompt:
          "Describe Manimekalai — the Buddhist epic, its protagonist, its themes of compassion and liberation, and how it connects to Silappatikaram.",
        icon: "leaf-outline",
        accent: COLORS.gold,
      },
      {
        id: "purananuru",
        title: "Purananuru",
        description:
          "400 Sangam age poems on war, kingship, and heroism from ancient Tamil Nadu.",
        prompt:
          "What is Purananuru? Describe the Sangam age poetry collection, its themes of war and kingship, and give me an example poem with translation.",
        icon: "shield-outline",
        accent: COLORS.gold,
      },
    ],
  },
  {
    id: "blockchain",
    heading: "Tamizhi Blockchain",
    subheading: "சங்கிலி · Chain",
    icon: "layers-outline",
    color: COLORS.cyan,
    cards: [
      {
        id: "staking",
        title: "How to Stake",
        description:
          "Earn rewards by delegating TMZ tokens to validators on the Tamizhi chain.",
        prompt:
          "How do I stake TMZ tokens on the Tamizhi blockchain? Explain the delegation process, how to choose a validator, and what rewards to expect.",
        icon: "trending-up-outline",
        accent: COLORS.cyan,
      },
      {
        id: "explorer",
        title: "Explorer Guide",
        description:
          "Navigate the Tamizhi block explorer to read transactions and validator info.",
        prompt:
          "Guide me through using the Tamizhi blockchain explorer. How do I search for transactions, check validator status, and read block details?",
        icon: "search-outline",
        accent: COLORS.cyan,
      },
      {
        id: "wallet",
        title: "Wallet Guide",
        description:
          "Set up a Tamizhi-compatible wallet to hold, send, and receive TMZ tokens.",
        prompt:
          "How do I set up a wallet for the Tamizhi blockchain? Which wallets support TMZ tokens, and what are the steps to send and receive them?",
        icon: "wallet-outline",
        accent: COLORS.cyan,
      },
      {
        id: "contracts",
        title: "Smart Contracts",
        description:
          "Deploy and interact with CosmWasm smart contracts on the Tamizhi chain.",
        prompt:
          "How do smart contracts work on the Tamizhi blockchain? Explain CosmWasm, how to deploy a contract, and give an example use case.",
        icon: "code-slash-outline",
        accent: COLORS.cyan,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------
function KnowledgeCard({
  card,
  onAskAI,
}: {
  card: LibraryCard;
  onAskAI: (prompt: string) => void;
}) {
  return (
    <View style={cardStyles.wrap}>
      <View style={cardStyles.row}>
        <View
          style={[
            cardStyles.iconBox,
            { backgroundColor: card.accent + "22" },
          ]}
        >
          <Ionicons name={card.icon} size={20} color={card.accent} />
        </View>
        <View style={cardStyles.titleBlock}>
          <Text style={cardStyles.title}>{card.title}</Text>
          <Text style={cardStyles.desc} numberOfLines={2}>
            {card.description}
          </Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          cardStyles.askBtn,
          { borderColor: card.accent + "55" },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => onAskAI(card.prompt)}
      >
        <Ionicons name="sparkles" size={14} color={card.accent} />
        <Text style={[cardStyles.askBtnText, { color: card.accent }]}>
          Ask AI
        </Text>
      </Pressable>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  titleBlock: { flex: 1 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  desc: { color: COLORS.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  askBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  askBtnText: { fontSize: 13, fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function LibraryScreen() {
  const router = useRouter();
  const newConversation = useConversations((s) => s.newConversation);
  const setActive = useConversations((s) => s.setActive);

  const [query, setQuery] = useState("");

  const askAI = useCallback(
    (prompt: string) => {
      const conv = newConversation();
      setActive(conv.id);
      router.push({ pathname: "/(tabs)/chat", params: { seed: prompt } });
    },
    [newConversation, setActive, router]
  );

  const filteredSections = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.map((section) => ({
      ...section,
      cards: section.cards.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      ),
    })).filter((s) => s.cards.length > 0);
  }, [query]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search library…"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      {filteredSections.length === 0 ? (
        <View style={styles.noResults}>
          <Ionicons name="search-outline" size={36} color={COLORS.muted} />
          <Text style={styles.noResultsText}>No results for "{query}"</Text>
        </View>
      ) : (
        filteredSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBox,
                  { backgroundColor: section.color + "22" },
                ]}
              >
                <Ionicons name={section.icon} size={18} color={section.color} />
              </View>
              <View>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                <Text style={styles.sectionSubheading}>
                  {section.subheading}
                </Text>
              </View>
            </View>
            {section.cards.map((card) => (
              <KnowledgeCard key={card.id} card={card} onAskAI={askAI} />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubheading: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 1,
  },

  noResults: { alignItems: "center", padding: 40, gap: 10 },
  noResultsText: { color: COLORS.muted, fontSize: 14 },
});
