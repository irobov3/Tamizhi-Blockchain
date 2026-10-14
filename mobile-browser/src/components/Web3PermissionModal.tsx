import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../config';
import { useWeb3Store } from '../store/web3';

const T = CONFIG.THEME;

const METHOD_DESCRIPTIONS: Record<string, string> = {
  enable: 'Connect to your Tamizhi wallet',
  getAccounts: 'View your wallet addresses',
  signAmino: 'Sign a transaction (amino)',
  signDirect: 'Sign a transaction (direct)',
};

export const Web3PermissionModal: React.FC = () => {
  const pending = useWeb3Store((s) => s.pending);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (pending) setRemember(false);
  }, [pending?.id]);

  if (!pending) return null;

  const description =
    METHOD_DESCRIPTIONS[pending.method] ?? `Call ${pending.method}`;

  const approve = () => pending.resolve(true, remember);
  const deny = () => pending.resolve(false, remember);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={deny}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={28} color={T.primary} />
          </View>
          <Text style={styles.title}>Wallet request</Text>
          <Text style={styles.domain}>{pending.domain}</Text>
          <Text style={styles.desc}>{description}</Text>

          {pending.method.startsWith('sign') && pending.params ? (
            <View style={styles.paramsBox}>
              <Text style={styles.paramsLabel}>Details</Text>
              <Text style={styles.paramsText} numberOfLines={6}>
                {JSON.stringify(pending.params, null, 2)}
              </Text>
            </View>
          ) : null}

          <View style={styles.rememberRow}>
            <Text style={styles.rememberLabel}>Remember choice</Text>
            <Switch
              value={remember}
              onValueChange={setRemember}
              trackColor={{ false: T.border, true: T.primary }}
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDeny]}
              onPress={deny}
            >
              <Text style={styles.btnText}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnApprove]}
              onPress={approve}
            >
              <Text style={[styles.btnText, { color: '#000' }]}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: T.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  domain: {
    color: T.primary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  desc: {
    color: T.subtext,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  paramsBox: {
    marginTop: 14,
    backgroundColor: T.inputBackground,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  paramsLabel: {
    color: T.subtext,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  paramsText: { color: T.text, fontSize: 11, fontFamily: 'monospace' },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  rememberLabel: { color: T.text, fontSize: 13 },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeny: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
  },
  btnApprove: { backgroundColor: T.primary },
  btnText: { color: T.text, fontWeight: '700', fontSize: 14 },
});
