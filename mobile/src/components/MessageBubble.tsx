import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { CONFIG } from '../config';
import { Message } from '../store/useStore';

const T = CONFIG.THEME;

interface MessageBubbleProps {
  message: Message;
}

function statusIcon(status: Message['status']): React.ReactNode {
  if (status === 'sending') {
    return <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />;
  }
  if (status === 'sent') {
    return <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.6)" />;
  }
  if (status === 'delivered') {
    return <Ionicons name="checkmark-done" size={12} color={T.accent} />;
  }
  if (status === 'failed') {
    return <Ionicons name="alert-circle" size={12} color={T.danger} />;
  }
  return null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isSent = message.type === 'sent';
  const time = dayjs(message.timestamp).format('HH:mm');

  return (
    <View style={[styles.row, isSent ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isSent ? styles.bubbleSent : styles.bubbleReceived,
        ]}
      >
        <Text style={[styles.text, isSent ? styles.textSent : styles.textReceived]}>
          {message.text}
        </Text>

        <View style={styles.meta}>
          <Text style={[styles.time, isSent ? styles.timeSent : styles.timeReceived]}>
            {time}
          </Text>
          {isSent && (
            <View style={styles.status}>
              {statusIcon(message.status)}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    flexDirection: 'row',
  },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleSent: {
    backgroundColor: T.messageSentBubble,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: T.messageReceivedBubble,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.border,
  },

  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  textSent: { color: '#ffffff' },
  textReceived: { color: T.text },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: { fontSize: 11 },
  timeSent: { color: 'rgba(255,255,255,0.55)' },
  timeReceived: { color: T.subtext },
  status: { marginLeft: 2 },
});
