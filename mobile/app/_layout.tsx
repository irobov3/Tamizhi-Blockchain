import '../src/polyfills';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image, Alert } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { getStoredIdentity } from '../src/crypto/session';
import { signalingClient, SignalMessage } from '../src/api/signaling';
import { useCallStore } from '../src/store/useCallStore';
import { CONFIG } from '../src/config';
import { useMessagePoller } from '../src/hooks/useMessages';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { notify } from '../src/utils/haptics';
import { setUser, addBreadcrumb } from '../src/utils/telemetry';

const T = CONFIG.THEME;

// ─── Auth guard component ─────────────────────────────────────────────────

function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [dotCount, setDotCount] = useState(0);
  const { setIdentity, setOnboarded, identity } = useStore();
  const { setIncomingCall, callState } = useCallStore();
  const router = useRouter();
  const segments = useSegments();

  // Start message polling when identity is available
  useMessagePoller();

  // Connect signaling and listen for incoming calls
  useEffect(() => {
    if (!identity) return;

    // Connect WebSocket signaling
    signalingClient.connect(identity.publicKey);

    // Handle incoming call offer
    const handleOffer = (msg: SignalMessage) => {
      if (callState !== 'idle') {
        // Already in a call — send busy signal
        signalingClient.send({
          type: 'call-busy',
          from: identity.publicKey,
          to: msg.from,
        });
        return;
      }

      const callType = msg.data?.callType ?? 'audio';
      const remoteName = msg.from.slice(0, 12) + '...';

      // Store offer SDP so incoming.tsx can use it
      const callInfo: any = {
        callId: `incoming_${Date.now()}`,
        remotePubKey: msg.from,
        remoteName,
        callType,
        startedAt: Date.now(),
        isOutgoing: false,
        _offerSdp: msg.data?.sdp ?? '',
      };

      setIncomingCall(callInfo);
      notify();
      addBreadcrumb({ category: 'call', message: `incoming ${callType}`, level: 'info' });
      router.push('/call/incoming');
    };

    // Handle ICE candidates for active call setup
    const handleIce = async (msg: SignalMessage) => {
      const { webrtcManager } = await import('../src/crypto/webrtc');
      await webrtcManager.handleIceCandidate(msg.data);
    };

    // Handle call ended by remote
    const handleCallEnd = (msg: SignalMessage) => {
      const { clearCall } = useCallStore.getState();
      clearCall();
    };

    signalingClient.on('call-offer', handleOffer);
    signalingClient.on('ice-candidate', handleIce);
    signalingClient.on('call-end', handleCallEnd);

    return () => {
      signalingClient.off('call-offer', handleOffer);
      signalingClient.off('ice-candidate', handleIce);
      signalingClient.off('call-end', handleCallEnd);
    };
  }, [identity?.publicKey, callState]);

  // Animated loading dots
  useEffect(() => {
    if (!isChecking) return;
    const t = setInterval(() => setDotCount((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, [isChecking]);

  // Load stored identity on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await getStoredIdentity();
        if (stored) {
          setIdentity(stored);
          setOnboarded(true);
          setUser({ id: stored.publicKey.slice(0, 8), pubKey: stored.publicKey });
          addBreadcrumb({ category: 'auth', message: 'identity restored', level: 'info' });
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setIsChecking(false);
      }
    })();
  }, []);

  // Route guard: once check is done, redirect accordingly
  useEffect(() => {
    if (isChecking) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    if (!identity && !inOnboarding) {
      router.replace('/onboarding');
    } else if (identity && !inTabs && !segments[0]?.startsWith('chat')) {
      router.replace('/(tabs)/chats');
    }
  }, [isChecking, identity, segments]);

  if (isChecking) {
    return (
      <View style={styles.splash}>
        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          style={styles.splashLogo}
          resizeMode="cover"
        />
        <Text style={styles.splashTitle}>TAMIZHI</Text>
        <Text style={styles.splashTagline}>WEB3 · AI · ECOSYSTEM</Text>
        <View style={styles.splashLoader}>
          <ActivityIndicator size="small" color={T.primary} />
          <Text style={styles.splashLoading}>
            {'Loading' + '.'.repeat(dotCount)}
          </Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

// ─── Root layout ──────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={T.background} />
        <ErrorBoundary>
        <OfflineBanner />
        <AppInitializer>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: T.surface },
              headerTintColor: T.text,
              headerTitleStyle: { fontWeight: '700', color: T.text },
              contentStyle: { backgroundColor: T.background },
              headerShadowVisible: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false, animation: 'fade' }}
            />
            <Stack.Screen
              name="chat/[id]"
              options={{
                headerStyle: { backgroundColor: T.surface },
                headerBackTitle: 'Chats',
              }}
            />
            <Stack.Screen
              name="call/incoming"
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen
              name="call/outgoing"
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen
              name="call/active"
              options={{
                headerShown: false,
                animation: 'fade',
                presentation: 'fullScreenModal',
              }}
            />
          </Stack>
        </AppInitializer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.background,
    gap: 12,
  },
  splashLogo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    marginBottom: 12,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
  splashTitle: { color: '#FFB800', fontSize: 26, fontWeight: '900', letterSpacing: 3 },
  splashTagline: { color: '#00f0ff', fontSize: 11, letterSpacing: 2, fontWeight: '600' },
  splashLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  splashLoading: { color: T.subtext, fontSize: 13, width: 90 },
});
