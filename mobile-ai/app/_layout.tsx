import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useConversations } from '../src/store/conversations';
import { useSettings } from '../src/store/settings';
import { CONFIG } from '../src/config';

const T = CONFIG.THEME;

export default function RootLayout() {
  const hydrate = useConversations((s) => s.hydrate);
  const hydrateSettings = useSettings((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateSettings();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={T.background} />
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
            name="conversation/[id]"
            options={{ title: 'Conversation', headerBackTitle: 'Back' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
