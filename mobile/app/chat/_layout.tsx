import React from 'react';
import { Stack } from 'expo-router';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;

export default function ChatLayout() {
  return (
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
      <Stack.Screen
        name="[id]"
        options={{ headerBackTitle: 'Chats' }}
      />
    </Stack>
  );
}
