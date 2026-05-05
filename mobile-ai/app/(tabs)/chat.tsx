import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MessageBubble from '../../src/components/MessageBubble';
import VoiceInputButton from '../../src/components/VoiceInputButton';
import { useConversations, type Conversation } from '../../src/store/conversations';
import { useSettings } from '../../src/store/settings';
import { streamClaude } from '../../src/ai/anthropic';
import { speak } from '../../src/ai/voice';
import { CONFIG } from '../../src/config';
import { flushConversations } from '../../src/store/conversations';

const T = CONFIG.THEME;

export default function ChatScreen() {
  const params = useLocalSearchParams<{ seed?: string }>();
  const conversations = useConversations((s) => s.conversations);
  const activeId = useConversations((s) => s.activeId);
  const setActive = useConversations((s) => s.setActive);
  const newConversation = useConversations((s) => s.newConversation);
  const appendMessage = useConversations((s) => s.appendMessage);
  const updateLastAssistant = useConversations((s) => s.updateLastAssistant);

  const settings = useSettings();

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  // Resolve active conversation: create if needed.
  const active: Conversation | undefined = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    if (!active) {
      const c = newConversation();
      setActive(c.id);
    }
  }, [active]);

  // Apply seed prompt once on mount if provided.
  useEffect(() => {
    if (params.seed && typeof params.seed === 'string') {
      setInput(params.seed);
    }
  }, [params.seed]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    setError(null);
    let convId = activeId;
    if (!convId) {
      const c = newConversation();
      setActive(c.id);
      convId = c.id;
    }
    appendMessage(convId, { role: 'user', content: text.trim() });
    appendMessage(convId, { role: 'assistant', content: '' });
    setInput('');
    setStreaming(true);

    // We must capture latest message list AFTER appendMessage. Use store getter.
    const conv = useConversations.getState().conversations.find((c) => c.id === convId);
    if (!conv) {
      setStreaming(false);
      return;
    }
    // The trailing empty assistant message shouldn't be sent to the API.
    const apiMsgs = conv.messages.filter(
      (m, i) => !(i === conv.messages.length - 1 && m.role === 'assistant' && m.content === ''),
    );

    let acc = '';
    try {
      if (settings.provider !== 'anthropic') {
        throw new Error(`${settings.provider} provider not yet implemented. Switch to Anthropic in Settings.`);
      }
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
          if (settings.speakResponses) speak(acc, settings.voiceLocale);
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
  };

  const messages = active?.messages ?? [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => (
          <MessageBubble
            role={item.role}
            content={item.content}
            timestamp={item.timestamp}
            streaming={streaming && index === messages.length - 1 && item.role === 'assistant'}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="sparkles-outline" size={42} color={T.subtext} />
            <Text style={styles.emptyText}>எதையும் கேளுங்கள்</Text>
            <Text style={styles.emptySub}>Ask anything in Tamil or English</Text>
          </View>
        }
      />

      {error ? (
        <View style={styles.errorBar}>
          <Ionicons name="warning" size={14} color={T.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputBar}>
        <Pressable style={styles.iconBtn} hitSlop={8} onPress={() => {}}>
          <Ionicons name="image-outline" size={20} color={T.subtext} />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="உங்கள் கேள்வி... / Ask something"
          placeholderTextColor={T.subtext}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!streaming}
        />
        <VoiceInputButton onTranscript={(t) => setInput(t)} disabled={streaming} />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || streaming) && { opacity: 0.4 }]}
          onPress={() => send(input)}
          disabled={!input.trim() || streaming}
        >
          {streaming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  empty: { alignItems: 'center', padding: 64, gap: 8 },
  emptyText: { color: T.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: T.subtext, fontSize: 12 },
  errorBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 8, backgroundColor: '#3a0d1a', marginHorizontal: 12, borderRadius: 8,
  },
  errorText: { color: T.danger, fontSize: 12, flex: 1 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.inputBackground,
  },
  input: {
    flex: 1, color: T.text, fontSize: 15,
    maxHeight: 120,
    backgroundColor: T.inputBackground,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
