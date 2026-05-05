import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QRModal } from '../../src/components/QRModal';
import { useStore } from '../../src/store/useStore';
import { getBalance, formatBalance, WalletBalance, getWalletBySessionID } from '../../src/api/chain';
import { sendTokens } from '../../src/crypto/txSigning';
import { getStoredMnemonic } from '../../src/crypto/wallet';
import { CONFIG } from '../../src/config';
import dayjs from 'dayjs';

const T = CONFIG.THEME;

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: string;
  address: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  memo?: string;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 20) return addr;
  return addr.slice(0, 12) + '...' + addr.slice(-8);
}

function TxIcon({ type }: { type: Transaction['type'] }) {
  return (
    <View
      style={[
        styles.txIcon,
        { backgroundColor: type === 'received' ? T.success + '22' : T.primary + '22' },
      ]}
    >
      <Ionicons
        name={type === 'received' ? 'arrow-down' : 'arrow-up'}
        size={18}
        color={type === 'received' ? T.success : T.primary}
      />
    </View>
  );
}

export default function WalletScreen() {
  const { identity } = useStore();
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [networkOnline, setNetworkOnline] = useState(false);
  const [showReceiveQR, setShowReceiveQR] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMemo, setSendMemo] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Transactions loaded from chain when network is live
  const [transactions] = useState<Transaction[]>([]);


  const loadBalance = useCallback(async () => {
    if (!identity?.walletAddress) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await getBalance(identity.walletAddress);
      setBalances(result);
      setNetworkOnline(true);
    } catch {
      // Chain unavailable — show offline state
      setNetworkOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, [identity?.walletAddress]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadBalance();
    setIsRefreshing(false);
  };

  const handleCopyAddress = () => {
    if (!identity?.walletAddress) return;
    Clipboard.setString(identity.walletAddress);
    Alert.alert('Copied', 'Wallet address copied to clipboard');
  };

  const handleSend = async () => {
    if (!sendAddress.trim() || !sendAmount.trim()) return;
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    // Resolve Tamizhi session key → wallet address if needed
    let resolvedAddress = sendAddress.trim();
    const looksLikeSessionKey = /^[0-9a-fA-F]{64,66}$/.test(resolvedAddress);
    if (looksLikeSessionKey) {
      try {
        const record = await getWalletBySessionID(resolvedAddress);
        if (record?.walletAddress) {
          resolvedAddress = record.walletAddress;
        } else {
          Alert.alert(
            'Contact Not Found',
            'No wallet address is linked to this Tamizhi ID. Ask your contact to share their wallet address directly.',
          );
          return;
        }
      } catch {
        Alert.alert('Lookup Failed', 'Could not resolve Tamizhi ID to a wallet address. Check your connection.');
        return;
      }
    }

    Alert.alert(
      'Confirm Transaction',
      `Send ${sendAmount} TMZ to\n${truncateAddress(resolvedAddress)}${sendMemo ? `\n\nMemo: ${sendMemo}` : ''}\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            setIsSending(true);
            try {
              const mnemonic = await getStoredMnemonic();
              if (!mnemonic) {
                Alert.alert('Error', 'Wallet not found. Please re-import your identity.');
                return;
              }
              const result = await sendTokens(mnemonic, resolvedAddress, amount, sendMemo.trim());
              if (result.success) {
                setSendModalVisible(false);
                setSendAddress('');
                setSendAmount('');
                setSendMemo('');
                Alert.alert(
                  '✅ Transaction Sent',
                  `TX Hash:\n${result.txHash.slice(0, 20)}...`,
                );
                // Refresh balance
                await loadBalance();
              } else {
                Alert.alert('Transaction Failed', result.error ?? 'Unknown error');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Transaction failed. Check network connection.');
            } finally {
              setIsSending(false);
            }
          },
        },
      ],
    );
  };

  const formattedBalance = formatBalance(balances);
  const walletAddress = identity?.walletAddress ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
            colors={[T.primary]}
          />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={[styles.chainPill, !networkOnline && styles.chainPillOffline]}>
              <View style={[styles.chainDot, !networkOnline && styles.chainDotOffline]} />
              <Text style={styles.chainLabel}>
                {networkOnline ? 'Tamizhi Network' : 'Network Offline'}
              </Text>
            </View>
            <TouchableOpacity onPress={onRefresh} disabled={isRefreshing}>
              <Ionicons name="refresh" size={18} color={isRefreshing ? T.subtext : T.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceLabel}>Available Balance</Text>
          {isLoading ? (
            <ActivityIndicator color={T.primary} style={{ marginVertical: 16 }} />
          ) : (
            <>
              <Text style={styles.balanceAmount}>{formattedBalance}</Text>
              <Text style={styles.balanceUSD}>≈ $0.00 USD</Text>
            </>
          )}

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setSendModalVisible(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: T.primary }]}>
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReceiveQR(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: T.accent }]}>
                <Ionicons name="arrow-down" size={20} color={T.background} />
              </View>
              <Text style={styles.actionLabel}>Receive</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleCopyAddress}>
              <View style={[styles.actionIcon, { backgroundColor: T.card }]}>
                <Ionicons name="copy" size={20} color={T.text} />
              </View>
              <Text style={styles.actionLabel}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Wallet Address</Text>
            <TouchableOpacity onPress={handleCopyAddress} style={styles.copyBtn}>
              <Ionicons name="copy-outline" size={15} color={T.primary} />
              <Text style={styles.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleCopyAddress} activeOpacity={0.7}>
            <Text style={styles.addressText} selectable>
              {walletAddress || '—'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chain status */}
        <View style={styles.chainStatusRow}>
          <View style={styles.chainDot} />
          <Text style={styles.chainStatusText}>
            Chain: {CONFIG.CHAIN_ID} · {CONFIG.CHAIN_REST_URL}
          </Text>
        </View>

        {/* Transaction History */}
        <View style={styles.txSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          {transactions.length === 0 ? (
            <View style={styles.noTx}>
              <Ionicons name="receipt-outline" size={36} color={T.border} />
              <Text style={styles.noTxText}>No transactions yet</Text>
              <Text style={styles.noTxSub}>
                {networkOnline
                  ? 'Your transaction history will appear here'
                  : 'Connect to Tamizhi network to see transactions'}
              </Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.txItem}>
                <TxIcon type={tx.type} />
                <View style={styles.txInfo}>
                  <Text style={styles.txType}>
                    {tx.type === 'received' ? 'Received' : 'Sent'}
                    {tx.memo ? ` · ${tx.memo}` : ''}
                  </Text>
                  <Text style={styles.txAddress} numberOfLines={1}>
                    {tx.type === 'received' ? 'From' : 'To'}: {truncateAddress(tx.address)}
                  </Text>
                  <Text style={styles.txTime}>
                    {dayjs(tx.timestamp).format('MMM D, HH:mm')}
                  </Text>
                </View>
                <View style={styles.txAmountCol}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'received' ? T.success : T.text },
                    ]}
                  >
                    {tx.type === 'received' ? '+' : '-'}
                    {tx.amount}
                  </Text>
                  <View
                    style={[
                      styles.txStatusBadge,
                      {
                        backgroundColor:
                          tx.status === 'confirmed'
                            ? T.success + '22'
                            : tx.status === 'pending'
                            ? '#ffd166' + '22'
                            : T.danger + '22',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.txStatusText,
                        {
                          color:
                            tx.status === 'confirmed'
                              ? T.success
                              : tx.status === 'pending'
                              ? '#ffd166'
                              : T.danger,
                        },
                      ]}
                    >
                      {tx.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Receive QR Modal — shows wallet address only (for payments) */}
      <QRModal
        visible={showReceiveQR}
        onClose={() => setShowReceiveQR(false)}
        sessionPubKey={identity?.publicKey ?? ''}
        walletAddress={walletAddress || undefined}
        displayName={identity?.displayName}
        title="Receive TMZ"
        subtitle="Share this to receive TMZ payments"
      />

      {/* Send Modal */}
      <Modal
        visible={sendModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSendModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setSendModalVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Send TMZ</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Recipient</Text>
              <TextInput
                style={styles.input}
                value={sendAddress}
                onChangeText={setSendAddress}
                placeholder="Wallet address or Tamizhi ID"
                placeholderTextColor={T.subtext}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.inputHint}>
                Enter a wallet address (tamizhi1…) or a Tamizhi Chat ID (hex)
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (TMZ)</Text>
              <TextInput
                style={styles.input}
                value={sendAmount}
                onChangeText={setSendAmount}
                placeholder="0.000000"
                placeholderTextColor={T.subtext}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Memo (optional)</Text>
              <TextInput
                style={styles.input}
                value={sendMemo}
                onChangeText={setSendMemo}
                placeholder="Optional note"
                placeholderTextColor={T.subtext}
                maxLength={128}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (isSending || !sendAddress.trim() || !sendAmount.trim()) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={isSending || !sendAddress.trim() || !sendAmount.trim()}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Send TMZ</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  scroll: { padding: 16, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  chainDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.success },
  chainDotOffline: { backgroundColor: '#ff6b6b' },
  chainPillOffline: { borderWidth: 1, borderColor: '#ff6b6b40' },
  chainLabel: { color: T.text, fontSize: 12, fontWeight: '500' },

  balanceLabel: { color: T.subtext, fontSize: 13, marginBottom: 4 },
  balanceAmount: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  balanceUSD: { color: T.subtext, fontSize: 14, marginBottom: 24 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: { alignItems: 'center', gap: 8 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: T.text, fontSize: 13, fontWeight: '500' },

  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: T.subtext,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.primary + '18',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: T.primary + '40',
  },
  copyBtnText: { color: T.primary, fontSize: 11, fontWeight: '600' },
  addressText: {
    color: T.text,
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
  },

  chainStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  chainStatusText: { color: T.subtext, fontSize: 11 },

  txSection: { marginBottom: 16 },
  noTx: { alignItems: 'center', padding: 32, gap: 8 },
  noTxText: { color: T.text, fontSize: 15, fontWeight: '600' },
  noTxSub: { color: T.subtext, fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 240 },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
    gap: 12,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txInfo: { flex: 1, minWidth: 0 },
  txType: { color: T.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txAddress: { color: T.subtext, fontSize: 12, marginBottom: 2 },
  txTime: { color: T.subtext, fontSize: 11 },
  txAmountCol: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txStatusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  txStatusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: T.text, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputHint: {
    color: T.subtext,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  inputLabel: {
    color: T.subtext,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: T.inputBackground,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 12,
    color: T.text,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  sendButtonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
