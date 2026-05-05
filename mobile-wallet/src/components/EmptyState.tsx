import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CONFIG } from '../config';

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({
  emoji,
  title,
  subtitle,
  children,
}) => {
  const T = CONFIG.THEME;

  return (
    <View style={styles.container}>
      <View style={[styles.emojiContainer, { borderColor: T.border, backgroundColor: T.surface }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={[styles.title, { color: T.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: T.subtext }]}>{subtitle}</Text>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  emoji: { fontSize: 36 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
