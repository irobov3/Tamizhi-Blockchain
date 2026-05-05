import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

// Deterministic color palette
const AVATAR_COLORS = [
  '#00b4d8', '#00f5d4', '#7c4dff', '#ff6b6b',
  '#ffd166', '#06d6a0', '#ef476f', '#118ab2',
  '#48cae4', '#e76f51', '#2a9d8f', '#e9c46a',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (s.charCodeAt(i) + ((h << 5) - h)) | 0;
  }
  return Math.abs(h);
}

function deriveColor(seed: string): string {
  return AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length];
}

function getInitials(name: string, maxChars = 2): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts
    .map((w) => w[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, maxChars)
    .join('');
}

interface AvatarProps {
  /** Display name — used for initials and color derivation */
  name?: string;
  /** Fallback seed (e.g. pubkey) for color when name is absent */
  pubkey?: string;
  /** Explicit color override */
  color?: string;
  size?: number;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  pubkey = '',
  color,
  size = 48,
  style,
}) => {
  const seed = name || pubkey;
  const bg = color ?? deriveColor(seed);
  const initials = getInitials(name) || (pubkey ? pubkey.slice(0, 2).toUpperCase() : '?');
  const fontSize = size * 0.38;
  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius, backgroundColor: bg },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
