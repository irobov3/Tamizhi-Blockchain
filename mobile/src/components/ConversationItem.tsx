import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CONFIG } from '../config';
import { Conversation } from '../store/useStore';

dayjs.extend(relativeTime);

interface Props {
  conversation: Conversation;
  onPress: () => void;
  onLongPress?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

function formatTimestamp(ts: number): string {
  const now = dayjs();
  const msg = dayjs(ts);
  if (now.diff(msg, 'day') === 0) return msg.format('HH:mm');
  if (now.diff(msg, 'day') === 1) return 'Yesterday';
  if (now.diff(msg, 'day') < 7) return msg.format('ddd');
  return msg.format('DD/MM/YY');
}

export const ConversationItem: React.FC<Props> = ({
  conversation,
  onPress,
  onLongPress,
}) => {
  const { name, lastMessage, unreadCount, avatarColor, type } = conversation;
  const initials = getInitials(name);
  const hasUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials || '?'}</Text>
        {type === 'group' && (
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>G</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.row}>
          <Text
            style={[styles.name, hasUnread && styles.nameUnread]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {lastMessage && (
            <Text
              style={[
                styles.timestamp,
                hasUnread && styles.timestampUnread,
              ]}
            >
              {formatTimestamp(lastMessage.timestamp)}
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <Text
            style={[
              styles.preview,
              hasUnread && styles.previewUnread,
            ]}
            numberOfLines={1}
          >
            {lastMessage
              ? lastMessage.type === 'sent'
                ? `You: ${lastMessage.text}`
                : lastMessage.text
              : 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Encryption indicator */}
      <View style={styles.lockIcon}>
        <Text style={styles.lockText}>🔒</Text>
      </View>
    </TouchableOpacity>
  );
};

const T = CONFIG.THEME;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: T.accent,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: T.background,
  },
  groupBadgeText: {
    color: T.background,
    fontSize: 8,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  name: {
    color: T.text,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontWeight: '700',
    color: '#ffffff',
  },
  timestamp: {
    color: T.subtext,
    fontSize: 12,
  },
  timestampUnread: {
    color: T.primary,
    fontWeight: '600',
  },
  preview: {
    color: T.subtext,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  previewUnread: {
    color: T.text,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: T.primary,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  lockIcon: {
    marginLeft: 8,
    opacity: 0.4,
  },
  lockText: {
    fontSize: 10,
  },
});
