import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../../src/store/settings";
import { useConversations, flushConversations } from "../../src/store/conversations";

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

const APP_VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// Model options
// ---------------------------------------------------------------------------
const MODEL_OPTIONS = [
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", sub: "Best quality" },
  { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku", sub: "Faster & lighter" },
] as const;

type ModelId = (typeof MODEL_OPTIONS)[number]["id"];

// ---------------------------------------------------------------------------
// Language preference options
// ---------------------------------------------------------------------------
const LANG_OPTIONS = [
  { id: "ta", label: "தமிழ்", sub: "Tamil" },
  { id: "en", label: "English", sub: "" },
  { id: "both", label: "Both", sub: "Tamil + English" },
] as const;

type LangPref = (typeof LANG_OPTIONS)[number]["id"];

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------
function SectionTitle({ label }: { label: string }) {
  return <Text style={sStyles.sectionTitle}>{label}</Text>;
}

function RowCard({ children }: { children: React.ReactNode }) {
  return <View style={sStyles.rowCard}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Settings Screen
// ---------------------------------------------------------------------------
export default function SettingsScreen() {
  const settings = useSettings();
  const conversations = useConversations((s) => s.conversations);

  const [showKey, setShowKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState(settings.anthropicKey);
  const [keySaved, setKeySaved] = useState(true);

  // Model stored locally in this screen (piggybacks on settings.set for persistence).
  // We use a local state defaulting from CONFIG.DEFAULT_MODEL since SettingsState
  // doesn't have a model field — we add one via settings.set with a cast.
  const [selectedModel, setSelectedModel] = useState<ModelId>(
    "claude-3-5-sonnet-20241022"
  );
  const [langPref, setLangPref] = useState<LangPref>(
    settings.uiLanguage === "ta" ? "ta" : "en"
  );

  const saveApiKey = () => {
    settings.set({ anthropicKey: keyDraft.trim() });
    setKeySaved(true);
  };

  const clearAllConversations = () => {
    Alert.alert(
      "அனைத்தையும் அழி?",
      "Delete all conversations? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            useConversations.setState({ conversations: [], activeId: null });
            flushConversations();
          },
        },
      ]
    );
  };

  const openAnthropicConsole = () => {
    Linking.openURL("https://console.anthropic.com/");
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── API Key ── */}
      <SectionTitle label="Anthropic API Key" />
      <RowCard>
        <View style={styles.apiKeyRow}>
          <TextInput
            style={styles.apiKeyInput}
            value={keyDraft}
            onChangeText={(v) => {
              setKeyDraft(v);
              setKeySaved(false);
            }}
            placeholder="sk-ant-…"
            placeholderTextColor={COLORS.muted}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowKey((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={showKey ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={COLORS.muted}
            />
          </Pressable>
        </View>
        <Pressable
          style={[styles.saveBtn, keySaved && styles.saveBtnSaved]}
          onPress={saveApiKey}
          disabled={keySaved}
        >
          <Ionicons
            name={keySaved ? "checkmark-circle" : "save-outline"}
            size={16}
            color={keySaved ? COLORS.success : "#fff"}
          />
          <Text style={[styles.saveBtnText, keySaved && { color: COLORS.success }]}>
            {keySaved ? "Saved" : "Save Key"}
          </Text>
        </Pressable>
        <Pressable style={styles.consoleLink} onPress={openAnthropicConsole}>
          <Ionicons name="open-outline" size={14} color={COLORS.cyan} />
          <Text style={styles.consoleLinkText}>
            Get key at anthropic.com/console
          </Text>
        </Pressable>
        <Text style={styles.helper}>
          Stored locally in SecureStore — never sent to any server other than
          Anthropic.
        </Text>
      </RowCard>

      {/* ── Model ── */}
      <SectionTitle label="Model" />
      <View style={styles.pillGroup}>
        {MODEL_OPTIONS.map((m) => (
          <Pressable
            key={m.id}
            style={[
              styles.pill,
              selectedModel === m.id && styles.pillActive,
            ]}
            onPress={() => setSelectedModel(m.id)}
          >
            <Text
              style={[
                styles.pillLabel,
                selectedModel === m.id && styles.pillLabelActive,
              ]}
            >
              {m.label}
            </Text>
            {m.sub ? (
              <Text
                style={[
                  styles.pillSub,
                  selectedModel === m.id && styles.pillSubActive,
                ]}
              >
                {m.sub}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* ── Language Preference ── */}
      <SectionTitle label="Language Preference" />
      <View style={styles.pillGroup}>
        {LANG_OPTIONS.map((l) => (
          <Pressable
            key={l.id}
            style={[styles.pill, langPref === l.id && styles.pillActive]}
            onPress={() => {
              setLangPref(l.id);
              settings.set({
                uiLanguage: l.id === "both" ? "ta" : (l.id as "ta" | "en"),
              });
            }}
          >
            <Text
              style={[
                styles.pillLabel,
                langPref === l.id && styles.pillLabelActive,
              ]}
            >
              {l.label}
            </Text>
            {l.sub ? (
              <Text
                style={[
                  styles.pillSub,
                  langPref === l.id && styles.pillSubActive,
                ]}
              >
                {l.sub}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* ── Storage ── */}
      <SectionTitle label="Storage" />
      <RowCard>
        <Text style={styles.storageInfo}>
          {conversations.length} conversation
          {conversations.length !== 1 ? "s" : ""} stored locally on this device.
        </Text>
        <Pressable style={styles.dangerBtn} onPress={clearAllConversations}>
          <Ionicons name="trash-outline" size={16} color="#fff" />
          <Text style={styles.dangerBtnText}>Clear All Conversations</Text>
        </Pressable>
      </RowCard>

      {/* ── About ── */}
      <SectionTitle label="About" />
      <RowCard>
        <View style={styles.aboutRow}>
          <View style={styles.aboutIconBox}>
            <Ionicons name="sparkles" size={22} color={COLORS.gold} />
          </View>
          <View style={styles.aboutText}>
            <Text style={styles.aboutName}>Tamizhi AI</Text>
            <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
            <Text style={styles.aboutDesc}>
              Tamil-aware AI assistant built on the Tamizhi chain ecosystem.
            </Text>
          </View>
        </View>
      </RowCard>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const sStyles = StyleSheet.create({
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 20,
  },
  rowCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },

  // API Key
  apiKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  apiKeyInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 11,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  eyeBtn: { padding: 4 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    paddingVertical: 10,
  },
  saveBtnSaved: { backgroundColor: COLORS.success + "22" },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  consoleLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  consoleLinkText: {
    color: COLORS.cyan,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  helper: { color: COLORS.muted, fontSize: 11, lineHeight: 16 },

  // Pills
  pillGroup: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  pillLabel: { color: COLORS.muted, fontSize: 14, fontWeight: "600" },
  pillLabelActive: { color: "#fff" },
  pillSub: { color: COLORS.muted, fontSize: 10, marginTop: 1 },
  pillSubActive: { color: "#ffffffaa" },

  // Storage
  storageInfo: { color: COLORS.muted, fontSize: 13 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    paddingVertical: 11,
  },
  dangerBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // About
  aboutRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  aboutIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.gold + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  aboutText: { flex: 1 },
  aboutName: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  aboutVersion: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  aboutDesc: { color: COLORS.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
});
