/**
 * Incoming Call Screen — Tamizhi Messenger
 *
 * Shown when someone calls you. Displays:
 * - Caller's avatar + Tamizhi ID
 * - Call type (audio/video)
 * - Accept (green) / Reject (red) buttons
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallStore } from '../../src/store/useCallStore';
import { useStore } from '../../src/store/useStore';
import { signalingClient } from '../../src/api/signaling';
import { webrtcManager } from '../../src/crypto/webrtc';
import { Avatar } from '../../src/components/Avatar';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;
const RING_PATTERN = [400, 200, 400, 800]; // vibration pattern ms

export default function IncomingCallScreen() {
  const router = useRouter();
  const { callInfo, setCallActive, setCallEnded, clearCall } = useCallStore();
  const { identity } = useStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const offerSdp = useRef<string>((callInfo as any)?._offerSdp ?? '');

  // Pulse animation for avatar ring
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    // Vibrate to alert user
    Vibration.vibrate(RING_PATTERN, true);

    return () => {
      pulse.stop();
      Vibration.cancel();
    };
  }, []);

  if (!callInfo || !identity) return null;

  const handleAccept = async () => {
    Vibration.cancel();
    try {
      await webrtcManager.acceptCall(
        identity.publicKey,
        callInfo.remotePubKey,
        callInfo.callType,
        offerSdp.current,
        {
          onRemoteStream: () => {},
          onCallEnded: () => {
            setCallEnded();
            router.replace('/(tabs)/chats');
          },
          onError: (err) => {
            console.error('[call] error:', err);
            setCallEnded();
            router.replace('/(tabs)/chats');
          },
        },
      );
      setCallActive();
      router.replace('/call/active');
    } catch (e: any) {
      console.error('[call] accept error:', e);
      signalingClient.send({
        type: 'call-reject',
        from: identity.publicKey,
        to: callInfo.remotePubKey,
      });
      clearCall();
      router.back();
    }
  };

  const handleReject = () => {
    Vibration.cancel();
    signalingClient.send({
      type: 'call-reject',
      from: identity.publicKey,
      to: callInfo.remotePubKey,
    });
    clearCall();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient overlay */}
      <View style={styles.bgGlow} />

      {/* Caller info */}
      <View style={styles.callerSection}>
        <Text style={styles.incomingLabel}>
          Incoming {callInfo.callType === 'video' ? 'Video' : 'Audio'} Call
        </Text>

        {/* Pulsing avatar */}
        <Animated.View
          style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}
        >
          <Avatar
            name={callInfo.remoteName}
            pubkey={callInfo.remotePubKey}
            size={96}
          />
        </Animated.View>

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
            Tamizhi {callInfo.callType === 'video' ? 'Video' : 'Voice'} Call
          </Text>
        </View>

        <Text style={styles.encryptedNote}>
          🔒 End-to-end encrypted · P2P via blockchain identity
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.buttons}>
        {/* Reject */}
        <View style={styles.btnWrapper}>
          <TouchableOpacity
            style={[styles.callBtn, styles.rejectBtn]}
            onPress={handleReject}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={32} color="#fff" style={styles.rejectIcon} />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Decline</Text>
        </View>

        {/* Accept */}
        <View style={styles.btnWrapper}>
          <TouchableOpacity
            style={[styles.callBtn, styles.acceptBtn]}
            onPress={handleAccept}
            activeOpacity={0.85}
          >
            <Ionicons
              name={callInfo.callType === 'video' ? 'videocam' : 'call'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.btnLabel}>Accept</Text>
        </View>
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: T.primary + '08',
  },

  callerSection: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 24,
  },
  incomingLabel: {
    color: T.subtext,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  avatarRing: {
    padding: 8,
    borderRadius: 68,
    borderWidth: 3,
    borderColor: T.primary + '60',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },

  callerName: {
    color: T.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
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
    fontWeight: '600',
  },

  encryptedNote: {
    color: T.subtext,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
    paddingHorizontal: 32,
  },

  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 64,
    paddingBottom: 16,
  },
  btnWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  callBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  rejectIcon: {
    transform: [{ rotate: '135deg' }],
  },
  btnLabel: {
    color: T.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
