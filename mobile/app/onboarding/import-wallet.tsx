import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  validateMnemonic,
  deriveWalletFromMnemonic,
  storeMnemonic,
} from '../../src/crypto/wallet';
import {
  generateSessionIdentity,
  updateStoredIdentity,
} from '../../src/crypto/session';
import { registerSessionID } from '../../src/api/chain';
import { useStore } from '../../src/store/useStore';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;

type Step = 'mnemonic' | 'name' | 'importing';

export default function ImportWalletScreen() {
  const router = useRouter();
  const { setIdentity, setOnboarded } = useStore();

  const [step, setStep] = useState<Step>('mnemonic');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [useWordGrid, setUseWordGrid] = useState(false);
  const [wordGrid, setWordGrid] = useState<string[]>(Array(24).fill(''));
  const [displayName, setDisplayName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleMnemonicChange = (text: string) => {
    setMnemonicInput(text);
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
  };

  const handleWordGridChange = (word: string, index: number) => {
    const updated = [...wordGrid];
    updated[index] = word.trim().toLowerCase();
    setWordGrid(updated);
    setWordCount(updated.filter(Boolean).length);
  };

  const handlePaste = async () => {
    const text = await Clipboard.getString();
    if (text) {
      handleMnemonicChange(text.trim());
    }
  };

  const getMnemonic = (): string => {
    if (useWordGrid) {
      return wordGrid.join(' ').trim();
    }
    return mnemonicInput.trim().toLowerCase().replace(/\s+/g, ' ');
  };

  const handleValidate = () => {
    const mnemonic = getMnemonic();
    if (!mnemonic) {
      Alert.alert('Error', 'Please enter your recovery phrase');
      return;
    }
    if (!validateMnemonic(mnemonic)) {
      Alert.alert(
        'Invalid Recovery Phrase',
        'The phrase you entered is not valid. Check each word carefully.',
      );
      return;
    }
    setStep('name');
  };

  const handleImport = useCallback(async () => {
    const mnemonic = getMnemonic();
    setStep('importing');
    setIsImporting(true);
    try {
      const { address } = await deriveWalletFromMnemonic(mnemonic);
      await storeMnemonic(mnemonic);
      const identity = await generateSessionIdentity(mnemonic, address);

      if (displayName.trim()) {
        await updateStoredIdentity({ displayName: displayName.trim() });
      }

      // Register unified identity on-chain (links wallet ↔ session key)
      try {
        await registerSessionID({
          walletAddress: address,
          sessionPubKey: identity.publicKey,
          displayName: displayName.trim() || undefined,
        });
      } catch {
        // Non-fatal — chain may be offline; re-registering on next app open is safe
      }

      setIdentity({ ...identity, displayName: displayName.trim() || undefined });
      setOnboarded(true);
      router.replace('/(tabs)/chats');
    } catch (err) {
      console.error('Import failed:', err);
      Alert.alert('Import Failed', 'Could not restore wallet. Please check your recovery phrase.');
      setStep('name');
    } finally {
      setIsImporting(false);
    }
  }, [getMnemonic, displayName, setIdentity, setOnboarded, router]);

  const isValid = wordCount === 24 || wordCount === 12;

  // ── Importing ──
  if (step === 'importing') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={styles.loadingText}>Restoring your identity...</Text>
        <Text style={styles.loadingSubtext}>Deriving keys from recovery phrase</Text>
      </View>
    );
  }

  // ── Display name ──
  if (step === 'name') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.iconRow}>
              <View style={styles.icon}>
                <Ionicons name="person" size={28} color={T.primary} />
              </View>
            </View>
            <Text style={styles.title}>Choose a Display Name</Text>
            <Text style={styles.subtitle}>
              This name is stored locally and shown to contacts. You can change it any time in Settings.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name (optional)</Text>
              <TextInput
                style={styles.mnemonicInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Arjun, Priya…"
                placeholderTextColor={T.subtext}
                maxLength={32}
                autoFocus
                returnKeyType="done"
              />
              <Text style={styles.charCount}>{displayName.length} / 32</Text>
            </View>

            <View style={styles.warningCard}>
              <Ionicons name="information-circle-outline" size={16} color={T.primary} />
              <Text style={styles.warningText}>
                You can skip this — just tap "Import Account" to continue without a name.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.importBtn, isImporting && styles.importBtnDisabled]}
              onPress={handleImport}
              disabled={isImporting}
            >
              <Text style={styles.importBtnText}>Import Account</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Mnemonic entry ──
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.iconRow}>
            <View style={styles.icon}>
              <Ionicons name="download" size={28} color={T.primary} />
            </View>
          </View>

          <Text style={styles.title}>Restore Account</Text>
          <Text style={styles.subtitle}>
            Enter your 12 or 24-word recovery phrase to restore your Tamizhi Messenger account.
          </Text>

          {/* Toggle input mode */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !useWordGrid && styles.toggleBtnActive]}
              onPress={() => setUseWordGrid(false)}
            >
              <Text style={[styles.toggleBtnText, !useWordGrid && styles.toggleBtnTextActive]}>
                Paste Text
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, useWordGrid && styles.toggleBtnActive]}
              onPress={() => setUseWordGrid(true)}
            >
              <Text style={[styles.toggleBtnText, useWordGrid && styles.toggleBtnTextActive]}>
                Word by Word
              </Text>
            </TouchableOpacity>
          </View>

          {useWordGrid ? (
            <View style={styles.wordGrid}>
              {wordGrid.map((word, idx) => (
                <View key={idx} style={styles.wordCell}>
                  <Text style={styles.wordNum}>{idx + 1}</Text>
                  <TextInput
                    style={styles.wordInput}
                    value={word}
                    onChangeText={(t) => handleWordGridChange(t, idx)}
                    placeholder="word"
                    placeholderTextColor={T.subtext}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType={idx < 23 ? 'next' : 'done'}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Recovery Phrase</Text>
                <View style={styles.inputActions}>
                  <TouchableOpacity onPress={handlePaste} style={styles.pasteBtn}>
                    <Ionicons name="clipboard-outline" size={15} color={T.primary} />
                    <Text style={styles.pasteBtnText}>Paste</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowMnemonic(!showMnemonic)}>
                    <Ionicons
                      name={showMnemonic ? 'eye-off' : 'eye'}
                      size={18}
                      color={T.subtext}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={styles.mnemonicInput}
                value={showMnemonic ? mnemonicInput : mnemonicInput.replace(/[^\s]/g, '•')}
                onChangeText={handleMnemonicChange}
                placeholder="word1 word2 word3 …"
                placeholderTextColor={T.subtext}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text
                style={[
                  styles.wordCount,
                  isValid && styles.wordCountValid,
                  wordCount > 0 && !isValid && styles.wordCountInvalid,
                ]}
              >
                {wordCount} / 24 words
              </Text>
            </View>
          )}

          <View style={styles.warningCard}>
            <Ionicons name="shield-checkmark" size={18} color={T.primary} />
            <Text style={styles.warningText}>
              Your recovery phrase is processed entirely on your device and never transmitted to any server.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.importBtn, !isValid && styles.importBtnDisabled]}
            onPress={handleValidate}
            disabled={!isValid}
          >
            <Text style={styles.importBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  scroll: { padding: 20, paddingBottom: 24, flexGrow: 1 },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.background,
    gap: 16,
    padding: 32,
  },
  loadingText: { color: T.text, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  loadingSubtext: { color: T.subtext, fontSize: 14, textAlign: 'center' },

  iconRow: { alignItems: 'center', marginBottom: 20 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: T.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.primary + '40',
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: T.subtext, fontSize: 14, lineHeight: 22, marginBottom: 24 },
  charCount: { color: T.subtext, fontSize: 11, textAlign: 'right', marginTop: 4 },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: T.primary },
  toggleBtnText: { color: T.subtext, fontSize: 14, fontWeight: '600' },
  toggleBtnTextActive: { color: '#fff' },

  inputGroup: { marginBottom: 16 },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputLabel: {
    color: T.subtext,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: T.primary + '20',
    borderWidth: 1,
    borderColor: T.primary + '40',
  },
  pasteBtnText: { color: T.primary, fontSize: 12, fontWeight: '600' },
  mnemonicInput: {
    backgroundColor: T.inputBackground,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    color: T.text,
    fontSize: 16,
    fontFamily: 'monospace',
    minHeight: 110,
    lineHeight: 26,
  },
  wordCount: { color: T.subtext, fontSize: 12, textAlign: 'right', marginTop: 6 },
  wordCountValid: { color: T.success },
  wordCountInvalid: { color: T.danger },

  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  wordCell: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  wordNum: { color: T.subtext, fontSize: 10, width: 16 },
  wordInput: { flex: 1, color: T.text, fontSize: 13, padding: 0 },

  warningCard: {
    flexDirection: 'row',
    backgroundColor: T.primary + '15',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.primary + '30',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  warningText: { color: T.text, fontSize: 13, flex: 1, lineHeight: 20 },

  footer: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
  },
  importBtn: {
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
