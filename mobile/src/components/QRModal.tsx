/**
 * Tamizhi — Unified Identity QR Modal
 *
 * Encodes BOTH wallet address + session key in one QR:
 *   tamizhi://identity?session=<hex>&wallet=<bech32>&name=<display>
 *
 * A single scan lets others:
 *   • Start an encrypted chat  (uses session key)
 *   • Send TMZ payments        (uses wallet address)
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Clipboard,
  Alert,
} from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../config';

const T = CONFIG.THEME;

export interface QRModalProps {
  visible: boolean;
  onClose: () => void;
  // Core identity
  sessionPubKey: string;
  walletAddress?: string;
  displayName?: string;
  // Legacy single-value mode
  value?: string;
  title?: string;
  subtitle?: string;
}

/** Build a deep-link URI that carries the full unified identity */
function buildIdentityURI(
  sessionPubKey: string,
  walletAddress?: string,
  displayName?: string,
): string {
  const params = new URLSearchParams();
  params.set('session', sessionPubKey);
  if (walletAddress) params.set('wallet', walletAddress);
  if (displayName)   params.set('name', displayName);
  return `tamizhi://identity?${params.toString()}`;
}

function truncate(s: string, head = 12, tail = 8) {
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export const QRModal: React.FC<QRModalProps> = ({
  visible, onClose,
  sessionPubKey, walletAddress, displayName,
  value, title, subtitle,
}) => {
  const [tab, setTab] = useState<'unified' | 'session' | 'wallet'>('unified');

  // Legacy single-value mode
  const isLegacy = Boolean(value && !sessionPubKey);
  const qrValue = isLegacy
    ? (value ?? ' ')
    : buildIdentityURI(sessionPubKey, walletAddress, displayName);

  const displayQR = tab === 'session'
    ? sessionPubKey
    : tab === 'wallet'
    ? (walletAddress ?? sessionPubKey)
    : qrValue;

  async function handleShare() {
    try {
      await Share.share({
        message: displayQR,
        title: title ?? 'Tamizhi Identity',
      });
    } catch {}
  }

  function handleCopy() {
    Clipboard.setString(displayQR);
    Alert.alert('Copied!', 'Identity copied to clipboard.');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 32 }} />
            <Text style={styles.title}>{title ?? 'My Identity'}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={T.subtext} />
            </TouchableOpacity>
          </View>

          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Tab selector (only for unified mode) */}
          {!isLegacy && walletAddress && (
            <View style={styles.tabs}>
              {([
                { key: 'unified', label: '🔗 Unified' },
                { key: 'session', label: '💬 Chat' },
                { key: 'wallet',  label: '💰 Wallet' },
              ] as const).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
                  onPress={() => setTab(key)}
                >
                  <Text style={[styles.tabBtnText, tab === key && styles.tabBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* QR Code */}
          <View style={styles.qrWrapper}>
            <QRCodeSVG
              value={displayQR || ' '}
              size={210}
              color={T.text}
              backgroundColor={T.card}
              ecl="M"
            />
          </View>

          {/* Identity fields */}
          {!isLegacy ? (
            <View style={styles.identityCard}>
              {displayName && (
                <View style={styles.identityRow}>
                  <Ionicons name="person" size={13} color={T.primary} />
                  <Text style={styles.identityLabel}>Name</Text>
                  <Text style={styles.identityValue}>{displayName}</Text>
                </View>
              )}
              <View style={styles.identityRow}>
                <Ionicons name="chatbubbles" size={13} color={T.primary} />
                <Text style={styles.identityLabel}>Chat ID</Text>
                <Text style={[styles.identityValue, styles.mono]}>
                  {truncate(sessionPubKey, 10, 8)}
                </Text>
              </View>
              {walletAddress && (
                <View style={styles.identityRow}>
                  <Ionicons name="wallet" size={13} color={T.accent} />
                  <Text style={styles.identityLabel}>Wallet</Text>
                  <Text style={[styles.identityValue, styles.mono, { color: T.accent }]}>
                    {truncate(walletAddress, 12, 6)}
                  </Text>
                </View>
              )}
              {/* Unified hint */}
              {walletAddress && tab === 'unified' && (
                <View style={styles.hint}>
                  <Ionicons name="information-circle" size={13} color={T.subtext} />
                  <Text style={styles.hintText}>
                    One scan → chat + send TMZ
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.legacyValue} selectable>
              {value}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
              <Ionicons name="copy-outline" size={18} color={T.primary} />
              <Text style={styles.actionBtnText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color={T.primary} />
              <Text style={styles.actionBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: T.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  title: { color: T.text, fontSize: 17, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.border + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  subtitle: {
    color: T.subtext, fontSize: 12, textAlign: 'center',
    marginBottom: 10, marginTop: 2, lineHeight: 17,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: T.card,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 2,
    width: '100%',
  },
  tabBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: T.primary + '30', borderWidth: 1, borderColor: T.primary + '60' },
  tabBtnText: { fontSize: 11, color: T.subtext, fontWeight: '600' },
  tabBtnTextActive: { color: T.primary },

  // QR
  qrWrapper: {
    padding: 16,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 14,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },

  // Identity card
  identityCard: {
    width: '100%',
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
    marginBottom: 14,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  identityLabel: {
    fontSize: 11,
    color: T.subtext,
    width: 44,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  identityValue: {
    flex: 1,
    fontSize: 12,
    color: T.text,
  },
  mono: { fontFamily: 'monospace' },

  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
  },
  hintText: { fontSize: 11, color: T.subtext, flex: 1 },

  legacyValue: {
    color: T.subtext, fontSize: 11,
    fontFamily: 'monospace', textAlign: 'center',
    marginBottom: 14, lineHeight: 17,
  },

  // Actions
  actions: {
    flexDirection: 'row', gap: 8, width: '100%',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: T.primary,
    backgroundColor: T.primary + '12',
  },
  actionBtnText: { color: T.primary, fontSize: 13, fontWeight: '600' },
  closeButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: T.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  closeButtonText: { color: T.text, fontSize: 13, fontWeight: '600' },
});
