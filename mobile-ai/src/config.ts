// Tamizhi AI configuration. Endpoints from EAS / .env via EXPO_PUBLIC_*.

export const CONFIG = {
  CHAIN_ID: process.env.EXPO_PUBLIC_CHAIN_ID ?? 'tamizhi-1',
  CHAIN_REST_URL: process.env.EXPO_PUBLIC_CHAIN_LCD ?? 'http://localhost:1317',
  ANTHROPIC_API_KEY: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  DENOM: 'utmz',
  DISPLAY_DENOM: 'TMZ',
  DECIMALS: 6,
  APP_NAME: 'Tamizhi AI',
  DEFAULT_MODEL: 'claude-sonnet-4-5',
  THEME: {
    primary: '#6E07F3',           // AI purple
    primaryDeep: '#4a04a8',
    background: '#0d0820',         // near-black indigo
    surface: '#1a1040',            // deep indigo
    card: '#241654',
    text: '#ECE6FF',
    subtext: '#A99FD6',
    accent: '#9B7DFA',
    danger: '#ff4d6d',
    success: '#22c55e',
    border: '#2e1f6b',
    inputBackground: '#150a35',
    bubbleUser: '#6E07F3',
    bubbleAI: '#1a1040',
  },
  TAMIL_SYSTEM_PROMPT:
    'You are Tamizhi AI, an assistant fluent in Tamil and English. Respect Tamil cultural context. ' +
    'When asked about Tamil literature, cite specific works (Thirukkural, Silappathikaram, Sangam anthologies) ' +
    'accurately and quote source couplets where relevant. Reply in the language the user uses; if mixed, ' +
    'reply in Tamil with brief English glosses for technical terms. Be concise and structured.',
} as const;

export type Theme = typeof CONFIG.THEME;
