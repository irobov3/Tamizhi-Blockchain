/**
 * app/onboarding/import-wallet.tsx
 * Import existing wallet from a BIP39 mnemonic + PIN setup.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { validateMnemonic, storeMnemonic, getAddress } from '../../lib/keystore';
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

type Step = 'phrase' | 'pin' | 'saving';

export default function ImportWallet() {
  const [step, setStep] = useState<Step>('phrase');
  const [phraseInput, setPhraseInput] = useState('');
  const [phraseError, setPhraseError] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  const unlock = useWalletStore((s) => s.unlock);

  const normalizedMnemonic = phraseInput.trim().replace(/\s+/g, ' ');
  const wordCount = normalizedMnemonic ? normalizedMnemonic.split(' ').length : 0;

  function handlePhraseNext() {
    setPhraseError('');
    if (wordCount !== 12 && wordCount !== 24) {
      setPhraseError(`Please enter 12 or 24 words. You entered ${wordCount}.`);
      return;
    }
    if (!validateMnemonic(normalizedMnemonic)) {
      setPhraseError('Invalid mnemonic. Please check the words and try again.');
      return;
    }
    setStep('pin');
  }

  async function handleImport() {
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
      await storeMnemonic(normalizedMnemonic, pin);
      const address = await getAddress(normalizedMnemonic);
      unlock(normalizedMnemonic, address);
      router.replace('/(tabs)');
    } catch (err: any) {
      setStep('pin');
      Alert.alert('Error', err?.message ?? 'Failed to import wallet. Please try again.');
    }
  }

  if (step === 'saving') {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={C.gold} />
        <Text style={s.savingText}>Importing wallet…</Text>
      </SafeAreaView>
    );
  }

  if (step === 'phrase') {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.heading}>Import Wallet</Text>
          <Text style={s.sub}>
            Enter your 12 or 24-word recovery phrase. Words must be separated by spaces.
          </Text>

          <Text style={s.inputLabel}>Recovery Phrase</Text>
          <TextInput
            style={[s.phraseInput, phraseError ? s.inputError : null]}
            placeholder="word1 word2 word3 …"
            placeholderTextColor={C.muted}
            value={phraseInput}
            onChangeText={(v) => {
              setPhraseError('');
              setPhraseInput(v.toLowerCase());
            }}
            multiline
            numberOfLines={6}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />

          <View style={s.wordCountRow}>
            <Text style={[s.wordCountText, wordCount === 12 || wordCount === 24 ? s.wordCountOk : null]}>
              {wordCount} / 24 words
            </Text>
          </View>

          {phraseError ? <Text style={s.errorText}>{phraseError}</Text> : null}

          <TouchableOpacity
            style={[s.primaryBtn, wordCount === 0 && s.disabledBtn]}
            onPress={handlePhraseNext}
            disabled={wordCount === 0}
          >
            <Text style={s.primaryBtnText}>Continue →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // step === 'pin'
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>Set Your PIN</Text>
        <Text style={s.sub}>
          Choose a 6-digit PIN to protect your wallet. You will need it each time you open the app.
        </Text>

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
          onPress={handleImport}
          disabled={pin.length < 6 || pinConfirm.length < 6}
        >
          <Text style={s.primaryBtnText}>Import Wallet →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.ghostBtn} onPress={() => setStep('phrase')}>
          <Text style={s.ghostBtnText}>← Back to phrase</Text>
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

  inputLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  phraseInput: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  inputError: { borderColor: C.error },
  wordCountRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  wordCountText: { color: C.muted, fontSize: 12 },
  wordCountOk: { color: C.success },
  errorText: { color: C.error, fontSize: 13, marginTop: 8 },

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

  primaryBtn: {
    backgroundColor: C.gold,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  primaryBtnText: { color: C.card, fontWeight: '800', fontSize: 16 },
  disabledBtn: { backgroundColor: '#3a2a08' },
  ghostBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  ghostBtnText: { color: C.muted, fontSize: 14, fontWeight: '600' },
});
