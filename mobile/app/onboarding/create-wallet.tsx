import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  generateMnemonic,
  deriveWalletFromMnemonic,
  storeMnemonic,
  getConfirmationWordIndices,
} from '../../src/crypto/wallet';
import {
  generateSessionIdentity,
  formatTamizhiId,
} from '../../src/crypto/session';
import { registerSessionID } from '../../src/api/chain';
import { useStore } from '../../src/store/useStore';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;

type Step = 'warn' | 'reveal' | 'verify' | 'name' | 'generating' | 'success';

// ─── Step indicator ────────────────────────────────────────────────────────

const STEP_LABELS = ['Backup', 'Verify', 'Name', 'Done'];
const STEP_MAP: Record<Step, number> = {
  warn: 0, reveal: 0, verify: 1, name: 2, generating: 3, success: 3,
};

function StepIndicator({ step }: { step: Step }) {
  const active = STEP_MAP[step];
  return (
    <View style={si.row}>
      {STEP_LABELS.map((label, i) => (
        <React.Fragment key={label}>
          <View style={si.stepItem}>
            <View style={[si.dot, i <= active && si.dotActive, i === active && si.dotCurrent]}>
              {i < active ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={si.dotText}>{i + 1}</Text>
              )}
            </View>
            <Text style={[si.label, i === active && si.labelActive]}>{label}</Text>
          </View>
          {i < STEP_LABELS.length - 1 && (
            <View style={[si.line, i < active && si.lineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const si = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: T.primary + '60' },
  dotCurrent: { backgroundColor: T.primary },
  dotText: { color: T.subtext, fontSize: 12, fontWeight: '600' },
  line: { flex: 1, height: 1.5, backgroundColor: T.border, marginBottom: 16, marginHorizontal: 4 },
  lineActive: { backgroundColor: T.primary },
  label: { color: T.subtext, fontSize: 10, fontWeight: '500' },
  labelActive: { color: T.primary, fontWeight: '700' },
});

// ─── Main screen ───────────────────────────────────────────────────────────

export default function CreateWalletScreen() {
  const router = useRouter();
  const { setIdentity, setOnboarded } = useStore();

  const [step, setStep] = useState<Step>('warn');
  const [mnemonic, setMnemonic] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [confirmIndices, setConfirmIndices] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [generatedIdentity, setGeneratedIdentity] = useState<{ publicKey: string } | null>(null);

  // Success animation
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const m = generateMnemonic();
    setMnemonic(m);
    setWords(m.split(' '));
    setConfirmIndices(getConfirmationWordIndices(m));
  }, []);

  useEffect(() => {
    if (step === 'success') {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          damping: 12,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [step]);

  const handleCopyAll = () => {
    Clipboard.setString(mnemonic);
    Alert.alert('Copied', 'Recovery phrase copied to clipboard. Store it somewhere safe.');
  };

  const handleVerify = useCallback(() => {
    const incorrect = confirmIndices.filter(
      (idx) => (userAnswers[idx] ?? '').trim().toLowerCase() !== words[idx].toLowerCase(),
    );
    if (incorrect.length > 0) {
      Alert.alert(
        'Incorrect Words',
        `Word${incorrect.length > 1 ? 's' : ''} ${incorrect.map((i) => `#${i + 1}`).join(', ')} ${incorrect.length > 1 ? 'are' : 'is'} incorrect.`,
      );
      return;
    }
    setStep('name');
  }, [confirmIndices, userAnswers, words]);

  const handleCreateAccount = useCallback(async () => {
    setStep('generating');
    setIsGenerating(true);
    try {
      const { address } = await deriveWalletFromMnemonic(mnemonic);
      await storeMnemonic(mnemonic);
      const identity = await generateSessionIdentity(mnemonic, address);
      const finalIdentity = {
        ...identity,
        displayName: displayName.trim() || undefined,
      };
      // Update stored identity with display name
      if (displayName.trim()) {
        const { updateStoredIdentity } = await import('../../src/crypto/session');
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
        // Non-fatal — chain may be offline during setup; will retry on next login
      }
      setGeneratedIdentity(finalIdentity);
      setIdentity(finalIdentity);
      setOnboarded(true);
      setStep('success');
    } catch (err) {
      console.error('Wallet creation failed:', err);
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
      setStep('name');
    } finally {
      setIsGenerating(false);
    }
  }, [mnemonic, displayName, setIdentity, setOnboarded]);

  // ── Generating ──
  if (step === 'generating') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={styles.loadingText}>Setting up your secure identity...</Text>
        <Text style={styles.loadingSubtext}>Generating cryptographic keys</Text>
      </View>
    );
  }

  // ── Success ──
  if (step === 'success') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={[styles.scroll, { alignItems: 'center', paddingTop: 40 }]}>
          <Animated.View
            style={[
              styles.successIcon,
              { transform: [{ scale: successScale }], opacity: successOpacity },
            ]}
          >
            <Ionicons name="checkmark" size={48} color="#fff" />
          </Animated.View>

          <Animated.View style={{ opacity: successOpacity, alignItems: 'center' }}>
            <Text style={styles.successTitle}>Identity Created!</Text>
            <Text style={styles.successSubtitle}>
              Your encrypted Tamizhi ID has been generated and stored securely.
            </Text>

            <View style={styles.sessionIdCard}>
              <Text style={styles.sessionIdLabel}>YOUR TAMIZHI ID</Text>
              <Text style={styles.sessionIdValue} selectable>
                {generatedIdentity?.publicKey ?? ''}
              </Text>
              <Text style={styles.sessionIdHint}>
                Share this Tamizhi ID with contacts so they can message you.
              </Text>
            </View>

            <View style={styles.successTips}>
              {[
                'Your messages are end-to-end encrypted',
                'No phone number or email required',
                'Your keys never leave this device',
              ].map((tip) => (
                <View key={tip} style={styles.tip}>
                  <Ionicons name="shield-checkmark" size={16} color={T.accent} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/(tabs)/chats')}
          >
            <Text style={styles.primaryBtnText}>Start Messaging</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Warning ──
  if (step === 'warn') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StepIndicator step={step} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={28} color="#ffd166" />
            <Text style={styles.warningTitle}>Back Up Your Recovery Phrase</Text>
            <Text style={styles.warningText}>
              Your 24-word recovery phrase is the ONLY way to restore your account.
              Write it down and store it somewhere safe.{'\n\n'}
              Never share it with anyone. Tamizhi will never ask for it.
            </Text>
          </View>
          <View style={styles.checkList}>
            {[
              'Write it down on paper',
              'Store it in a secure location',
              'Never enter it on any website',
              'Never share it with anyone',
            ].map((item) => (
              <View key={item} style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={18} color={T.success} />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('reveal')}>
            <Text style={styles.primaryBtnText}>Show Recovery Phrase</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Reveal ──
  if (step === 'reveal') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StepIndicator step={step} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.stepTitle}>Your Recovery Phrase</Text>
          <Text style={styles.stepSubtitle}>
            Write these 24 words in order. Keep them safe and private.
          </Text>

          <View style={styles.mnemonicGrid}>
            {words.map((word, idx) => (
              <View key={idx} style={styles.wordCell}>
                <Text style={styles.wordNumber}>{idx + 1}</Text>
                <Text style={styles.wordText}>{revealed ? word : '••••'}</Text>
              </View>
            ))}
          </View>

          <View style={styles.revealRow}>
            <TouchableOpacity style={styles.revealBtn} onPress={() => setRevealed(!revealed)}>
              <Ionicons name={revealed ? 'eye-off' : 'eye'} size={18} color={T.primary} />
              <Text style={styles.revealBtnText}>
                {revealed ? 'Hide' : 'Tap to Reveal'} Phrase
              </Text>
            </TouchableOpacity>

            {revealed && (
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAll}>
                <Ionicons name="copy-outline" size={16} color={T.accent} />
                <Text style={styles.copyBtnText}>Copy All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.warningSmall}>
            <Ionicons name="lock-closed" size={13} color={T.danger} />
            <Text style={styles.warningSmallText}>
              Screenshot protection is recommended. No one should see your recovery phrase.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, !revealed && styles.btnDisabled]}
            onPress={() => setStep('verify')}
          >
            <Text style={styles.primaryBtnText}>I've Written It Down</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Verify ──
  if (step === 'verify') {
    const allFilled = confirmIndices.every((i) => userAnswers[i]?.trim());
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StepIndicator step={step} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.stepTitle}>Verify Your Phrase</Text>
            <Text style={styles.stepSubtitle}>
              Enter the words at the positions shown to confirm you have saved your recovery phrase.
            </Text>

            {confirmIndices.map((wordIdx) => (
              <View key={wordIdx} style={styles.confirmGroup}>
                <Text style={styles.confirmLabel}>Word #{wordIdx + 1}</Text>
                <TextInput
                  style={styles.confirmInput}
                  value={userAnswers[wordIdx] ?? ''}
                  onChangeText={(t) =>
                    setUserAnswers((prev) => ({ ...prev, [wordIdx]: t }))
                  }
                  placeholder={`Enter word #${wordIdx + 1}`}
                  placeholderTextColor={T.subtext}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryBtn, !allFilled && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={!allFilled}
            >
              <Text style={styles.primaryBtnText}>Verify Words</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Display name ──
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StepIndicator step="name" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.nameIconWrap}>
            <View style={styles.nameIcon}>
              <Ionicons name="person" size={32} color={T.primary} />
            </View>
          </View>
          <Text style={styles.stepTitle}>Choose a Display Name</Text>
          <Text style={styles.stepSubtitle}>
            This name is stored locally and shown to contacts. You can change it any time in Settings.
          </Text>

          <View style={styles.nameInputGroup}>
            <Text style={styles.nameInputLabel}>Display Name (optional)</Text>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Arjun, Priya…"
              placeholderTextColor={T.subtext}
              maxLength={32}
              returnKeyType="done"
              autoFocus
            />
            <Text style={styles.charCount}>{displayName.length} / 32</Text>
          </View>

          <View style={styles.skipNote}>
            <Ionicons name="information-circle-outline" size={15} color={T.subtext} />
            <Text style={styles.skipNoteText}>
              You can skip this and set a name later in Settings.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleCreateAccount}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
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

  // Success
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: T.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: T.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  successTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  successSubtitle: { color: T.subtext, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 10 },
  sessionIdCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
    marginBottom: 24,
  },
  sessionIdLabel: { color: T.subtext, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  sessionIdValue: { color: T.primary, fontSize: 11, fontFamily: 'monospace', lineHeight: 18, marginBottom: 8 },
  sessionIdHint: { color: T.subtext, fontSize: 12, lineHeight: 18 },
  successTips: { width: '100%', gap: 10 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipText: { color: T.text, fontSize: 14, flex: 1, lineHeight: 20 },

  // Warning
  warningCard: {
    backgroundColor: '#ffd16618',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#ffd16640',
    marginBottom: 24,
  },
  warningTitle: { color: '#ffd166', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  warningText: { color: T.text, fontSize: 14, lineHeight: 22, textAlign: 'center' },

  checkList: { gap: 12, marginBottom: 24 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { color: T.text, fontSize: 15 },

  // Reveal
  stepTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  stepSubtitle: { color: T.subtext, fontSize: 14, lineHeight: 22, marginBottom: 24 },

  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  wordCell: {
    width: '30%',
    backgroundColor: T.card,
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordNumber: { color: T.subtext, fontSize: 10, width: 18 },
  wordText: { color: T.text, fontSize: 14, fontWeight: '600', flex: 1 },

  revealRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  revealBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.primary,
  },
  revealBtnText: { color: T.primary, fontSize: 14, fontWeight: '600' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.accent,
    backgroundColor: T.accent + '15',
  },
  copyBtnText: { color: T.accent, fontSize: 14, fontWeight: '600' },

  warningSmall: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: T.danger + '12',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.danger + '30',
  },
  warningSmallText: { color: T.danger, fontSize: 12, flex: 1, lineHeight: 18 },

  // Verify
  confirmGroup: { marginBottom: 20 },
  confirmLabel: {
    color: T.subtext,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  confirmInput: {
    backgroundColor: T.inputBackground,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    color: T.text,
    fontSize: 16,
    fontWeight: '500',
  },

  // Name
  nameIconWrap: { alignItems: 'center', marginBottom: 20 },
  nameIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: T.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.primary + '40',
  },
  nameInputGroup: { marginBottom: 16 },
  nameInputLabel: {
    color: T.subtext,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: T.inputBackground,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    color: T.text,
    fontSize: 17,
  },
  charCount: { color: T.subtext, fontSize: 11, textAlign: 'right', marginTop: 4 },
  skipNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  skipNoteText: { color: T.subtext, fontSize: 13, flex: 1, lineHeight: 19 },

  // Footer
  footer: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
  },
  primaryBtn: {
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
