import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MessageBubble from '../../src/components/MessageBubble';
import { useConversations } from '../../src/store/conversations';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const conv = useConversations((s) => s.conversations.find((c) => c.id === id));
  const deleteConversation = useConversations((s) => s.deleteConversation);
  const setActive = useConversations((s) => s.setActive);

  const transcript = useMemo(() => {
    if (!conv) return '';
    return conv.messages
      .map((m) => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n');
  }, [conv]);

  if (!conv) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Conversation not found</Text>
      </View>
    );
  }

  const onDelete = () => {
    Alert.alert('Delete?', 'Delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deleteConversation(conv.id);
          router.back();
        },
      },
    ]);
  };

  const onShare = async () => {
    try {
      await Share.share({ message: transcript, title: conv.title });
    } catch {}
  };

  const onContinue = () => {
    setActive(conv.id);
    router.push('/(tabs)/chat');
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: conv.title }} />
      <FlatList
        data={conv.messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <MessageBubble
            role={item.role}
            content={item.content}
            timestamp={item.timestamp}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages</Text>
          </View>
        }
      />
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={onContinue}>
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={styles.toolBtnText}>Continue</Text>
        </Pressable>
        <Pressable style={[styles.toolBtn, styles.toolBtnSecondary]} onPress={onShare}>
          <Ionicons name="share-outline" size={18} color={T.text} />
          <Text style={[styles.toolBtnText, { color: T.text }]}>Share</Text>
        </Pressable>
        <Pressable style={[styles.toolBtn, styles.toolBtnDanger]} onPress={onDelete}>
          <Ionicons name="trash" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: T.subtext, fontSize: 14 },
  toolbar: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface,
  },
  toolBtn: {
    flex: 1, flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.primary, paddingVertical: 12, borderRadius: 12,
  },
  toolBtnSecondary: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  toolBtnDanger: { backgroundColor: T.danger, flex: 0, paddingHorizontal: 16 },
  toolBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
