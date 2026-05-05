import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useConversations } from '../../src/store/conversations';
import HeaderLogo from '../../src/components/HeaderLogo';
import TamilPromptSuggestions from '../../src/components/TamilPromptSuggestions';
import { CONFIG } from '../../src/config';
import { formatTimestamp } from '../../src/utils/tamil';

const T = CONFIG.THEME;

export default function HomeScreen() {
  const router = useRouter();
  const conversations = useConversations((s) => s.conversations);
  const newConversation = useConversations((s) => s.newConversation);
  const setActive = useConversations((s) => s.setActive);

  const startNew = (seed?: string) => {
    const conv = newConversation();
    setActive(conv.id);
    router.push({ pathname: '/(tabs)/chat', params: seed ? { seed } : {} });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <HeaderLogo subtitle="தமிழ் · AI · உதவியாளர்" />
      </View>

      <Pressable style={styles.cta} onPress={() => startNew()}>
        <Ionicons name="add-circle" size={22} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>புதிய உரையாடல்</Text>
          <Text style={styles.ctaSub}>Start a new chat</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </Pressable>

      <Text style={styles.sectionLabel}>பரிந்துரைகள் · Suggestions</Text>
      <TamilPromptSuggestions onSelect={(p) => startNew(p)} />

      <Text style={styles.sectionLabel}>சமீபத்திய · Recent</Text>
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={T.subtext} />
          <Text style={styles.emptyText}>உரையாடல் இல்லை</Text>
          <Text style={styles.emptySub}>No conversations yet</Text>
        </View>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={conversations.slice(0, 20)}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/conversation/${item.id}`)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="sparkles" size={18} color={T.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  {item.messages.length} messages · {formatTimestamp(item.updatedAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.subtext} />
            </Pressable>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  header: { padding: 16 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 16,
    padding: 16, borderRadius: 16,
    backgroundColor: T.primary,
    shadowColor: T.primary, shadowOpacity: 0.5, shadowRadius: 14,
  },
  ctaTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaSub: { color: '#ECE6FFcc', fontSize: 12 },
  sectionLabel: {
    color: T.subtext, fontSize: 12, fontWeight: '600',
    marginTop: 16, marginBottom: 6, marginHorizontal: 16,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  empty: { alignItems: 'center', padding: 32, gap: 6 },
  emptyText: { color: T.text, fontSize: 16, fontWeight: '600' },
  emptySub: { color: T.subtext, fontSize: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.card, padding: 12, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: T.border,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.inputBackground,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { color: T.text, fontSize: 14, fontWeight: '600' },
  rowMeta: { color: T.subtext, fontSize: 11, marginTop: 2 },
});
