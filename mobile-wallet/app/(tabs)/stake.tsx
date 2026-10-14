/**
 * app/(tabs)/stake.tsx
 * Staking screen — list validators, delegate, claim rewards.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loadMnemonic, getSigningClient } from '../../lib/keystore';
import {
  fetchValidators,
  fetchDelegations,
  fetchRewards,
  Validator,
  Delegation,
} from '../../lib/chain';
import { useWalletStore } from '../../lib/store';
import { CONFIG } from '../../src/config';
import { MsgDelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx';

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

function formatTMZ(utmz: string | number): string {
  const n = typeof utmz === 'string' ? parseInt(utmz, 10) : utmz;
  if (isNaN(n)) return '0';
  return (n / UTMZ).toFixed(6).replace(/\.?0+$/, '');
}

// ─── PIN modal (inline) ──────────────────────────────────────────────────────

function PinModal({
  visible,
  title,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (visible) setPin('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={pin_s.overlay}>
        <View style={pin_s.card}>
          <Text style={pin_s.title}>{title}</Text>
          <View style={pin_s.dotsRow}>
            {[0,1,2,3,4,5].map((i) => (
              <View key={i} style={[pin_s.dot, i < pin.length ? pin_s.dotFilled : null]} />
            ))}
          </View>
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
                    if (next.length === 6) onConfirm(next);
                  }
                }}
              >
                <Text style={pin_s.keyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onCancel}>
            <Text style={pin_s.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pin_s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: C.card, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  title: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  dotsRow: { flexDirection: 'row', marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.border, backgroundColor: 'transparent', margin: 6 },
  dotFilled: { backgroundColor: C.gold, borderColor: C.gold },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, width: 240, justifyContent: 'center' },
  key: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', margin: 4, backgroundColor: '#2a1f5c', borderRadius: 36 },
  keyInvisible: { backgroundColor: 'transparent' },
  keyText: { color: C.text, fontSize: 22, fontWeight: '700' },
  cancel: { color: C.muted, marginTop: 20, fontSize: 14, fontWeight: '600' },
});

// ─── Delegate modal ──────────────────────────────────────────────────────────

function DelegateModal({
  validator,
  onClose,
  onSuccess,
}: {
  validator: Validator | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const store = useWalletStore();
  const [amount, setAmount] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  async function doDelegate(pin: string) {
    setShowPin(false);
    setLoading(true);
    try {
      const mnemonic = await loadMnemonic(pin);
      store.setMnemonic(mnemonic);
      const { client, address } = await getSigningClient(mnemonic, CONFIG.CHAIN_RPC_URL);
      const utmzAmount = Math.floor(parseFloat(amount) * UTMZ).toString();
      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: MsgDelegate.fromPartial({
          delegatorAddress: address,
          validatorAddress: validator!.operatorAddress,
          amount: { denom: 'utmz', amount: utmzAmount },
        }),
      };
      const fee = { amount: [{ denom: 'utmz', amount: '6250' }], gas: '250000' };
      const result = await client.signAndBroadcast(address, [msg], fee, '');
      setLoading(false);
      if (result.code === 0) {
        Alert.alert('Delegated', `Successfully delegated ${amount} TMZ`);
        onSuccess();
        onClose();
      } else {
        Alert.alert('Failed', `Code ${result.code}: ${result.rawLog}`);
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', err?.message ?? 'Delegation failed.');
    }
  }

  if (!validator) return null;

  return (
    <Modal visible={!!validator} transparent animationType="slide">
      <View style={del_s.overlay}>
        <View style={del_s.sheet}>
          <Text style={del_s.heading}>Delegate TMZ</Text>
          <Text style={del_s.valName}>{validator.moniker}</Text>
          <Text style={del_s.valMeta}>
            Commission {validator.commissionRate}% · {validator.votingPower} TMZ VP
          </Text>

          <Text style={del_s.label}>Amount (TMZ)</Text>
          <TextInput
            style={del_s.input}
            placeholder="0.000000"
            placeholderTextColor={C.muted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          {loading ? (
            <ActivityIndicator color={C.gold} style={{ marginTop: 24 }} />
          ) : (
            <TouchableOpacity
              style={[del_s.btn, (!amount || parseFloat(amount) <= 0) && del_s.btnDisabled]}
              onPress={() => {
                if (!amount || parseFloat(amount) <= 0) return;
                if (store.mnemonic) {
                  doDelegate('SKIP'); // won't be used
                } else {
                  setShowPin(true);
                }
              }}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              <Text style={del_s.btnText}>Delegate →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={del_s.cancelBtn} onPress={onClose}>
            <Text style={del_s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PinModal
        visible={showPin}
        title="Enter PIN to delegate"
        onConfirm={(pin) => {
          setShowPin(false);
          doDelegate(pin);
        }}
        onCancel={() => setShowPin(false)}
      />
    </Modal>
  );
}

const del_s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border },
  heading: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  valName: { color: C.gold, fontSize: 16, fontWeight: '700' },
  valMeta: { color: C.muted, fontSize: 12, marginBottom: 20 },
  label: { color: C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: C.bg, color: C.text, borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: C.border },
  btn: { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  btnDisabled: { backgroundColor: '#3a2a08' },
  btnText: { color: C.card, fontWeight: '800', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: C.muted, fontWeight: '600' },
});

// ─── Main Stake Screen ────────────────────────────────────────────────────────

export default function Stake() {
  const store = useWalletStore();

  const [validators, setValidators] = useState<Validator[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [pendingRewards, setPendingRewards] = useState('0');
  const [loading, setLoading] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
  const [showClaimPin, setShowClaimPin] = useState(false);

  const totalStakedUtmz = delegations.reduce(
    (sum, d) => sum + parseInt(d.balanceUtmz, 10),
    0,
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const vals = await fetchValidators();
      setValidators(vals);
      if (store.address) {
        const [dels, rewards] = await Promise.all([
          fetchDelegations(store.address),
          fetchRewards(store.address),
        ]);
        setDelegations(dels);
        setPendingRewards(rewards);
      }
    } catch (e) {
      console.warn('[stake] loadAll error:', e);
    } finally {
      setLoading(false);
    }
  }, [store.address]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function claimAllRewards(pin: string) {
    setShowClaimPin(false);
    try {
      const mnemonic = await loadMnemonic(pin);
      store.setMnemonic(mnemonic);
      const { client, address } = await getSigningClient(mnemonic, CONFIG.CHAIN_RPC_URL);
      const msgs = delegations.map((d) => ({
        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        value: MsgWithdrawDelegatorReward.fromPartial({
          delegatorAddress: address,
          validatorAddress: d.validatorAddress,
        }),
      }));
      if (msgs.length === 0) {
        Alert.alert('No delegations', 'You have no active delegations to claim rewards from.');
        return;
      }
      const gasAmt = 150_000 + 50_000 * msgs.length;
      const fee = {
        amount: [{ denom: 'utmz', amount: Math.ceil(gasAmt * 0.025).toString() }],
        gas: gasAmt.toString(),
      };
      const result = await client.signAndBroadcast(address, msgs, fee, '');
      if (result.code === 0) {
        Alert.alert('Rewards Claimed', 'Your staking rewards have been claimed!');
        loadAll();
      } else {
        Alert.alert('Failed', `Code ${result.code}: ${result.rawLog}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to claim rewards.');
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAll} tintColor={C.gold} />}
      >
        <Text style={s.title}>Staking</Text>
        <Text style={s.subtitle}>Earn TMZ rewards by delegating to validators</Text>

        {/* Summary card */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View>
              <Text style={s.summaryLabel}>Your Stake</Text>
              <Text style={s.summaryAmount}>{formatTMZ(totalStakedUtmz)} TMZ</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.summaryLabel}>Pending Rewards</Text>
              <Text style={s.rewardsAmount}>{formatTMZ(pendingRewards)} TMZ</Text>
            </View>
          </View>
          {parseInt(pendingRewards, 10) > 0 && (
            <TouchableOpacity
              style={s.claimBtn}
              onPress={() => {
                if (store.mnemonic) {
                  claimAllRewards('USE_STORED');
                } else {
                  setShowClaimPin(true);
                }
              }}
            >
              <MaterialCommunityIcons name="gift" size={16} color={C.card} />
              <Text style={s.claimBtnText}>Claim All Rewards</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current delegations */}
        {delegations.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Your Delegations</Text>
            {delegations.map((d) => (
              <View key={d.validatorAddress} style={s.delRow}>
                <MaterialCommunityIcons name="finance" size={18} color={C.cyan} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.delValidator}>
                    {d.validatorAddress.slice(0, 20)}…
                  </Text>
                  <Text style={s.delAmount}>{formatTMZ(d.balanceUtmz)} TMZ</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Validators list */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Active Validators ({validators.length})</Text>
          {validators.length === 0 && !loading && (
            <Text style={s.empty}>No validators found. Pull to refresh.</Text>
          )}
          {validators.map((v) => (
            <View key={v.operatorAddress} style={s.validatorRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.validatorName}>{v.moniker}</Text>
                <Text style={s.validatorMeta}>
                  Commission {v.commissionRate}% · {v.votingPower} TMZ VP
                </Text>
                {v.website ? (
                  <Text style={s.validatorWeb} numberOfLines={1}>{v.website}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={s.delegateButton}
                onPress={() => setSelectedValidator(v)}
              >
                <Text style={s.delegateText}>Delegate</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Delegate modal */}
      <DelegateModal
        validator={selectedValidator}
        onClose={() => setSelectedValidator(null)}
        onSuccess={loadAll}
      />

      {/* Claim rewards PIN */}
      <PinModal
        visible={showClaimPin}
        title="Enter PIN to claim"
        onConfirm={claimAllRewards}
        onCancel={() => setShowClaimPin(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8 },
  subtitle: { color: C.muted, marginBottom: 24, fontSize: 14 },

  summaryCard: {
    padding: 20,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: C.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  summaryAmount: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  rewardsAmount: { color: C.gold, fontSize: 22, fontWeight: '800', marginTop: 4 },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },
  claimBtnText: { color: C.card, fontWeight: '800', fontSize: 14 },

  section: { marginTop: 20 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  empty: { color: C.muted, textAlign: 'center', paddingVertical: 24 },

  delRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  delValidator: { color: C.muted, fontSize: 11, fontFamily: 'monospace' },
  delAmount: { color: C.cyan, fontWeight: '700', marginTop: 2 },

  validatorRow: {
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
  validatorName: { color: C.text, fontWeight: '600', fontSize: 14 },
  validatorMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
  validatorWeb: { color: C.cyan, fontSize: 11, marginTop: 2 },
  delegateButton: {
    backgroundColor: C.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  delegateText: { color: C.card, fontWeight: '700', fontSize: 13 },
});
