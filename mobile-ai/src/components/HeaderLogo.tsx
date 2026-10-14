import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CONFIG } from '../config';

const T = CONFIG.THEME;

export default function HeaderLogo({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.glyph}>
        <Text style={styles.glyphText}>த</Text>
      </View>
      <View>
        <Text style={styles.title}>Tamizhi AI</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyph: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: T.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: T.primary, shadowOpacity: 0.6, shadowRadius: 10,
  },
  glyphText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  title: { color: T.text, fontSize: 18, fontWeight: '800' },
  sub: { color: T.subtext, fontSize: 11 },
});
