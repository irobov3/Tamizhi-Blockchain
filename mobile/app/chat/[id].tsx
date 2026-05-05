import React, {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Clipboard,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';
import { useCallStore } from '../../src/store/useCallStore';
import { encryptMessage } from '../../src/crypto/session';
import { sendMessage } from '../../src/api/storage';
import { signalingClient } from '../../src/api/signaling';
import { webrtcManager } from '../../src/crypto/webrtc';
import { askAI, buildAIContext, offlineFallback, AI_ASSISTANT_ID, AI_ASSISTANT_NAME, AI_ASSISTANT_COLOR } from '../../src/api/ai';
import { impactLight, impactMedium, error as hapticError } from '../../src/utils/haptics';
import { CONFIG } from '../../src/config';
import { useConversationMessages } from '../../src/hooks/useMessages';
import { MessageBubble } from '../../src/components/MessageBubble';
import { Avatar } from '../../src/components/Avatar';
import { Message } from '../../src/store/useStore';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const T = CONFIG.THEME;
const POLL_INTERVAL = 8000;

function formatDateLabel(timestamp: number): string {
  const d = dayjs(timestamp);
  if (d.isToday()) return 'Today';
  if (d.isYesterday()) return 'Yesterday';
  return d.format('MMMM D, YYYY');
}

function DateSeparator({ timestamp }: { timestamp: number }) {
  return (
    <View style={styles.dateSep}>
      <View style={styles.dateLine} />
      <Text style={styles.dateSepText}>{formatDateLabel(timestamp)}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

function shouldShowDate(prev: Message | undefined, current: Message): boolean {
  if (!prev) return true;
  return !dayjs(current.timestamp).isSame(dayjs(prev.timestamp), 'day');
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const {
    identity,
    getConversation,
    addMessage,
    updateMessageStatus,
    markRead,
    setActiveConversation,
  } = useStore();
  const { setOutgoingCall, clearCall } = useCallStore();

  const conversation = getConversation(id);
  const messages = useConversationMessages(id);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect AI assistant conversation
  const isAIChat = id === AI_ASSISTANT_ID;

  // Mark conversation active + read
  useEffect(() => {
    setActiveConversation(id);
    markRead(id);
    return () => setActiveConversation(null);
  }, [id]);

  // Auto-refresh every 8s (UI-level, polling also happens in hook)
  useEffect(() => {
    pollRef.current = setInterval(() => {
      markRead(id);
    }, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Navigation header
  const peerName = isAIChat ? AI_ASSISTANT_NAME : (conversation?.name ?? (id.slice(0, 12) + '...'));
  const peerColor = isAIChat ? AI_ASSISTANT_COLOR : (conversation?.avatarColor ?? '#00b4d8');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          style={styles.headerTitle}
          onPress={() => {
            Alert.alert(
              peerName,
              `Tamizhi ID:\n${id}`,
              [
                {
                  text: 'Copy Tamizhi ID',
                  onPress: () => {
                    Clipboard.setString(id);
                    Alert.alert('Copied', 'Tamizhi ID copied to clipboard');
                  },
                },
                { text: 'Close', style: 'cancel' },
              ],
            );
          }}
          activeOpacity={0.7}
        >
          <Avatar name={peerName} pubkey={id} color={peerColor} size={34} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>
              {peerName}
            </Text>
            <View style={styles.headerEncryptedRow}>
              {isAIChat ? (
                <>
                  <Ionicons name="sparkles" size={10} color={AI_ASSISTANT_COLOR} />
                  <Text style={[styles.headerEncrypted, { color: AI_ASSISTANT_COLOR }]}> AI-powered · Tamizhi.AI</Text>
                </>
              ) : (
                <>
                  <Ionicons name="lock-closed" size={10} color={T.accent} />
                  <Text style={styles.headerEncrypted}> End-to-end encrypted</Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          {/* Call buttons only for human-to-human chats */}
          {!isAIChat && (
            <>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => handleStartCall('audio')}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={22} color={T.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => handleStartCall('video')}
                activeOpacity={0.7}
              >
                <Ionicons name="videocam-outline" size={23} color={T.text} />
              </TouchableOpacity>
            </>
          )}
          {/* Options menu */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() =>
              Alert.alert(
                'Chat Options',
                undefined,
                [
                  {
                    text: 'Copy Tamizhi ID',
                    onPress: () => {
                      Clipboard.setString(id);
                      Alert.alert('Copied', 'Tamizhi ID copied to clipboard');
                    },
                  },
                  {
                    text: 'Delete Conversation',
                    style: 'destructive',
                    onPress: () => {
                      useStore.getState().deleteConversation(id);
                      router.back();
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ],
              )
            }
          >
            <Ionicons name="ellipsis-vertical" size={20} color={T.text} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [conversation, id, navigation, peerName, peerColor]);

  const handleStartCall = useCallback(
    async (callType: 'audio' | 'video') => {
      if (!identity) return;

      // Check if signaling is available
      if (!signalingClient.isConnected) {
        Alert.alert(
          'Network Required',
          'Cannot start call — not connected to Tamizhi network. Check your connection.',
          [{ text: 'OK' }],
        );
        return;
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      setOutgoingCall({
        callId,
        remotePubKey: id,
        remoteName: peerName,
        callType,
        startedAt: Date.now(),
        isOutgoing: true,
      });

      try {
        await webrtcManager.startCall(
          identity.publicKey,
          id,
          callType,
          {
            onRemoteStream: (stream) => {
              (webrtcManager as any)._onRemoteStreamUpdate?.(stream);
            },
            onCallEnded: () => {
              clearCall();
            },
            onError: (err) => {
              console.error('[call] error:', err);
              Alert.alert('Call Error', err);
              clearCall();
            },
          },
        );
        router.push('/call/outgoing');
      } catch (e: any) {
        Alert.alert('Call Failed', e.message ?? 'Could not start call');
        clearCall();
      }
    },
    [identity, id, peerName, router, setOutgoingCall, clearCall],
  );

  const handleSend = useCallback(async () => {
    if (!identity || !inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');

    const msgId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const timestamp = Date.now();

    const storeMsg: Message = {
      id: msgId,
      _id: msgId,
      senderId: identity.publicKey,
      recipientId: id,
      text,
      timestamp,
      read: true,
      type: 'sent',
      status: 'sending',
      createdAt: new Date(timestamp),
      user: { _id: identity.publicKey, name: identity.displayName ?? 'You' },
    };

    addMessage(id, storeMsg);
    setIsSending(true);
    impactLight();

    // ── AI assistant branch ──────────────────────────────────────────────────
    if (isAIChat) {
      updateMessageStatus(id, msgId, 'sent');
      setIsSending(false);
      setIsAIThinking(true);
      try {
        const context = buildAIContext(messages.slice(-20).map((m) => ({ text: m.text, type: m.type })));
        const reply = await askAI(text, context);
        const aiMsgId = `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const aiMsg: Message = {
          id: aiMsgId,
          _id: aiMsgId,
          senderId: AI_ASSISTANT_ID,
          recipientId: identity.publicKey,
          text: reply.text,
          timestamp: Date.now(),
          read: true,
          type: 'received',
          status: 'delivered',
          createdAt: new Date(),
          user: { _id: AI_ASSISTANT_ID, name: AI_ASSISTANT_NAME },
        };
        addMessage(id, aiMsg);
      } catch (err) {
        const fallbackText = offlineFallback(err);
        const errMsgId = `ai_err_${Date.now()}`;
        addMessage(id, {
          id: errMsgId, _id: errMsgId,
          senderId: AI_ASSISTANT_ID, recipientId: identity.publicKey,
          text: fallbackText, timestamp: Date.now(), read: true,
          type: 'received', status: 'delivered', createdAt: new Date(),
          user: { _id: AI_ASSISTANT_ID, name: AI_ASSISTANT_NAME },
        });
      } finally {
        setIsAIThinking(false);
      }
      return;
    }

    // ── Normal encrypted message send ────────────────────────────────────────
    try {
      const { encrypted, nonce } = encryptMessage(text, id, identity.privateKey);
      await sendMessage({
        recipientPubKey: id,
        encryptedContent: encrypted,
        senderPubKey: identity.publicKey,
        nonce,
        type: 'direct',
        expiryDays: CONFIG.MESSAGE_TTL_DAYS,
        timestamp,
      });
      updateMessageStatus(id, msgId, 'sent');
      impactMedium();
    } catch (err) {
      console.error('Send failed:', err);
      updateMessageStatus(id, msgId, 'failed');
      hapticError();
      Alert.alert('Send Failed', 'Could not deliver the message. Check your connection.', [{ text: 'OK' }]);
    } finally {
      setIsSending(false);
    }
  }, [identity, id, inputText, isSending, isAIChat, messages, addMessage, updateMessageStatus]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    markRead(id);
    await new Promise((r) => setTimeout(r, 600));
    setIsRefreshing(false);
  }, [id, markRead]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const prev = messages[index - 1];
      return (
        <>
          {shouldShowDate(prev, item) && (
            <DateSeparator timestamp={item.timestamp} />
          )}
          <MessageBubble message={item} />
        </>
      );
    },
    [messages],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Banner: encryption or AI mode */}
      {isAIChat ? (
        <View style={[styles.encryptionBanner, { borderBottomColor: AI_ASSISTANT_COLOR + '40' }]}>
          <Ionicons name="sparkles" size={12} color={AI_ASSISTANT_COLOR} />
          <Text style={[styles.encryptionText, { color: AI_ASSISTANT_COLOR }]}>
            Tamizhi.AI — Ask me anything about the ecosystem
          </Text>
        </View>
      ) : (
        <View style={styles.encryptionBanner}>
          <Ionicons name="lock-closed" size={12} color={T.accent} />
          <Text style={styles.encryptionText}>Messages are encrypted end-to-end</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
            colors={[T.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Avatar name={peerName} pubkey={id} color={peerColor} size={72} />
            <Text style={styles.emptyChatName}>{peerName}</Text>
            {isAIChat ? (
              <Text style={styles.emptyChatHint}>
                👋 Hi! I'm Tamizhi.AI.{'\n'}Ask me about blockchain, crypto, privacy, coding, or anything else!
              </Text>
            ) : (
              <>
                <View style={styles.sessionChip}>
                  <Ionicons name="key-outline" size={12} color={T.subtext} />
                  <Text style={styles.sessionChipText}>{id.slice(0, 16)}...</Text>
                </View>
                <Text style={styles.emptyChatHint}>Send your first encrypted message</Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={
          isAIThinking ? (
            <View style={styles.aiTypingRow}>
              <View style={[styles.aiTypingBubble, { borderColor: AI_ASSISTANT_COLOR + '60' }]}>
                <View style={styles.aiTypingDots}>
                  <View style={[styles.aiDot, { backgroundColor: AI_ASSISTANT_COLOR }]} />
                  <View style={[styles.aiDot, { backgroundColor: AI_ASSISTANT_COLOR, opacity: 0.7 }]} />
                  <View style={[styles.aiDot, { backgroundColor: AI_ASSISTANT_COLOR, opacity: 0.4 }]} />
                </View>
                <Text style={[styles.aiTypingLabel, { color: AI_ASSISTANT_COLOR }]}>Tamizhi.AI is thinking…</Text>
              </View>
            </View>
          ) : null
        }
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Input toolbar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.inputToolbar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isAIChat ? 'Ask Tamizhi.AI anything…' : 'Encrypted message...'}
            placeholderTextColor={T.subtext}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              isAIChat && { backgroundColor: AI_ASSISTANT_COLOR },
              (!inputText.trim() || isSending || isAIThinking) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending || isAIThinking}
            activeOpacity={0.85}
          >
            {isSending || isAIThinking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={isAIChat ? 'sparkles' : 'send'} size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },

  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 200,
  },
  headerTextWrap: { flex: 1 },
  headerName: { color: T.text, fontSize: 16, fontWeight: '700' },
  headerEncryptedRow: { flexDirection: 'row', alignItems: 'center' },
  headerEncrypted: { color: T.accent, fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginRight: 4 },
  headerBtn: { padding: 6 },
  pubkeyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.primary + '20',
    borderWidth: 1,
    borderColor: T.primary + '50',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pubkeyChipText: { color: T.primary, fontSize: 11, fontFamily: 'monospace', fontWeight: '600' },

  encryptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.accent + '15',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.accent + '30',
  },
  encryptionText: { color: T.accent, fontSize: 11, opacity: 0.85 },

  messagesList: {
    paddingVertical: 8,
    flexGrow: 1,
  },

  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.border },
  dateSepText: { color: T.subtext, fontSize: 11, fontWeight: '600' },

  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyChatName: { color: T.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: T.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },
  sessionChipText: { color: T.subtext, fontSize: 12, fontFamily: 'monospace' },
  emptyChatHint: { color: T.subtext, fontSize: 14, textAlign: 'center', marginTop: 4, lineHeight: 22 },

  // AI typing indicator
  aiTypingRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  aiTypingBubble: {
    backgroundColor: '#1a0a2e',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 200,
  },
  aiTypingDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  aiDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  aiTypingLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  inputToolbar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: T.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: T.inputBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.border,
    color: T.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 130,
    lineHeight: 21,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: { backgroundColor: T.subtext + '80' },
});
