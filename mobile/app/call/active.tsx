/**
 * Active Call Screen — Tamizhi Messenger
 *
 * Shown while a call is connected. Features:
 * - Live video streams (local + remote) for video calls
 * - Call duration timer
 * - Controls: Mute, Speaker, Camera flip, Video toggle, End call
 * - Blockchain identity verified badge
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { useCallStore } from '../../src/store/useCallStore';
import { webrtcManager } from '../../src/crypto/webrtc';
import { Avatar } from '../../src/components/Avatar';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ActiveCallScreen() {
  const router = useRouter();
  const { callInfo, setCallEnded, clearCall } = useCallStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(callInfo?.callType === 'video');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [localStream, setLocalStream] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start duration timer
  useEffect(() => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Set up WebRTC callbacks for stream updates
  useEffect(() => {
    // Get local stream preview
    const local = webrtcManager.local;
    if (local) setLocalStream(local);

    // The remote stream is passed via webrtcManager callbacks set in startCall/acceptCall
    // We listen via a module-level event emitter pattern
    (webrtcManager as any)._onRemoteStreamUpdate = (stream: any) => {
      setRemoteStream(stream);
    };

    return () => {
      (webrtcManager as any)._onRemoteStreamUpdate = null;
    };
  }, []);

  const handleEndCall = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    webrtcManager.endCall();
    setCallEnded();
    setTimeout(() => {
      clearCall();
      router.replace('/(tabs)/chats');
    }, 300);
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    webrtcManager.toggleMute(next);
  }, [isMuted]);

  const handleToggleVideo = useCallback(() => {
    const next = !isCameraOn;
    setIsCameraOn(next);
    webrtcManager.toggleVideo(next);
  }, [isCameraOn]);

  const handleSwitchCamera = useCallback(async () => {
    setIsFrontCamera((f) => !f);
    await webrtcManager.switchCamera();
  }, []);

  if (!callInfo) return null;

  const isVideo = callInfo.callType === 'video';

  return (
    <View style={styles.container}>
      {/* ── Video layer (video calls only) ── */}
      {isVideo && (
        <>
          {/* Remote video — full screen background */}
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
              mirror={false}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.waitingBg]}>
              <Avatar name={callInfo.remoteName} pubkey={callInfo.remotePubKey} size={80} />
              <Text style={styles.waitingText}>Connecting video…</Text>
            </View>
          )}

          {/* Local video — picture-in-picture corner */}
          {localStream && isCameraOn && (
            <TouchableOpacity
              style={styles.localVideo}
              onPress={handleSwitchCamera}
              activeOpacity={0.9}
            >
              <RTCView
                streamURL={localStream.toURL()}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
                mirror={isFrontCamera}
              />
              <View style={styles.localVideoOverlay}>
                <Ionicons name="camera-reverse" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── Audio call background ── */}
      {!isVideo && (
        <View style={styles.audioBg}>
          <View style={styles.audioGlow} />
          <Avatar
            name={callInfo.remoteName}
            pubkey={callInfo.remotePubKey}
            size={120}
          />
          <Text style={styles.audioCallerName}>{callInfo.remoteName}</Text>
          <View style={styles.idChip}>
            <Ionicons name="shield-checkmark" size={12} color={T.primary} />
            <Text style={styles.idText}>{callInfo.remotePubKey.slice(0, 16)}…</Text>
          </View>
        </View>
      )}

      {/* ── Overlay UI ── */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#22c55e" />
            <Text style={styles.verifiedText}>Tamizhi Verified Identity</Text>
          </View>
          <Text style={styles.timer}>{formatDuration(duration)}</Text>
          <Text style={styles.callTypeLabel}>
            {isVideo ? '📹 Video' : '🔊 Voice'} Call
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          {/* Mute */}
          <ControlButton
            icon={isMuted ? 'mic-off' : 'mic'}
            label={isMuted ? 'Unmute' : 'Mute'}
            active={isMuted}
            onPress={handleToggleMute}
          />

          {/* Speaker */}
          <ControlButton
            icon={isSpeaker ? 'volume-high' : 'volume-mute'}
            label="Speaker"
            active={isSpeaker}
            onPress={() => setIsSpeaker((s) => !s)}
          />

          {/* Video toggle (video calls only) */}
          {isVideo && (
            <ControlButton
              icon={isCameraOn ? 'videocam' : 'videocam-off'}
              label={isCameraOn ? 'Hide Cam' : 'Show Cam'}
              active={!isCameraOn}
              onPress={handleToggleVideo}
            />
          )}

          {/* Camera flip (video only, camera on) */}
          {isVideo && isCameraOn && (
            <ControlButton
              icon="camera-reverse"
              label="Flip"
              active={false}
              onPress={handleSwitchCamera}
            />
          )}

          {/* End call */}
          <TouchableOpacity
            style={styles.endCallBtn}
            onPress={handleEndCall}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={30} color="#fff" style={styles.endCallIcon} />
          </TouchableOpacity>
        </View>

        {/* Encryption note */}
        <Text style={styles.encryptedNote}>🔒 P2P encrypted · No server relay</Text>
      </SafeAreaView>
    </View>
  );
}

// ── Control Button Component ──────────────────────────────────────────────

interface ControlButtonProps {
  icon: any;
  label: string;
  active: boolean;
  onPress: () => void;
}

function ControlButton({ icon, label, active, onPress }: ControlButtonProps) {
  return (
    <TouchableOpacity style={styles.ctrlBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.ctrlBtnInner, active && styles.ctrlBtnActive]}>
        <Ionicons name={icon} size={24} color={active ? T.background : T.text} />
      </View>
      <Text style={styles.ctrlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050a14' },

  // Audio call styles
  audioBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  audioGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: T.primary + '12',
    top: SCREEN_H / 2 - 200,
    alignSelf: 'center',
  },
  audioCallerName: {
    color: T.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
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

  // Video call styles
  waitingBg: {
    backgroundColor: '#050a14',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  waitingText: {
    color: T.subtext,
    fontSize: 16,
    marginTop: 12,
  },

  localVideo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    right: 16,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: T.primary + '60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  localVideoOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 4,
  },

  // Overlay
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: 'transparent',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  verifiedText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  timer: {
    color: T.text,
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  callTypeLabel: {
    color: T.subtext,
    fontSize: 14,
    fontWeight: '600',
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  ctrlBtn: {
    alignItems: 'center',
    gap: 8,
  },
  ctrlBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ctrlBtnActive: {
    backgroundColor: T.text,
  },
  ctrlLabel: {
    color: T.subtext,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    marginLeft: 8,
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },

  encryptedNote: {
    color: T.subtext,
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.6,
  },
});
