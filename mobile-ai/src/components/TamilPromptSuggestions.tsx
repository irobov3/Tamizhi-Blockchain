import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { CONFIG } from '../config';

const T = CONFIG.THEME;

export const SUGGESTIONS: { ta: string; en: string }[] = [
  { ta: 'திருக்குறளில் ஒரு பாடலை விளக்கு', en: 'Explain a Thirukkural couplet' },
  { ta: 'தமிழில் ஒரு கவிதை எழுது', en: 'Write a Tamil poem' },
  { ta: 'சங்க இலக்கியம் பற்றி சொல்', en: 'Tell me about Sangam literature' },
  { ta: 'சிலப்பதிகாரம் சுருக்கம்', en: 'Summarize Silappathikaram' },
  { ta: 'ஆங்கிலத்தில் இருந்து தமிழுக்கு மொழிபெயர்', en: 'Translate English to Tamil' },
  { ta: 'வீட்டுப்பாடம் உதவி', en: 'Homework help' },
];

export default function TamilPromptSuggestions({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {SUGGESTIONS.map((s, i) => (
        <Pressable key={i} onPress={() => onSelect(s.ta)} style={styles.card}>
          <Text style={styles.tamil}>{s.ta}</Text>
          <Text style={styles.english}>{s.en}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  card: {
    backgroundColor: T.card,
    borderRadius: 14,
    padding: 12,
    width: 200,
    borderWidth: 1,
    borderColor: T.border,
  },
  tamil: { color: T.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  english: { color: T.subtext, fontSize: 12 },
});
