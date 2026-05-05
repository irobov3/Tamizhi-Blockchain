import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, Switch, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProviderSelector from '../../src/components/ProviderSelector';
import { useSettings } from '../../src/store/settings';
import { useConversations, flushConversations } from '../../src/store/conversations';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;

export default function SettingsScreen() {
  const settings = useSettings();
  const conversations = useConversations((s) => s.conversations);
  const [showKey, setShowKey] = useState(false);

  const clearAll = () => {
    Alert.alert(
      'அனைத்தையும் அழி?',
      'Delete all conversations? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            useConversations.setState({ conversations: [], activeId: null });
            // Force-write empty list
            flushConversations();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 18 }}>
      <View>
        <Text style={styles.sectionLabel}>AI Provider</Text>
        <ProviderSelector
          value={settings.provider}
          onChange={(p) => settings.set({ provider: p })}
        />
      </View>

      {settings.provider === 'anthropic' && (
        <View>
          <Text style={styles.sectionLabel}>Anthropic API Key</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={settings.anthropicKey}
              onChangeText={(v) => settings.set({ anthropicKey: v })}
              placeholder="sk-ant-..."
              placeholderTextColor={T.subtext}
              secureTextEntry={!showKey}
              autoCapitalize="none"
            />
            <Pressable style={styles.eye} onPress={() => setShowKey((v) => !v)}>
              <Ionicons name={showKey ? 'eye-off' : 'eye'} size={18} color={T.subtext} />
            </Pressable>
          </View>
          <Text style={styles.helper}>
            Stored locally in SecureStore. Never sent to chain.
          </Text>
        </View>
      )}

      {settings.provider === 'openai' && (
        <View>
          <Text style={styles.sectionLabel}>OpenAI API Key</Text>
          <TextInput
            style={[styles.input, { paddingRight: 12 }]}
            value={settings.openaiKey}
            onChangeText={(v) => settings.set({ openaiKey: v })}
            placeholder="sk-..."
            placeholderTextColor={T.subtext}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text style={styles.helper}>OpenAI integration not yet wired (stub).</Text>
        </View>
      )}

      {settings.provider === 'ollama' && (
        <View>
          <Text style={styles.sectionLabel}>Ollama URL</Text>
          <TextInput
            style={[styles.input, { paddingRight: 12 }]}
            value={settings.ollamaUrl}
            onChangeText={(v) => settings.set({ ollamaUrl: v })}
            placeholder="http://localhost:11434"
            placeholderTextColor={T.subtext}
            autoCapitalize="none"
          />
          <Text style={styles.helper}>Ollama integration not yet wired (stub).</Text>
        </View>
      )}

      <View>
        <Text style={styles.sectionLabel}>UI Language</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['ta', 'en'] as const).map((l) => (
            <Pressable
              key={l}
              style={[styles.pill, settings.uiLanguage === l && styles.pillActive]}
              onPress={() => settings.set({ uiLanguage: l })}
            >
              <Text style={[styles.pillText, settings.uiLanguage === l && styles.pillTextActive]}>
                {l === 'ta' ? 'தமிழ்' : 'English'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>Voice (TTS) Locale</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['ta-IN', 'en-US', 'en-IN'].map((l) => (
            <Pressable
              key={l}
              style={[styles.pill, settings.voiceLocale === l && styles.pillActive]}
              onPress={() => settings.set({ voiceLocale: l })}
            >
              <Text style={[styles.pillText, settings.voiceLocale === l && styles.pillTextActive]}>
                {l}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>பதிலை குரலில் வாசி</Text>
          <Text style={styles.toggleSub}>Speak AI responses aloud</Text>
        </View>
        <Switch
          value={settings.speakResponses}
          onValueChange={(v) => settings.set({ speakResponses: v })}
          trackColor={{ true: T.primary, false: T.border }}
        />
      </View>

      <View>
        <Text style={styles.sectionLabel}>Storage</Text>
        <Text style={styles.helper}>
          {conversations.length} conversation{conversations.length === 1 ? '' : 's'} stored locally.
        </Text>
        <Pressable style={styles.dangerBtn} onPress={clearAll}>
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.dangerBtnText}>Delete all conversations</Text>
        </Pressable>
      </View>

      <View style={styles.about}>
        <Text style={styles.aboutTitle}>Tamizhi AI</Text>
        <Text style={styles.aboutSub}>
          Tamil-aware AI assistant. v1.0.0. Built on the Tamizhi chain ecosystem.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  sectionLabel: {
    color: T.subtext, fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.inputBackground, borderRadius: 12,
    borderWidth: 1, borderColor: T.border,
  },
  input: {
    flex: 1, color: T.text, fontSize: 14,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: T.inputBackground, borderRadius: 12,
    borderWidth: 1, borderColor: T.border,
  },
  eye: { padding: 12 },
  helper: { color: T.subtext, fontSize: 11, marginTop: 6 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: T.inputBackground, borderWidth: 1, borderColor: T.border,
  },
  pillActive: { backgroundColor: T.primary, borderColor: T.primary },
  pillText: { color: T.subtext, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: T.card, borderRadius: 12,
    borderWidth: 1, borderColor: T.border,
  },
  toggleLabel: { color: T.text, fontSize: 14, fontWeight: '600' },
  toggleSub: { color: T.subtext, fontSize: 11 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.danger, padding: 12, borderRadius: 12,
    justifyContent: 'center', marginTop: 8,
  },
  dangerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  about: {
    marginTop: 16, alignItems: 'center', gap: 4,
    paddingVertical: 16, opacity: 0.7,
  },
  aboutTitle: { color: T.text, fontSize: 14, fontWeight: '800' },
  aboutSub: { color: T.subtext, fontSize: 11, textAlign: 'center' },
});
