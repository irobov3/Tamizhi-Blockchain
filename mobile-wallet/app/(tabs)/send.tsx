/**
 * app/(tabs)/send.tsx
 * Real send flow: PIN unlock → sign & broadcast via CosmJS.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { loadMnemonic, getSigningClient } from '../../lib/keystore';
import { useWalletStore } from '../../lib/store';
import { CONFIG } from '../../src/config';

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
const FEE_UTMZ = 2000;

function isValidAddress(addr: string): boolean {
  return addr.startsWith('tamizhi1') && addr.length >= 39 && addr.length <= 62;
}

export default function Send() {
  const store = useWalletStore();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  // PIN modal
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');

  const validAddress = isValidAddress(recipient.trim());
  const amountFloat = parseFloat(amount);
  const validAmount = !isNaN(amountFloat) && amountFloat > 0;
  const canSend = validAddress && validAmount && !loading;

  function startSend() {
    if (!canSend) return;
    // If wallet is already unlocked, skip PIN prompt
    if (store.mnemonic) {
      confirmAndSend(store.mnemonic);
    } else {
      setPin('');
      setShowPin(true);
    }
  }

  async function handlePinEntry(enteredPin: string) {
    setShowPin(false);
    setLoading(true);
    try {
      const mnemonic = await loadMnemonic(enteredPin);
      // Cache mnemonic in store for this session
      store.setMnemonic(mnemonic);
      await confirmAndSend(mnemonic);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Wrong PIN', err?.message ?? 'Could not unlock wallet.');
    }
  }

  async function confirmAndSend(mnemonic: string) {
    const utmzAmount = Math.floor(amountFloat * UTMZ).toString();

    Alert.alert(
      'Confirm Send',
      `Send ${amountFloat.toFixed(6)} TMZ to\n${recipient.slice(0, 16)}…${recipient.slice(-8)}\n\nFee: ~${(FEE_UTMZ / UTMZ).toFixed(6)} TMZ`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              const { client, address } = await getSigningClient(
                mnemonic,
                CONFIG.CHAIN_RPC_URL,
              );
              const result = await client.sendTokens(
                address,
                recipient.trim(),
                [{ denom: 'utmz', amount: utmzAmount }],
                {
                  amount: [{ denom: 'utmz', amount: FEE_UTMZ.toString() }],
                  gas: '200000',
                },
                memo || '',
              );
              setLoading(false);
              if (result.code === 0) {
                Alert.alert(
                  'Transaction Sent',
                  `TX Hash:\n${result.transactionHash}`,
                  [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
                );
                setRecipient('');
                setAmount('');
                setMemo('');
              } else {
                Alert.alert('Transaction Failed', `Code ${result.code}: ${result.rawLog}`);
              }
            } catch (err: any) {
              setLoading(false);
              Alert.alert('Error', err?.message ?? 'Failed to broadcast transaction.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Send TMZ</Text>

        <Text style={s.label}>Recipient address</Text>
        <TextInput
          style={[s.input, recipient && !validAddress ? s.invalid : null]}
          placeholder="tamizhi1…"
          placeholderTextColor={C.muted}
          value={recipient}
          onChangeText={setRecipient}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {recipient && !validAddress && (
          <Text style={s.errorText}>Must start with tamizhi1 (39–62 chars)</Text>
        )}

        <Text style={s.label}>Amount (TMZ)</Text>
        <TextInput
          style={s.input}
          placeholder="0.000000"
          placeholderTextColor={C.muted}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={s.label}>Memo (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="Note to recipient"
          placeholderTextColor={C.muted}
          value={memo}
          onChangeText={setMemo}
          maxLength={256}
        />

        <View style={s.feeRow}>
          <Text style={s.feeLabel}>Network fee (fixed)</Text>
          <Text style={s.feeAmount}>0.002000 TMZ</Text>
        </View>

        <TouchableOpacity
          style={[s.sendButton, !canSend && s.sendButtonDisabled]}
          onPress={startSend}
          disabled={!canSend}
        >
          {loading ? (
            <ActivityIndicator color={C.card} />
          ) : (
            <Text style={s.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* PIN modal */}
      <Modal visible={showPin} transparent animationType="fade">
        <View style={pin_s.overlay}>
          <View style={pin_s.card}>
            <Text style={pin_s.title}>Enter PIN to sign</Text>
            <Text style={pin_s.sub}>Authorize this transaction</Text>
            <View style={pin_s.dotsRow}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
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
                      if (next.length === 6) handlePinEntry(next);
                    }
                  }}
                >
                  <Text style={pin_s.keyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => { setShowPin(false); setPin(''); }}>
              <Text style={pin_s.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 24 },
  label: { color: C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginTop: 20 },
  input: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  invalid: { borderColor: C.error },
  errorText: { color: C.error, fontSize: 12, marginTop: 4 },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    padding: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  feeLabel: { color: C.muted },
  feeAmount: { color: C.gold, fontWeight: '700' },
  sendButton: {
    backgroundColor: C.gold,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
    height: 58,
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#3a2a08' },
  sendButtonText: { color: C.card, fontWeight: '800', fontSize: 16 },
});

const pin_s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: C.card, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  title: { color: C.text, fontSize: 20, fontWeight: '800' },
  sub: { color: C.muted, marginTop: 4, marginBottom: 20, fontSize: 13 },
  dotsRow: { flexDirection: 'row', marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.border, backgroundColor: 'transparent', margin: 6 },
  dotFilled: { backgroundColor: C.gold, borderColor: C.gold },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, width: 240, justifyContent: 'center' },
  key: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', margin: 4, backgroundColor: '#2a1f5c', borderRadius: 36 },
  keyInvisible: { backgroundColor: 'transparent' },
  keyText: { color: C.text, fontSize: 22, fontWeight: '700' },
  cancel: { color: C.muted, marginTop: 20, fontSize: 14, fontWeight: '600' },
});
