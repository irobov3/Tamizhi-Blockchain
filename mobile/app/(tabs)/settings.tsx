import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  Clipboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { QRModal } from '../../src/components/QRModal';
import { Avatar } from '../../src/components/Avatar';
import {
  clearStoredIdentity,
  updateStoredIdentity,
  formatTamizhiId,
} from '../../src/crypto/session';
import { getStoredMnemonic } from '../../src/crypto/wallet';
import { CONFIG } from '../../src/config';
import { clearAll } from '../../src/utils/storage';

const T = CONFIG.THEME;

// ─── Setting row ───────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: string;
  iconBg?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  first?: boolean;
  last?: boolean;
}

function SettingRow({
  icon,
  iconBg,
  label,
  value,
  onPress,
  rightElement,
  danger,
  first,
  last,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.settingRow,
        first && styles.settingRowFirst,
        last && styles.settingRowLast,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <View
        style={[
          styles.settingIcon,
          { backgroundColor: iconBg ?? (danger ? T.danger + '22' : T.primary + '22') },
        ]}
      >
        <Ionicons name={icon as any} size={17} color={danger ? T.danger : T.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>
          {label}
        </Text>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      </View>
      {rightElement ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={16} color={T.subtext} />
        ) : null)}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Main screen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { identity, setIdentity, setOnboarded, settings, updateSettings, clearAllData } = useStore();

  const [displayName, setDisplayName] = useState(identity?.displayName ?? '');
  const [editingName, setEditingName] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [mnemonicRevealed, setMnemonicRevealed] = useState(false);

  // Network config (editable)
  const [rpcUrl, setRpcUrl] = useState(CONFIG.CHAIN_REST_URL);
  const [storageUrl, setStorageUrl] = useState(CONFIG.STORAGE_SERVER_URL);
  const [editingNetwork, setEditingNetwork] = useState(false);

  // Settings from persisted store
  const notifications = settings.notificationsEnabled;
  const notificationContent = settings.messagePreviewEnabled;
  const setNotifications = (v: boolean) => updateSettings({ notificationsEnabled: v });
  const setNotificationContent = (v: boolean) => updateSettings({ messagePreviewEnabled: v });

  // Privacy toggles (local UI — not yet on chain)
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [linkPreviews, setLinkPreviews] = useState(false);
  const [screenshotProtection, setScreenshotProtection] = useState(true);

  const handleSaveName = async () => {
    if (!identity) return;
    try {
      await updateStoredIdentity({ displayName: displayName.trim() });
      setIdentity({ ...identity, displayName: displayName.trim() || undefined });
      setEditingName(false);
    } catch {
      Alert.alert('Error', 'Failed to save display name');
    }
  };

  const handleCopyTamizhiId = () => {
    if (!identity?.publicKey) return;
    Clipboard.setString(identity.publicKey);
    Alert.alert('Copied', 'Tamizhi ID copied to clipboard');
  };

  const handleExportSeed = async () => {
    Alert.alert(
      'Export Recovery Phrase',
      'Your recovery phrase is the master key to your identity. Never share it with anyone.\n\nAre you sure you want to view it?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Phrase',
          style: 'destructive',
          onPress: async () => {
            const stored = await getStoredMnemonic();
            setMnemonic(stored);
            setMnemonicRevealed(false);
            setShowSeedModal(true);
          },
        },
      ],
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all local messages and contacts. Your identity keys are kept.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            clearAllData();
            await clearAll();
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'This will remove your keys from this device. Make sure you have your recovery phrase backed up.\n\nYou cannot recover your identity without it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearStoredIdentity();
            clearAllData();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  const shortId = identity?.publicKey ? formatTamizhiId(identity.publicKey) : 'Not set';
  const avatarName = displayName || identity?.publicKey?.slice(0, 2) || 'T';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatarWrap}>
            <Avatar
              name={displayName || 'Tamizhi User'}
              pubkey={identity?.publicKey ?? ''}
              size={72}
            />
          </View>

          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display Name"
                placeholderTextColor={T.subtext}
                autoFocus
                maxLength={32}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity style={styles.nameSaveBtn} onPress={handleSaveName}>
                <Text style={styles.nameSaveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nameCancelBtn}
                onPress={() => {
                  setDisplayName(identity?.displayName ?? '');
                  setEditingName(false);
                }}
              >
                <Ionicons name="close" size={18} color={T.subtext} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={() => setEditingName(true)}>
              <Text style={styles.profileName}>
                {displayName || 'Set display name'}
              </Text>
              <Ionicons name="pencil" size={14} color={T.subtext} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}

          <Text style={styles.profileTamizhiId}>{shortId}</Text>
        </View>

        {/* Tamizhi ID */}
        <SectionHeader title="TAMIZHI ID" />
        <View style={styles.sectionCard}>
          <SettingRow
            icon="qr-code"
            label="Show QR Code"
            onPress={() => setShowQR(true)}
            first
          />
          <SettingRow
            icon="copy-outline"
            label="Copy Tamizhi ID"
            value={shortId}
            onPress={handleCopyTamizhiId}
            last
          />
        </View>

        {/* Privacy */}
        <SectionHeader title="PRIVACY" />
        <View style={styles.sectionCard}>
          <SettingRow
            icon="checkmark-done"
            label="Read Receipts"
            first
            rightElement={
              <Switch
                value={readReceipts}
                onValueChange={setReadReceipts}
                trackColor={{ false: T.border, true: T.primary }}
                thumbColor="#fff"
                ios_backgroundColor={T.border}
              />
            }
          />
          <SettingRow
            icon="create"
            label="Typing Indicators"
            rightElement={
              <Switch
                value={typingIndicators}
                onValueChange={setTypingIndicators}
                trackColor={{ false: T.border, true: T.primary }}
                thumbColor="#fff"
                ios_backgroundColor={T.border}
              />
            }
          />
          <SettingRow
            icon="link"
            label="Link Previews"
            rightElement={
              <Switch
                value={linkPreviews}
                onValueChange={setLinkPreviews}
                trackColor={{ false: T.border, true: T.primary }}
                thumbColor="#fff"
                ios_backgroundColor={T.border}
              />
            }
          />
          <SettingRow
            icon="shield-checkmark"
            label="Screenshot Protection"
            last
            rightElement={
              <Switch
                value={screenshotProtection}
                onValueChange={setScreenshotProtection}
                trackColor={{ false: T.border, true: T.primary }}
                thumbColor="#fff"
                ios_backgroundColor={T.border}
              />
            }
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.sectionCard}>
          <SettingRow
            icon="notifications"
            label="Enable Notifications"
            first
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: T.border, true: T.primary }}
                thumbColor="#fff"
                ios_backgroundColor={T.border}
              />
            }
          />
          <SettingRow
            icon="eye-off"
            label="Show Message Content"
            value="Shows sender name only when disabled"
            last
            rightElement={
              <Switch
                value={notificationContent}
                onValueChange={setNotificationContent}
                trackColor={{ false: T.border, true: T.primary }}
                thumbColor="#fff"
                ios_backgroundColor={T.border}
              />
            }
          />
        </View>

        {/* Network */}
        <SectionHeader title="NETWORK" />
        <View style={styles.sectionCard}>
          {editingNetwork ? (
            <View style={styles.networkEditCard}>
              <Text style={styles.networkEditLabel}>RPC URL</Text>
              <TextInput
                style={styles.networkInput}
                value={rpcUrl}
                onChangeText={setRpcUrl}
                placeholder={CONFIG.CHAIN_REST_URL}
                placeholderTextColor={T.subtext}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.networkEditLabel}>Storage URL</Text>
              <TextInput
                style={styles.networkInput}
                value={storageUrl}
                onChangeText={setStorageUrl}
                placeholder={CONFIG.STORAGE_SERVER_URL}
                placeholderTextColor={T.subtext}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.networkEditActions}>
                <TouchableOpacity
                  style={styles.networkSaveBtn}
                  onPress={() => setEditingNetwork(false)}
                >
                  <Text style={styles.networkSaveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.networkCancelBtn}
                  onPress={() => {
                    setRpcUrl(CONFIG.CHAIN_REST_URL);
                    setStorageUrl(CONFIG.STORAGE_SERVER_URL);
                    setEditingNetwork(false);
                  }}
                >
                  <Text style={styles.networkCancelBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <SettingRow
                icon="server"
                label="RPC URL"
                value={rpcUrl}
                onPress={() => setEditingNetwork(true)}
                first
              />
              <SettingRow
                icon="cloud"
                label="Storage URL"
                value={storageUrl}
                onPress={() => setEditingNetwork(true)}
                last
              />
            </>
          )}
        </View>

        {/* Backup */}
        <SectionHeader title="BACKUP" />
        <View style={styles.sectionCard}>
          <SettingRow
            icon="key"
            iconBg={T.accent + '22'}
            label="Export Recovery Phrase"
            value="View your 24-word backup"
            onPress={handleExportSeed}
            first
            last
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="DANGER ZONE" />
        <View style={styles.sectionCard}>
          <SettingRow
            icon="trash"
            label="Clear All Data"
            value="Delete messages &amp; contacts"
            onPress={handleClearData}
            danger
            first
          />
          <SettingRow
            icon="log-out"
            label="Sign Out"
            value="Remove keys from this device"
            onPress={handleSignOut}
            danger
            last
          />
        </View>

        {/* About */}
        <SectionHeader title="ABOUT" />
        <View style={styles.sectionCard}>
          <SettingRow
            icon="information-circle"
            label="Version"
            value="1.0.0"
            first
          />
          <SettingRow
            icon="shield"
            label="Privacy Policy"
            onPress={() =>
              Alert.alert(
                'Privacy',
                'Messages are encrypted end-to-end. Tamizhi cannot read your messages.',
              )
            }
          />
          <SettingRow
            icon="logo-github"
            label="Open Source"
            value="github.com/tamizhi-ai"
            onPress={() => {}}
            last
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Tamizhi Messenger v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Chain: {CONFIG.CHAIN_ID}{'\n'}
            End-to-end encrypted · Private by default
          </Text>
        </View>
      </ScrollView>

      {/* Unified Identity QR Modal */}
      {identity?.publicKey && (
        <QRModal
          visible={showQR}
          onClose={() => setShowQR(false)}
          sessionPubKey={identity.publicKey}
          walletAddress={identity.walletAddress}
          displayName={identity.displayName}
          title="My Tamizhi Identity"
          subtitle="One scan — chat &amp; send TMZ payments"
        />
      )}

      {/* Seed Phrase Modal */}
      <Modal
        visible={showSeedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSeedModal(false)}
      >
        <View style={styles.seedOverlay}>
          <View style={styles.seedSheet}>
            <View style={styles.seedHeader}>
              <Ionicons name="warning" size={20} color="#ffd166" />
              <Text style={styles.seedTitle}>Recovery Phrase</Text>
              <TouchableOpacity onPress={() => setShowSeedModal(false)}>
                <Ionicons name="close" size={22} color={T.subtext} />
              </TouchableOpacity>
            </View>

            <View style={styles.seedWarning}>
              <Text style={styles.seedWarningText}>
                Never share this with anyone. Anyone with this phrase can access your account.
              </Text>
            </View>

            {mnemonic ? (
              <>
                <View style={styles.seedGrid}>
                  {mnemonic.split(' ').map((word, idx) => (
                    <View key={idx} style={styles.seedWordCell}>
                      <Text style={styles.seedWordNum}>{idx + 1}</Text>
                      <Text style={styles.seedWord}>
                        {mnemonicRevealed ? word : '••••'}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.revealBtn}
                  onPress={() => setMnemonicRevealed(!mnemonicRevealed)}
                >
                  <Ionicons
                    name={mnemonicRevealed ? 'eye-off' : 'eye'}
                    size={16}
                    color={T.primary}
                  />
                  <Text style={styles.revealBtnText}>
                    {mnemonicRevealed ? 'Hide' : 'Reveal'} Phrase
                  </Text>
                </TouchableOpacity>

                {mnemonicRevealed && (
                  <TouchableOpacity
                    style={styles.copyAllBtn}
                    onPress={() => {
                      Clipboard.setString(mnemonic);
                      Alert.alert('Copied', 'Recovery phrase copied. Store it safely.');
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color={T.accent} />
                    <Text style={styles.copyAllBtnText}>Copy All Words</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.noSeed}>
                <Ionicons name="alert-circle-outline" size={32} color={T.danger} />
                <Text style={styles.noSeedText}>
                  Recovery phrase not found. It may not have been stored during setup.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.seedCloseBtn}
              onPress={() => setShowSeedModal(false)}
            >
              <Text style={styles.seedCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  scroll: { paddingBottom: 40 },

  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
    marginBottom: 12,
  },
  profileAvatarWrap: {
    marginBottom: 12,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  profileName: { color: T.text, fontSize: 20, fontWeight: '700' },
  profileTamizhiId: { color: T.subtext, fontSize: 12, fontFamily: 'monospace' },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    width: '100%',
  },
  nameInput: {
    flex: 1,
    backgroundColor: T.inputBackground,
    borderWidth: 1,
    borderColor: T.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: T.text,
    fontSize: 16,
  },
  nameSaveBtn: {
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  nameSaveBtnText: { color: '#fff', fontWeight: '700' },
  nameCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },

  sectionHeader: {
    color: T.subtext,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionCard: {
    marginHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
    backgroundColor: T.card,
  },
  settingRowFirst: {},
  settingRowLast: { borderBottomWidth: 0 },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingLabel: { color: T.text, fontSize: 15, fontWeight: '500' },
  settingLabelDanger: { color: T.danger },
  settingValue: { color: T.subtext, fontSize: 12, marginTop: 2 },

  networkEditCard: {
    backgroundColor: T.card,
    padding: 16,
    gap: 8,
  },
  networkEditLabel: {
    color: T.subtext,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  networkInput: {
    backgroundColor: T.inputBackground,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    padding: 10,
    color: T.text,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  networkEditActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  networkSaveBtn: {
    flex: 1,
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  networkSaveBtnText: { color: '#fff', fontWeight: '700' },
  networkCancelBtn: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  networkCancelBtnText: { color: T.subtext, fontWeight: '600' },

  footer: {
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
  },
  footerText: { color: T.subtext, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  footerSubtext: {
    color: T.subtext + '80',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Seed modal
  seedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  seedSheet: {
    backgroundColor: T.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  seedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  seedTitle: { flex: 1, color: T.text, fontSize: 17, fontWeight: '700' },
  seedWarning: {
    backgroundColor: '#ffd16618',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ffd16640',
  },
  seedWarningText: { color: '#ffd166', fontSize: 13, lineHeight: 19 },
  seedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  seedWordCell: {
    width: '30%',
    backgroundColor: T.card,
    borderRadius: 9,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  seedWordNum: { color: T.subtext, fontSize: 10, width: 16 },
  seedWord: { color: T.text, fontSize: 13, fontWeight: '600', flex: 1 },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.primary,
    marginBottom: 10,
  },
  revealBtnText: { color: T.primary, fontSize: 14, fontWeight: '600' },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.accent,
    backgroundColor: T.accent + '15',
    marginBottom: 10,
  },
  copyAllBtnText: { color: T.accent, fontSize: 14, fontWeight: '600' },
  noSeed: { alignItems: 'center', padding: 20, gap: 10 },
  noSeedText: { color: T.subtext, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  seedCloseBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  seedCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
