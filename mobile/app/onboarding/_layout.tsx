import React from 'react';
import { Stack } from 'expo-router';
import { CONFIG } from '../../src/config';

const T = CONFIG.THEME;

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: T.background },
        headerTintColor: T.primary,
        headerTitleStyle: { fontWeight: '700', color: T.text },
        contentStyle: { backgroundColor: T.background },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="create-wallet"
        options={{ title: 'Create Account', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="import-wallet"
        options={{ title: 'Restore Account', headerBackTitle: 'Back' }}
      />
    </Stack>
  );
}
