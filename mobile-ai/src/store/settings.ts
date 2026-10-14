// Settings: provider, API keys, voice locale.

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../config';

export type Provider = 'anthropic' | 'openai' | 'ollama';

interface SettingsState {
  provider: Provider;
  anthropicKey: string;
  openaiKey: string;
  ollamaUrl: string;
  voiceLocale: string;       // e.g. 'ta-IN' or 'en-US'
  uiLanguage: 'ta' | 'en';
  speakResponses: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: (patch: Partial<SettingsState>) => void;
}

const KEYS = {
  provider: 'tamizhi_ai_provider',
  anthropic: 'tamizhi_ai_anthropic_key',
  openai: 'tamizhi_ai_openai_key',
  ollama: 'tamizhi_ai_ollama_url',
  voice: 'tamizhi_ai_voice_locale',
  ui: 'tamizhi_ai_ui_lang',
  speak: 'tamizhi_ai_speak',
};

export const useSettings = create<SettingsState>((setState, get) => ({
  provider: 'anthropic',
  anthropicKey: CONFIG.ANTHROPIC_API_KEY,
  openaiKey: '',
  ollamaUrl: 'http://localhost:11434',
  voiceLocale: 'ta-IN',
  uiLanguage: 'ta',
  speakResponses: false,
  hydrated: false,

  hydrate: async () => {
    const [p, a, o, ou, v, ui, sp] = await Promise.all([
      SecureStore.getItemAsync(KEYS.provider),
      SecureStore.getItemAsync(KEYS.anthropic),
      SecureStore.getItemAsync(KEYS.openai),
      SecureStore.getItemAsync(KEYS.ollama),
      SecureStore.getItemAsync(KEYS.voice),
      SecureStore.getItemAsync(KEYS.ui),
      SecureStore.getItemAsync(KEYS.speak),
    ]);
    setState({
      provider: (p as Provider) ?? 'anthropic',
      anthropicKey: a ?? CONFIG.ANTHROPIC_API_KEY,
      openaiKey: o ?? '',
      ollamaUrl: ou ?? 'http://localhost:11434',
      voiceLocale: v ?? 'ta-IN',
      uiLanguage: ((ui as 'ta' | 'en') ?? 'ta'),
      speakResponses: sp === '1',
      hydrated: true,
    });
  },

  set: (patch) => {
    const next = { ...get(), ...patch };
    setState(patch);
    // Persist relevant fields.
    if (patch.provider) SecureStore.setItemAsync(KEYS.provider, patch.provider);
    if (patch.anthropicKey !== undefined) SecureStore.setItemAsync(KEYS.anthropic, patch.anthropicKey);
    if (patch.openaiKey !== undefined) SecureStore.setItemAsync(KEYS.openai, patch.openaiKey);
    if (patch.ollamaUrl !== undefined) SecureStore.setItemAsync(KEYS.ollama, patch.ollamaUrl);
    if (patch.voiceLocale) SecureStore.setItemAsync(KEYS.voice, patch.voiceLocale);
    if (patch.uiLanguage) SecureStore.setItemAsync(KEYS.ui, patch.uiLanguage);
    if (patch.speakResponses !== undefined)
      SecureStore.setItemAsync(KEYS.speak, patch.speakResponses ? '1' : '0');
  },
}));
