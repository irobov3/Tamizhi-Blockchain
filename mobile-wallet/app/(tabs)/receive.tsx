/**
 * app/(tabs)/receive.tsx
 * Receive screen — QR code, address copy, and share.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

export default function Receive() {
  const address = useWalletStore((s) => s.address);
  const [copied, setCopied] = useState(false);

  if (!address) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={s.loadingText}>Loading wallet…</Text>
      </SafeAreaView>
    );
  }

  async function copy() {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied', 'Address copied to clipboard.');
  }

  async function share() {
    try {
      await Share.share({
        message: `My Tamizhi wallet address:\n${address}`,
        title: 'Tamizhi Wallet Address',
      });
    } catch (err: any) {
      Alert.alert('Share failed', err?.message ?? 'Could not open share sheet.');
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Receive TMZ</Text>
        <Text style={s.subtitle}>Share this address to receive Tamizhi tokens</Text>

        <View style={s.qrContainer}>
          <QRCode
            value={address}
            size={220}
            backgroundColor="#fdf6e3"
            color="#1a1040"
          />
        </View>

        <View style={s.addressBox}>
          <Text style={s.addressText} selectable>{address}</Text>
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.actionBtn, s.copyBtn]} onPress={copy}>
            <MaterialCommunityIcons
              name={copied ? 'check' : 'content-copy'}
              size={18}
              color={C.card}
            />
            <Text style={s.actionBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.actionBtn, s.shareBtn]} onPress={share}>
            <MaterialCommunityIcons name="share-variant" size={18} color={C.gold} />
            <Text style={[s.actionBtnText, { color: C.gold }]}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={s.notice}>
          <Text style={s.noticeText}>
            Only send TMZ (Tamizhi) to this address. Sending other tokens may result in permanent loss.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 24, paddingTop: 60, alignItems: 'center', paddingBottom: 60 },
  loadingText: { color: C.muted, marginTop: 12, fontSize: 14 },

  title: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8 },
  subtitle: { color: C.muted, marginBottom: 32, textAlign: 'center', fontSize: 14 },

  qrContainer: {
    padding: 16,
    backgroundColor: '#fdf6e3',
    borderRadius: 20,
    shadowColor: C.gold,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  addressBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
  },
  addressText: {
    color: C.gold,
    fontFamily: 'monospace',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  copyBtn: { backgroundColor: C.gold },
  shareBtn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  actionBtnText: { color: C.card, fontWeight: '800', fontSize: 15 },

  notice: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255,77,77,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.error,
    width: '100%',
  },
  noticeText: { color: C.error, fontSize: 13, lineHeight: 18 },
});
