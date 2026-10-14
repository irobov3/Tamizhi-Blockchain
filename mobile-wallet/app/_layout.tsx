/**
 * app/_layout.tsx
 * Root layout — checks for stored mnemonic on boot and routes accordingly.
 * Uses lib/keystore.hasMnemonic() and lib/store for state.
 */

import '../src/polyfills';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hasMnemonic } from '../lib/keystore';
import { useWalletStore } from '../lib/store';

const INDIGO = '#1a1040';
const GOLD = '#d4a017';
const CREAM = '#fdf6e3';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [walletExists, setWalletExists] = useState(false);
  const store = useWalletStore();
  const router = useRouter();
  const segments = useSegments();

  // On mount: check if a wallet mnemonic exists in secure storage
  useEffect(() => {
    (async () => {
      try {
        const has = await hasMnemonic();
        setWalletExists(has);
      } catch (err) {
        console.warn('[layout] hasMnemonic check failed:', err);
      } finally {
        setIsChecking(false);
      }
    })();
  }, []);

  // Route guard — run after boot check completes
  useEffect(() => {
    if (isChecking) return;

    const top = segments[0] as string | undefined;
    const inOnboarding = top === 'onboarding';
    const inTabs = top === '(tabs)';

    if (!walletExists && !inOnboarding) {
      // No wallet stored — send to onboarding
      router.replace('/onboarding');
    } else if (walletExists && store.isUnlocked && !inTabs) {
      // Wallet exists and is unlocked — go to main app
      router.replace('/(tabs)');
    }
    // If wallet exists but locked — the dashboard handles the PIN unlock
  }, [isChecking, walletExists, store.isUnlocked, segments]);

  if (isChecking) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>தமிழி</Text>
        <Text style={styles.splashSubtitle}>WALLET</Text>
        <ActivityIndicator size="small" color={GOLD} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={INDIGO} />
        <AppInitializer>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: INDIGO },
              headerTintColor: CREAM,
              headerTitleStyle: { fontWeight: '700', color: CREAM },
              contentStyle: { backgroundColor: INDIGO },
              headerShadowVisible: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false, animation: 'fade' }}
            />
          </Stack>
        </AppInitializer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INDIGO,
  },
  splashTitle: {
    color: GOLD,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 2,
  },
  splashSubtitle: {
    color: CREAM,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 8,
    marginTop: 4,
  },
});
