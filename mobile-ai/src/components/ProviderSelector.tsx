import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CONFIG } from '../config';
import type { Provider } from '../store/settings';

const T = CONFIG.THEME;

const OPTIONS: { id: Provider; label: string }[] = [
  { id: 'anthropic', label: 'Claude (Anthropic)' },
  { id: 'openai', label: 'GPT (OpenAI)' },
  { id: 'ollama', label: 'Local (Ollama)' },
];

export default function ProviderSelector({
  value,
  onChange,
}: {
  value: Provider;
  onChange: (p: Provider) => void;
}) {
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: T.inputBackground,
    borderWidth: 1,
    borderColor: T.border,
  },
  pillActive: { backgroundColor: T.primary, borderColor: T.primary },
  pillText: { color: T.subtext, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
});
