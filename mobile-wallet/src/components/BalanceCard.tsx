import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { CONFIG } from '../config';
import { formatTMZ } from '../utils/format';

interface Props {
  utmzAmount: string;
  usdEquivalent?: string | null;
  network: 'testnet' | 'mainnet';
  style?: ViewStyle;
}

const T = CONFIG.THEME;

export function BalanceCard({ utmzAmount, usdEquivalent, network, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>TMZ</Text>
        <View
          style={[
            styles.badge,
            network === 'mainnet' ? styles.badgeMain : styles.badgeTest,
          ]}
        >
          <Text style={styles.badgeText}>
            {network === 'mainnet' ? 'MAINNET' : 'TESTNET'}
          </Text>
        </View>
      </View>
      <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
        {formatTMZ(utmzAmount, false)}
      </Text>
      <Text style={styles.usd}>
        {usdEquivalent ? `≈ $${usdEquivalent} USD` : '— USD price unavailable'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.indigo,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: T.gold,
    // simple "gradient-like" feel without a lib
    shadowColor: T.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: T.gold,
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTest: { backgroundColor: '#3a2a7e' },
  badgeMain: { backgroundColor: '#1d6e3d' },
  badgeText: {
    color: T.cream,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  balance: {
    color: T.cream,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  usd: {
    color: T.subtext,
    fontSize: 13,
    marginTop: 6,
  },
});

export default BalanceCard;
