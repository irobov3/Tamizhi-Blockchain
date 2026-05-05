// Endpoints are configured via environment variables (.env / EAS secrets).
// For local dev create mobile-wallet/.env with EXPO_PUBLIC_* keys.

export const CONFIG = {
  CHAIN_ID: process.env.EXPO_PUBLIC_CHAIN_ID ?? 'tamizhi-1',
  CHAIN_REST_URL: process.env.EXPO_PUBLIC_CHAIN_LCD ?? 'http://localhost:1317',
  CHAIN_RPC_URL: process.env.EXPO_PUBLIC_CHAIN_RPC ?? 'http://localhost:26657',
  MAINNET_REST_URL:
    process.env.EXPO_PUBLIC_CHAIN_LCD_MAINNET ?? 'https://lcd.tamizhi.ai',
  MAINNET_RPC_URL:
    process.env.EXPO_PUBLIC_CHAIN_RPC_MAINNET ?? 'https://rpc.tamizhi.ai',
  DENOM: 'utmz',
  DISPLAY_DENOM: 'TMZ',
  DECIMALS: 6,
  BECH32_PREFIX: 'tamizhi',
  APP_NAME: 'Tamizhi Wallet',
  POLL_INTERVAL_MS: 10000,
  THEME: {
    primary: '#d4a017', // gold
    background: '#1a1040', // indigo
    surface: '#241758', // lighter indigo
    card: '#2d1d6e',
    text: '#fdf6e3', // cream
    subtext: '#a89cc4',
    accent: '#d4a017',
    danger: '#e63946',
    success: '#2ecc71',
    border: '#3a2a7e',
    inputBackground: '#120a30',
    indigo: '#1a1040',
    gold: '#d4a017',
    cream: '#fdf6e3',
  },
} as const;

export type Theme = typeof CONFIG.THEME;
