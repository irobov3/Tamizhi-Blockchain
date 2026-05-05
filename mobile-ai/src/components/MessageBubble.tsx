import React from 'react';
import { View, Text, StyleSheet, Pressable, Clipboard, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../config';
import { shortTime } from '../utils/tamil';

const T = CONFIG.THEME;

interface Props {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export default function MessageBubble({ role, content, timestamp, streaming }: Props) {
  const isUser = role === 'user';

  const onCopy = () => {
    if (Platform.OS === 'web') return;
    // RN Clipboard from 'react-native' is deprecated but works.
    // expo-clipboard would be cleaner; using built-in to avoid extra dep.
    try {
      // @ts-ignore
      Clipboard.setString(content);
    } catch {}
  };

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAI,
        ]}
      >
        {isUser ? (
          <Text style={styles.userText}>{content}</Text>
        ) : (
          <Markdown style={mdStyles}>{content || (streaming ? '...' : '')}</Markdown>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>{shortTime(timestamp)}</Text>
          {!isUser && content.length > 0 && (
            <Pressable onPress={onCopy} hitSlop={8}>
              <Ionicons name="copy-outline" size={13} color={T.subtext} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, marginVertical: 4, flexDirection: 'row' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: T.bubbleUser,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: T.bubbleAI,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  timeText: { color: T.subtext, fontSize: 10 },
});

const mdStyles = StyleSheet.create({
  body: { color: T.text, fontSize: 15, lineHeight: 22 },
  heading1: { color: T.text, fontWeight: '700', fontSize: 20 },
  heading2: { color: T.text, fontWeight: '700', fontSize: 18 },
  heading3: { color: T.text, fontWeight: '700', fontSize: 16 },
  strong: { color: T.text, fontWeight: '700' },
  em: { color: T.text, fontStyle: 'italic' },
  link: { color: T.accent },
  bullet_list: { color: T.text },
  ordered_list: { color: T.text },
  code_inline: {
    color: T.accent,
    backgroundColor: T.inputBackground,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    color: T.text,
    backgroundColor: T.inputBackground,
    padding: 8,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fence: {
    color: T.text,
    backgroundColor: T.inputBackground,
    padding: 8,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  blockquote: {
    backgroundColor: T.inputBackground,
    borderLeftColor: T.primary,
    borderLeftWidth: 3,
    paddingLeft: 8,
    color: T.subtext,
  },
});
