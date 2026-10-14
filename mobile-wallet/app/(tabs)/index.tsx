/**
 * app/(tabs)/index.tsx
 * Dashboard screen — shows real balance, last 5 transactions, quick actions.
 * On mount: checks for stored mnemonic; redirects to /onboarding if none found.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { hasMnemonic, loadMnemonic, getAddress } from '../../lib/keystore';
import { fetchBalance, fetchTransactions, TxRecord } from '../../lib/chain';
import { useWalletStore } from '../../lib/store';

const C = {
  bg: '#0e0824',
  card: '#1a1040',
  border: '#2a1f5c',
  gold: '#d4a017',
  cyan: '#00d4ff',
  text: '#fdf6e3',
  muted: '#8a8aa0',
  success: '#00c48c',
  error: '#ff4d4d',
};

const UTMZ = 1_000_000;

function formatTMZ(utmz: string): string {
  const n = parseInt(utmz, 10);
  if (isNaN(n)) return '0';
  return (n / UTMZ).toFixed(6).replace(/\.?0+$/, '');
}

function truncate(addr: string, n = 8): string {
  if (!addr || addr.length <= 2 * n + 3) return addr || '—';
  return `${addr.slice(0, n)}…${addr.slice(-6)}`;
}

function txLabel(tx: TxRecord): { icon: string; label: string; color: string } {
  switch (tx.type) {
    case 'receive':
      return { icon: 'arrow-down-bold-circle', label: 'Received', color: C.success };
    case 'send':
      return { icon: 'arrow-up-bold-circle', label: 'Sent', color: C.error };
    case 'delegate':
      return { icon: 'finance', label: 'Delegated', color: C.cyan };
    case 'claim':
      return { icon: 'gift', label: 'Claimed Rewards', color: C.gold };
    default:
      return { icon: 'swap-horizontal', label: 'Transaction', color: C.muted };
  }
}

// ─── PIN prompt helper ────────────────────────────────────────────────────────
// A lightweight inline PIN modal for unlocking on dashboard mount
function PinUnlockModal({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState('');

  return (
    <View style={pin_s.overlay}>
      <View style={pin_s.card}>
        <Text style={pin_s.title}>தமிழி Wallet</Text>
        <Text style={pin_s.sub}>Enter your 6-digit PIN to unlock</Text>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[pin_s.dot, i < pin.length ? pin_s.dotFilled : null]}
          />
        ))}
        <View style={pin_s.numpad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => (
            <TouchableOpacity
              key={idx}
              style={[pin_s.key, key === '' ? pin_s.keyInvisible : null]}
              disabled={key === ''}
              onPress={() => {
                if (key === '⌫') {
                  setPin((p) => p.slice(0, -1));
                } else {
                  const next = pin + key;
                  setPin(next);
                  if (next.length === 6) onUnlock(next);
                }
              }}
            >
              <Text style={pin_s.keyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const pin_s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: C.card, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  title: { color: C.gold, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  sub: { color: C.muted, marginTop: 6, marginBottom: 24, fontSize: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.border, backgroundColor: 'transparent', margin: 6, display: 'flex' },
  dotFilled: { backgroundColor: C.gold, borderColor: C.gold },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 24, width: 240, justifyContent: 'center' },
  key: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', margin: 4, backgroundColor: '#2a1f5c', borderRadius: 36 },
  keyInvisible: { backgroundColor: 'transparent' },
  keyText: { color: C.text, fontSize: 22, fontWeight: '700' },
});

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const store = useWalletStore();
  const [booting, setBooting] = useState(true);
  const [needsPin, setNeedsPin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [txs, setTxs] = useState<TxRecord[]>([]);

  // ── Boot: check if wallet exists ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const has = await hasMnemonic();
      if (!has) {
        router.replace('/onboarding');
        return;
      }
      if (!store.isUnlocked) {
        setNeedsPin(true);
      }
      setBooting(false);
    })();
  }, []);

  // ── Load wallet data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!store.address) return;
    try {
      const [bal, recentTxs] = await Promise.all([
        fetchBalance(store.address),
        fetchTransactions(store.address),
      ]);
      store.setBalance(bal);
      setTxs(recentTxs.slice(0, 5));
    } catch (e) {
      console.warn('[dashboard] loadData error:', e);
    }
  }, [store.address]);

  useEffect(() => {
    if (store.isUnlocked && store.address) {
      loadData();
    }
  }, [store.isUnlocked, store.address]);

  // ── PIN unlock handler ────────────────────────────────────────────────────
  async function handlePinUnlock(pin: string) {
    try {
      const mnemonic = await loadMnemonic(pin);
      const address = await getAddress(mnemonic);
      store.unlock(mnemonic, address);
      setNeedsPin(false);
    } catch (err: any) {
      Alert.alert('Wrong PIN', err?.message ?? 'Could not unlock wallet. Try again.');
    }
  }

  // ── States ────────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={C.gold} size="large" />
      </SafeAreaView>
    );
  }

  if (needsPin) {
    return <PinUnlockModal onUnlock={handlePinUnlock} />;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadData();
            setRefreshing(false);
          }}
          tintColor={C.gold}
        />
      }
    >
      <SafeAreaView>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.tamil}>தமிழி</Text>
          <Text style={s.brand}>Wallet</Text>
        </View>

        {/* Balance card */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Total Balance</Text>
          <View style={s.balanceRow}>
            <Text style={s.balanceAmount}>{formatTMZ(store.balance)}</Text>
            <Text style={s.balanceDenom}> TMZ</Text>
          </View>
          <Text style={s.address}>{truncate(store.address)}</Text>
        </View>

        {/* Quick actions */}
        <View style={s.actions}>
          {([
            { name: 'Send', icon: 'arrow-up-bold-circle', route: '/(tabs)/send' },
            { name: 'Receive', icon: 'arrow-down-bold-circle', route: '/(tabs)/receive' },
            { name: 'Stake', icon: 'finance', route: '/(tabs)/stake' },
            { name: 'History', icon: 'history', route: '/(tabs)/settings' },
          ] as const).map((a) => (
            <TouchableOpacity
              key={a.name}
              style={s.actionTile}
              onPress={() => router.push(a.route as any)}
            >
              <MaterialCommunityIcons name={a.icon} size={28} color={C.gold} />
              <Text style={s.actionLabel}>{a.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent transactions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Transactions</Text>
          {txs.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No transactions yet</Text>
              <Text style={s.emptySub}>Receive TMZ to get started</Text>
            </View>
          ) : (
            txs.map((tx) => {
              const { icon, label, color } = txLabel(tx);
              const amtTMZ = tx.amountUtmz
                ? formatTMZ(tx.amountUtmz)
                : '—';
              return (
                <View key={tx.hash} style={s.txRow}>
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={22}
                    color={color}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.txType}>{label}</Text>
                    <Text style={s.txHash}>{truncate(tx.hash, 6)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.txAmount, { color }]}>
                      {tx.type === 'send' ? '-' : '+'}{amtTMZ} TMZ
                    </Text>
                    {tx.code !== 0 && (
                      <Text style={s.txFailed}>FAILED</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  tamil: { fontSize: 22, color: C.gold, fontWeight: '700' },
  brand: { fontSize: 32, color: C.text, fontWeight: '800', marginTop: 4 },

  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  balanceLabel: { color: C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  balanceAmount: { fontSize: 42, fontWeight: '800', color: C.text },
  balanceDenom: { fontSize: 18, color: C.gold, fontWeight: '700' },
  address: { color: C.gold, marginTop: 12, fontSize: 12, fontFamily: 'monospace' },

  actions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 16 },
  actionTile: {
    width: '23%',
    aspectRatio: 1,
    margin: '1%',
    backgroundColor: C.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  actionLabel: { color: C.text, fontSize: 11, marginTop: 6, fontWeight: '600' },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: C.muted, fontSize: 14 },
  emptySub: { color: '#5a5a72', fontSize: 12, marginTop: 4 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  txType: { color: C.text, fontWeight: '600', fontSize: 14 },
  txHash: { color: C.muted, fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  txAmount: { fontWeight: '700', fontSize: 14 },
  txFailed: { color: C.error, fontSize: 10, fontWeight: '700', marginTop: 2 },
});
