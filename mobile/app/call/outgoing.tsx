/**
 * Outgoing Call Screen — Tamizhi Messenger
 *
 * Shown on the caller's side while waiting for the recipient to pick up.
 * Listens for: call-answer (→ go to active), call-reject / peer-offline (→ back).
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '../../src/store/useCallStore';
import { useStore } from '../../src/store/useStore';
import { signalingClient, SignalMessage } from '../../src/api/signaling';
import { webrtcManager } from '../../src/crypto/webrtc';
import { Avatar } from '../../src/components/Avatar';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;

export default function OutgoingCallScreen() {
  const router = useRouter();
  const { callInfo, setCallActive, clearCall } = useCallStore();
  const { identity } = useStore();
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Animated "calling..." dots
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(dotAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Listen for signaling responses
  useEffect(() => {
    if (!callInfo || !identity) return;

    const handleAnswer = async (msg: SignalMessage) => {
      if (msg.from !== callInfo.remotePubKey) return;
      try {
        await webrtcManager.handleAnswer(msg.data?.sdp);
        setCallActive();
        router.replace('/call/active');
      } catch (e) {
        console.error('[outgoing] handleAnswer error:', e);
      }
    };

    const handleReject = (msg: SignalMessage) => {
      if (msg.from !== callInfo.remotePubKey) return;
      clearCall();
      router.back();
    };

    const handleOffline = (msg: SignalMessage) => {
      if (msg.to !== identity.publicKey) return;
      clearCall();
      router.back();
    };

    const handleIce = async (msg: SignalMessage) => {
      if (msg.from !== callInfo.remotePubKey) return;
      await webrtcManager.handleIceCandidate(msg.data);
    };

    signalingClient.on('call-answer', handleAnswer);
    signalingClient.on('call-reject', handleReject);
    signalingClient.on('call-busy', handleReject);
    signalingClient.on('peer-offline', handleOffline);
    signalingClient.on('ice-candidate', handleIce);
    signalingClient.on('call-end', handleReject);

    // Auto-cancel after 45 seconds if no answer
    const timeout = setTimeout(() => {
      handleCancel();
    }, 45000);

    return () => {
      signalingClient.off('call-answer', handleAnswer);
      signalingClient.off('call-reject', handleReject);
      signalingClient.off('call-busy', handleReject);
      signalingClient.off('peer-offline', handleOffline);
      signalingClient.off('ice-candidate', handleIce);
      signalingClient.off('call-end', handleReject);
      clearTimeout(timeout);
    };
  }, [callInfo, identity]);

  const handleCancel = () => {
    if (callInfo && identity) {
      signalingClient.send({
        type: 'call-end',
        from: identity.publicKey,
        to: callInfo.remotePubKey,
      });
    }
    webrtcManager.endCall();
    clearCall();
    router.back();
  };

  if (!callInfo) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgGlow} />

      <View style={styles.content}>
        <Text style={styles.callingLabel}>
          Calling via Tamizhi Network…
        </Text>

        {/* Animated avatar rings */}
        <View style={styles.avatarContainer}>
          <View style={styles.ring3} />
          <View style={styles.ring2} />
          <View style={styles.ring1} />
          <Avatar name={callInfo.remoteName} pubkey={callInfo.remotePubKey} size={96} />
        </View>

        <Text style={styles.callerName}>{callInfo.remoteName}</Text>

        <View style={styles.idChip}>
          <Ionicons name="shield-checkmark" size={12} color={T.primary} />
          <Text style={styles.idText}>{callInfo.remotePubKey.slice(0, 16)}…</Text>
        </View>

        <View style={styles.callTypeBadge}>
          <Ionicons
            name={callInfo.callType === 'video' ? 'videocam' : 'call'}
            size={14}
            color={T.accent}
          />
          <Text style={styles.callTypeText}>
            {callInfo.callType === 'video' ? 'Video' : 'Voice'} Call · End-to-end encrypted
          </Text>
        </View>
      </View>

      {/* Cancel button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          activeOpacity={0.85}
        >
          <Ionicons name="call" size={32} color="#fff" style={styles.cancelIcon} />
        </TouchableOpacity>
        <Text style={styles.cancelLabel}>Cancel</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 48,
  },
  bgGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: T.primary + '06',
  },
  content: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 32,
  },
  callingLabel: {
    color: T.subtext,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 16,
  },

  avatarContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: T.primary + '50',
    opacity: 0.7,
  },
  ring2: {
    position: 'absolute',
    width: 155,
    height: 155,
    borderRadius: 77,
    borderWidth: 1.5,
    borderColor: T.primary + '30',
    opacity: 0.5,
  },
  ring3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: T.primary + '18',
    opacity: 0.3,
  },

  callerName: {
    color: T.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.primary + '18',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: T.primary + '40',
  },
  idText: {
    color: T.primary,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  callTypeText: {
    color: T.accent,
    fontSize: 13,
    fontWeight: '500',
  },

  footer: {
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cancelIcon: {
    transform: [{ rotate: '135deg' }],
  },
  cancelLabel: {
    color: T.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
