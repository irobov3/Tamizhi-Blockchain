import '../src/polyfills';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CONFIG } from '../src/config';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

const T = CONFIG.THEME;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={T.background} />
        <ErrorBoundary>
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
              name="browser/index"
              options={{ headerShown: false, animation: 'fade' }}
            />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
