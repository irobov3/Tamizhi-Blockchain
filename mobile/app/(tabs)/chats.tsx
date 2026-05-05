import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useStore, Conversation, getAvatarColor } from '../../src/store/useStore';
import { ConversationItem } from '../../src/components/ConversationItem';
import { CONFIG } from '../../src/config';
import { getSessionID } from '../../src/api/chain';
import { AI_ASSISTANT_ID, AI_ASSISTANT_NAME, AI_ASSISTANT_COLOR } from '../../src/api/ai';

const T = CONFIG.THEME;

function RightAction({
  onDelete,
  dragX,
}: {
  onDelete: () => void;
  dragX: Animated.AnimatedInterpolation<number>;
}) {
  const scale = dragX.interpolate({
    inputRange: [-80, -40],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View style={[styles.deleteAction, { transform: [{ scale }] }]}>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.85}>
        <Ionicons name="trash" size={22} color="#fff" />
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ChatsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { getSortedConversations, addConversation, deleteConversation, contacts } = useStore();
  const conversations = getSortedConversations();

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Set search + compose buttons in the tab header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 4 }}>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => setSearchVisible((v) => !v)}
          >
            <Ionicons name="search" size={22} color={T.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="create-outline" size={22} color={T.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);
  const [inputValue, setInputValue] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.peerSessionPubKey ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : conversations;

  const handleOpenChat = useCallback(
    (conv: Conversation) => {
      router.push(`/chat/${conv.id}`);
    },
    [router],
  );

  const handleDeleteConversation = useCallback(
    (conv: Conversation) => {
      Alert.alert(
        'Delete Conversation',
        `Delete conversation with ${conv.name}? Messages cannot be recovered.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              swipeableRefs.current.get(conv.id)?.close();
              deleteConversation(conv.id);
            },
          },
        ],
      );
    },
    [deleteConversation],
  );

  const handleStartNewChat = async () => {
    if (!inputValue.trim()) return;
    const rawInput = inputValue.trim();

    setIsLooking(true);
    let resolvedName = displayName.trim();
    // finalSessionKey: what we use as the conversation ID (always session pub key)
    let finalSessionKey = rawInput;

    // ── Case 1: User entered a wallet address (tamizhi1...) ──────────────────
    // Look up their session key from the on-chain identity registry
    if (rawInput.startsWith('tamizhi')) {
      try {
        const record = await getSessionID(rawInput);
        if (record) {
          finalSessionKey = record.sessionPubKey;   // ← use session key for chat
          if (!resolvedName) resolvedName = record.displayName ?? record.sessionPubKey.slice(0, 8);
        }
      } catch {}
    }

    // ── Case 2: User entered a session pub key directly ──────────────────────
    // Check local contacts first
    const contact = contacts.find((c) => c.sessionPubKey === finalSessionKey);
    if (contact && !resolvedName) resolvedName = contact.displayName;

    if (!resolvedName) resolvedName = finalSessionKey.slice(0, 8) + '...';
    setIsLooking(false);

    // Open existing conversation if already present
    const { conversations: convs } = useStore.getState();
    const existing = convs.find((c) => c.id === finalSessionKey);
    if (existing) {
      setModalVisible(false);
      setInputValue('');
      setDisplayName('');
      router.push(`/chat/${finalSessionKey}`);
      return;
    }

    addConversation({
      id: finalSessionKey,
      name: resolvedName,
      type: 'direct',
      peerSessionPubKey: finalSessionKey,
      messages: [],
      unreadCount: 0,
      avatarColor: getAvatarColor(finalSessionKey),
      createdAt: Date.now(),
    });
    setModalVisible(false);
    setInputValue('');
    setDisplayName('');
    router.push(`/chat/${finalSessionKey}`);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const renderItem = ({ item }: { item: Conversation }) => (
    <Swipeable
      ref={(ref) => swipeableRefs.current.set(item.id, ref)}
      renderRightActions={(_, dragX) => (
        <RightAction onDelete={() => handleDeleteConversation(item)} dragX={dragX} />
      )}
      overshootRight={false}
      rightThreshold={60}
    >
      <ConversationItem
        conversation={item}
        onPress={() => handleOpenChat(item)}
        onLongPress={() => handleDeleteConversation(item)}
      />
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search bar */}
      {searchVisible && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={T.subtext} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor={T.subtext}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            onPress={() => {
              setSearchVisible(false);
              setSearchQuery('');
            }}
          >
            <Text style={styles.searchCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Always-visible Tamizhi.AI assistant card */}
      {!searchQuery && (
        <TouchableOpacity
          style={styles.aiCard}
          onPress={() => router.push(`/chat/${AI_ASSISTANT_ID}`)}
          activeOpacity={0.85}
        >
          <View style={[styles.aiAvatar, { backgroundColor: AI_ASSISTANT_COLOR + '22', borderColor: AI_ASSISTANT_COLOR + '60' }]}>
            <Ionicons name="sparkles" size={22} color={AI_ASSISTANT_COLOR} />
          </View>
          <View style={styles.aiCardText}>
            <Text style={[styles.aiCardName, { color: AI_ASSISTANT_COLOR }]}>{AI_ASSISTANT_NAME}</Text>
            <Text style={styles.aiCardSub}>Ask me anything — blockchain, crypto, coding…</Text>
          </View>
          <View style={[styles.aiPill, { backgroundColor: AI_ASSISTANT_COLOR + '20', borderColor: AI_ASSISTANT_COLOR + '50' }]}>
            <Text style={[styles.aiPillText, { color: AI_ASSISTANT_COLOR }]}>AI</Text>
          </View>
        </TouchableOpacity>
      )}

      {filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>🔐</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No results' : 'No conversations yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No conversations matching "${searchQuery}"`
              : 'Start an encrypted conversation by tapping the + button below'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={T.primary}
              colors={[T.primary]}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="create" size={24} color="#fff" />
      </TouchableOpacity>

      {/* New Chat Modal */}
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
            <Text style={styles.modalTitle}>New Encrypted Chat</Text>
            <Text style={styles.modalSubtitle}>
              Enter a Tamizhi ID (hex) or wallet address
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tamizhi ID / Wallet Address</Text>
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="05a1b2c3d4... or tamizhi1abc..."
                placeholderTextColor={T.subtext}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter a name for this contact"
                placeholderTextColor={T.subtext}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.startButton,
                (!inputValue.trim() || isLooking) && styles.startButtonDisabled,
              ]}
              onPress={handleStartNewChat}
              disabled={!inputValue.trim() || isLooking}
            >
              <Text style={styles.startButtonText}>
                {isLooking ? 'Looking up...' : 'Start Secure Chat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setInputValue('');
                setDisplayName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  list: { flexGrow: 1 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.card,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: T.text,
    fontSize: 15,
    padding: 0,
  },
  searchCancel: { color: T.primary, fontSize: 14, fontWeight: '600', marginLeft: 10 },

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

  deleteAction: {
    backgroundColor: T.danger,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteBtn: {
    backgroundColor: T.danger,
    width: 80,
    height: '100%' as any,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

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
  modalTitle: { color: T.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { color: T.subtext, fontSize: 13, marginBottom: 20 },
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
    fontFamily: 'monospace',
  },
  startButton: {
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  startButtonDisabled: { opacity: 0.5 },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelButtonText: { color: T.subtext, fontSize: 15 },

  // Tamizhi.AI assistant card
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#7c3aed30',
  },
  aiAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiCardText: { flex: 1, gap: 3 },
  aiCardName: { fontSize: 15, fontWeight: '700' },
  aiCardSub: { fontSize: 12, color: T.subtext },
  aiPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
