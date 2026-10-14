/**
 * app/onboarding/create-wallet.tsx
 * Create Wallet flow — 4 steps:
 *  1. Display 24-word mnemonic grid
 *  2. Confirm 3 random words
 *  3. Set & confirm 6-digit PIN
 *  4. Store mnemonic → navigate to tabs
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { generateMnemonic, storeMnemonic, getAddress } from '../../lib/keystore';
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

type Step = 'show' | 'confirm' | 'pin' | 'saving';

// Three random indices in 0..23 for the confirmation challenge
function pickIndices(): number[] {
  const all = Array.from({ length: 24 }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 3).sort((a, b) => a - b);
}

export default function CreateWallet() {
  const [mnemonic] = useState<string>(() => generateMnemonic());
  const words = mnemonic.split(' ');

  const [step, setStep] = useState<Step>('show');
  const [challengeIndices] = useState<number[]>(() => pickIndices());
  const [confirmAnswers, setConfirmAnswers] = useState<string[]>(['', '', '']);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  const unlock = useWalletStore((s) => s.unlock);

  // ── Step helpers ────────────────────────────────────────────────────────────

  function handleConfirmCheck() {
    const allCorrect = challengeIndices.every(
      (idx, i) => confirmAnswers[i].trim().toLowerCase() === words[idx].toLowerCase(),
    );
    if (!allCorrect) {
      Alert.alert('Incorrect', 'One or more words do not match. Check your backup and try again.');
      return;
    }
    setStep('pin');
  }

  async function handleSave() {
    if (pin.length !== 6) {
      setPinError('PIN must be exactly 6 digits.');
      return;
    }
    if (pin !== pinConfirm) {
      setPinError('PINs do not match. Please try again.');
      return;
    }
    setPinError('');
    setStep('saving');
    try {
      await storeMnemonic(mnemonic, pin);
      const address = await getAddress(mnemonic);
      unlock(mnemonic, address);
      router.replace('/(tabs)');
    } catch (err: any) {
      setStep('pin');
      Alert.alert('Error', err?.message ?? 'Failed to save wallet. Please try again.');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (step === 'saving') {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={C.gold} />
        <Text style={s.savingText}>Securing your wallet…</Text>
      </SafeAreaView>
    );
  }

  if (step === 'show') {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.heading}>Your Recovery Phrase</Text>
          <Text style={s.sub}>
            Write down all 24 words in order. Store them safely — this is the only way to recover your wallet.
          </Text>

          {/* 4-column × 6-row grid */}
          <View style={s.grid}>
            {words.map((word, i) => (
              <View key={i} style={s.wordCell}>
                <Text style={s.wordNum}>{i + 1}</Text>
                <Text style={s.wordText}>{word}</Text>
              </View>
            ))}
          </View>

          <View style={s.warningBox}>
            <Text style={s.warningText}>
              ⚠  Never share your recovery phrase. Anyone with these words has full access to your wallet.
            </Text>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('confirm')}>
            <Text style={s.primaryBtnText}>I have written it down →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'confirm') {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.heading}>Verify Your Backup</Text>
          <Text style={s.sub}>Enter the words at the positions below to confirm you saved your phrase.</Text>

          {challengeIndices.map((idx, i) => (
            <View key={idx} style={s.confirmRow}>
              <Text style={s.confirmLabel}>Word #{idx + 1}</Text>
              <TextInput
                style={s.confirmInput}
                placeholder={`Word ${idx + 1}`}
                placeholderTextColor={C.muted}
                value={confirmAnswers[i]}
                onChangeText={(v) => {
                  const next = [...confirmAnswers];
                  next[i] = v;
                  setConfirmAnswers(next);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}

          <TouchableOpacity style={s.primaryBtn} onPress={handleConfirmCheck}>
            <Text style={s.primaryBtnText}>Verify →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.ghostBtn} onPress={() => setStep('show')}>
            <Text style={s.ghostBtnText}>← Back to phrase</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // step === 'pin'
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>Set Your PIN</Text>
        <Text style={s.sub}>Choose a 6-digit PIN to protect your wallet. You will need it every time you open the app.</Text>

        <Text style={s.inputLabel}>PIN</Text>
        <TextInput
          style={s.pinInput}
          placeholder="••••••"
          placeholderTextColor={C.muted}
          value={pin}
          onChangeText={(v) => {
            setPinError('');
            setPin(v.replace(/\D/g, '').slice(0, 6));
          }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />

        <Text style={s.inputLabel}>Confirm PIN</Text>
        <TextInput
          style={s.pinInput}
          placeholder="••••••"
          placeholderTextColor={C.muted}
          value={pinConfirm}
          onChangeText={(v) => {
            setPinError('');
            setPinConfirm(v.replace(/\D/g, '').slice(0, 6));
          }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />

        {pinError ? <Text style={s.errorText}>{pinError}</Text> : null}

        <TouchableOpacity
          style={[s.primaryBtn, (pin.length < 6 || pinConfirm.length < 6) && s.disabledBtn]}
          onPress={handleSave}
          disabled={pin.length < 6 || pinConfirm.length < 6}
        >
          <Text style={s.primaryBtnText}>Create Wallet →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.ghostBtn} onPress={() => setStep('confirm')}>
          <Text style={s.ghostBtnText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 24, paddingTop: 48, paddingBottom: 60 },
  heading: { color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 10 },
  sub: { color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 28 },
  savingText: { color: C.muted, marginTop: 16, fontSize: 15 },

  // Mnemonic grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 8,
    marginBottom: 20,
  },
  wordCell: {
    width: '25%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  wordNum: { color: C.muted, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  wordText: { color: C.gold, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },

  warningBox: {
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.error,
    padding: 14,
    marginBottom: 24,
  },
  warningText: { color: C.error, fontSize: 13, lineHeight: 18 },

  // Confirm step
  confirmRow: { marginBottom: 16 },
  confirmLabel: { color: C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  confirmInput: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
  },

  // PIN step
  inputLabel: { color: C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  pinInput: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    padding: 16,
    fontSize: 22,
    borderWidth: 1,
    borderColor: C.border,
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorText: { color: C.error, fontSize: 13, marginTop: 8 },

  // Buttons
  primaryBtn: {
    backgroundColor: C.gold,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  primaryBtnText: { color: C.card, fontWeight: '800', fontSize: 16 },
  disabledBtn: { backgroundColor: '#3a2a08' },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  ghostBtnText: { color: C.muted, fontSize: 14, fontWeight: '600' },
});
