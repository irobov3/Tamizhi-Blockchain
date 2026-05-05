// Endpoints are configured via environment variables (.env / EAS secrets).
// For local dev create mobile/.env with EXPO_PUBLIC_* keys.
// See mobile/.env.example for all available variables.

export const CONFIG = {
  CHAIN_ID: process.env.EXPO_PUBLIC_CHAIN_ID ?? 'tamizhi-1',
  CHAIN_REST_URL: process.env.EXPO_PUBLIC_CHAIN_LCD ?? 'http://localhost:1317',
  STORAGE_SERVER_URL: process.env.EXPO_PUBLIC_STORAGE_URL ?? 'http://localhost:8100',
  ROUTER_NODE_URL: process.env.EXPO_PUBLIC_ROUTER_URL ?? 'http://localhost:8101',
  DENOM: 'utmz',
  DISPLAY_DENOM: 'TMZ',
  DECIMALS: 6,
  MESSAGE_TTL_DAYS: 14,
  APP_NAME: 'Tamizhi Messenger',
  POLL_INTERVAL_MS: 10000,
  THEME: {
    primary: '#00b4d8',
    background: '#0d0d1a',
    surface: '#1a1a2e',
    card: '#16213e',
    text: '#e0e0e0',
    subtext: '#888888',
    accent: '#00f5d4',
    danger: '#ff4444',
    success: '#00c851',
    border: '#2a2a4a',
    inputBackground: '#0a0a1a',
    messageSent: '#00b4d820',
    messageReceived: '#1a1a2e',
    messageSentBubble: '#005f73',
    messageReceivedBubble: '#1a1a2e',
  },
} as const;

export type Theme = typeof CONFIG.THEME;
