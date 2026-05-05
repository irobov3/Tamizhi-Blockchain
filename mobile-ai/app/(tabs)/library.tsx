import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../src/config';
import { useConversations } from '../../src/store/conversations';

const T = CONFIG.THEME;

interface SavedPrompt {
  id: string;
  title_ta: string;
  title_en: string;
  body: string;
}

const SAVED: SavedPrompt[] = [
  {
    id: 'p1',
    title_ta: 'தமிழ் கவிதை மொழிபெயர்ப்பு',
    title_en: 'Translate Tamil poem',
    body: 'Translate the following Tamil poem into English while preserving meter and imagery:\n\n',
  },
  {
    id: 'p2',
    title_ta: 'திருக்குறள் விளக்கம்',
    title_en: 'Explain a Thirukkural',
    body: 'Quote the following Thirukkural couplet, give literal meaning, then a short modern explanation in Tamil and English:\n\n',
  },
  {
    id: 'p3',
    title_ta: 'ஆவணச் சுருக்கம்',
    title_en: 'Summarize document',
    body: 'Summarize the document below in 5 bullet points (Tamil), then give a one-sentence English summary:\n\n',
  },
  {
    id: 'p4',
    title_ta: 'குறிப்பேடு வடிவில் பதில்',
    title_en: 'Reply as study notes',
    body: 'Answer the question as Tamil-medium study notes with headings, bullet points, and an example.',
  },
  {
    id: 'p5',
    title_ta: 'ஆங்கிலம் → தமிழ் மொழிபெயர்ப்பு',
    title_en: 'English → Tamil translation',
    body: 'Translate the following English text into formal Tamil:\n\n',
  },
];

export default function LibraryScreen() {
  const router = useRouter();
  const newConversation = useConversations((s) => s.newConversation);
  const setActive = useConversations((s) => s.setActive);

  const usePrompt = (p: SavedPrompt) => {
    const c = newConversation(p.title_ta);
    setActive(c.id);
    router.push({ pathname: '/(tabs)/chat', params: { seed: p.body } });
  };

  return (
    <FlatList
      style={styles.root}
      data={SAVED}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      ListHeaderComponent={
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.h1}>பாதுகாக்கப்பட்ட தூண்டுதல்கள்</Text>
          <Text style={styles.h2}>Saved prompts</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => usePrompt(item)}>
          <View style={styles.iconBox}>
            <Ionicons name="bookmark" size={18} color={T.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title_ta}</Text>
            <Text style={styles.cardSub}>{item.title_en}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.subtext} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  h1: { color: T.text, fontSize: 18, fontWeight: '800' },
  h2: { color: T.subtext, fontSize: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: T.card, borderRadius: 14,
    borderWidth: 1, borderColor: T.border,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: T.inputBackground,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: T.text, fontSize: 14, fontWeight: '700' },
  cardSub: { color: T.subtext, fontSize: 12, marginTop: 2 },
});
