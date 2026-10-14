import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, Contact, getAvatarColor } from '../../src/store/useStore';
import { Avatar } from '../../src/components/Avatar';
import { CONFIG } from '../../src/config';
import { getSessionID, getWalletBySessionID } from '../../src/api/chain';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const T = CONFIG.THEME;

interface ContactSection {
  title: string;
  data: Contact[];
}

function buildSections(contacts: Contact[], query: string): ContactSection[] {
  const filtered = query
    ? contacts.filter(
        (c) =>
          c.displayName.toLowerCase().includes(query.toLowerCase()) ||
          c.sessionPubKey.toLowerCase().includes(query.toLowerCase()),
      )
    : contacts;

  const sorted = [...filtered].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  const map = new Map<string, Contact[]>();
  for (const contact of sorted) {
    const letter = contact.displayName[0]?.toUpperCase() ?? '#';
    const key = /[A-Z]/.test(letter) ? letter : '#';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(contact);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    })
    .map(([title, data]) => ({ title, data }));
}

function ContactRow({
  contact,
  onPress,
  onLongPress,
}: {
  contact: Contact;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.contactRow}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Avatar
        name={contact.displayName}
        pubkey={contact.sessionPubKey}
        color={contact.avatarColor}
        size={48}
      />
      <View style={styles.rowContent}>
        <Text style={styles.contactName}>{contact.displayName}</Text>
        <View style={styles.idChip}>
          <Ionicons name="key-outline" size={11} color={T.subtext} />
          <Text style={styles.idChipText} numberOfLines={1}>
            {contact.sessionPubKey.slice(0, 8)}
          </Text>
        </View>
      </View>
      {contact.isOnline ? (
        <View style={styles.onlineDot} />
      ) : contact.lastSeen ? (
        <Text style={styles.lastSeen}>{dayjs(contact.lastSeen).fromNow(true)}</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={T.subtext} />
    </TouchableOpacity>
  );
}

export default function ContactsScreen() {
  const router = useRouter();
  const { contacts, addContact, removeContact } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputName, setInputName] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [lookedUpInfo, setLookedUpInfo] = useState<string | null>(null);

  const sections = useMemo(
    () => buildSections(contacts, searchQuery),
    [contacts, searchQuery],
  );

  const handleLookup = async () => {
    if (!inputValue.trim()) return;
    setIsLooking(true);
    setLookedUpInfo(null);
    const value = inputValue.trim();
    try {
      if (value.startsWith('tamizhi')) {
        const record = await getSessionID(value);
        if (record) {
          setInputName(record.displayName ?? '');
          setLookedUpInfo(`Found on chain: ${record.sessionPubKey.slice(0, 16)}...`);
        } else {
          setLookedUpInfo('No Tamizhi ID registered for this wallet.');
        }
      } else {
        const record = await getWalletBySessionID(value);
        if (record) {
          setInputName(record.displayName ?? '');
          setLookedUpInfo(`Found on chain: ${record.walletAddress}`);
        } else {
          setLookedUpInfo('Not found on chain (can still add manually).');
        }
      }
    } catch {
      setLookedUpInfo('Chain lookup unavailable. Adding manually.');
    } finally {
      setIsLooking(false);
    }
  };

  const handleAddContact = useCallback(() => {
    const value = inputValue.trim();
    if (!value) return;
    const name = inputName.trim() || value.slice(0, 8) + '...';

    addContact({
      sessionPubKey: value,
      displayName: name,
      avatarColor: getAvatarColor(value),
      addedAt: Date.now(),
    });
    setModalVisible(false);
    setInputValue('');
    setInputName('');
    setLookedUpInfo(null);
  }, [inputValue, inputName, addContact]);

  const handleContactPress = (contact: Contact) => {
    const { addConversation, conversations } = useStore.getState();
    const existing = conversations.find((c) => c.id === contact.sessionPubKey);
    if (!existing) {
      addConversation({
        id: contact.sessionPubKey,
        name: contact.displayName,
        type: 'direct',
        peerSessionPubKey: contact.sessionPubKey,
        messages: [],
        unreadCount: 0,
        avatarColor: contact.avatarColor,
        createdAt: Date.now(),
      });
    }
    router.push(`/chat/${contact.sessionPubKey}`);
  };

  const handleLongPress = (contact: Contact) => {
    Alert.alert(
      contact.displayName,
      contact.sessionPubKey.slice(0, 24) + '...',
      [
        {
          text: 'Message',
          onPress: () => handleContactPress(contact),
        },
        {
          text: 'Copy Tamizhi ID',
          onPress: () => {
            Clipboard.setString(contact.sessionPubKey);
            Alert.alert('Copied', 'Tamizhi ID copied to clipboard');
          },
        },
        {
          text: 'Remove Contact',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Remove Contact',
              `Remove ${contact.displayName}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => removeContact(contact.sessionPubKey),
                },
              ],
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={T.subtext} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search contacts..."
          placeholderTextColor={T.subtext}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>👥</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No contacts found' : 'No contacts yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No contacts matching "${searchQuery}"`
              : 'Add a contact by their Tamizhi ID to start messaging'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.sessionPubKey}
          renderItem={({ item }) => (
            <ContactRow
              contact={item}
              onPress={() => handleContactPress(item)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="person-add" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Add Contact Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Contact</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tamizhi ID or Wallet Address</Text>
              <View style={styles.lookupRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  value={inputValue}
                  onChangeText={(t) => {
                    setInputValue(t);
                    setLookedUpInfo(null);
                  }}
                  placeholder="05abc... or tamizhi1abc..."
                  placeholderTextColor={T.subtext}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.lookupBtn, (isLooking || !inputValue.trim()) && { opacity: 0.5 }]}
                  onPress={handleLookup}
                  disabled={isLooking || !inputValue.trim()}
                >
                  <Ionicons name="search" size={18} color={T.primary} />
                </TouchableOpacity>
              </View>
              {lookedUpInfo && (
                <Text style={styles.lookupResult}>{lookedUpInfo}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={inputName}
                onChangeText={setInputName}
                placeholder="Enter a name"
                placeholderTextColor={T.subtext}
              />
            </View>

            <TouchableOpacity
              style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]}
              onPress={handleAddContact}
              disabled={!inputValue.trim()}
            >
              <Text style={styles.addButtonText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  list: { flexGrow: 1, paddingBottom: 80 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  searchInput: { flex: 1, color: T.text, fontSize: 15, padding: 0 },

  sectionHeader: {
    backgroundColor: T.background,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  sectionHeaderText: {
    color: T.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.background,
    gap: 12,
  },
  rowContent: { flex: 1 },
  contactName: { color: T.text, fontSize: 16, fontWeight: '600', marginBottom: 3 },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.card,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  idChipText: { color: T.subtext, fontSize: 11, fontFamily: 'monospace' },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.success },
  lastSeen: { color: T.subtext, fontSize: 11, marginRight: 4 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: T.border,
    marginLeft: 76,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyIconText: { fontSize: 36 },
  emptyTitle: { color: T.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: T.subtext, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },

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
  lookupRow: { flexDirection: 'row', alignItems: 'center' },
  lookupBtn: {
    width: 44,
    height: 44,
    backgroundColor: T.primary + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupResult: { color: T.accent, fontSize: 12, marginTop: 6 },
  addButton: {
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
