import { create } from 'zustand';
import { LazyStore } from '@tauri-apps/plugin-store';

export type Provider = 'anthropic' | 'openai' | 'ollama';
export type Theme = 'dark' | 'light';

interface SettingsState {
  apiKey: string;
  provider: Provider;
  model: string;
  tamilMode: boolean;
  theme: Theme;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Omit<SettingsState, 'load' | 'update' | 'loaded'>>) => void;
}

const STORE_FILE = 'settings.json';
const KEY = 'settings';

let _store: LazyStore | null = null;
function store(): LazyStore {
  if (!_store) _store = new LazyStore(STORE_FILE);
  return _store;
}

const DEFAULTS = {
  apiKey: '',
  provider: 'anthropic' as Provider,
  model: 'claude-sonnet-4-5',
  tamilMode: false,
  theme: 'dark' as Theme,
};

async function persist(state: SettingsState) {
  try {
    const s = store();
    await s.set(KEY, {
      apiKey: state.apiKey,
      provider: state.provider,
      model: state.model,
      tamilMode: state.tamilMode,
      theme: state.theme,
    });
    await s.save();
  } catch (err) {
    console.warn('persist settings failed', err);
  }
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  load: async () => {
    try {
      const s = store();
      const v = (await s.get(KEY)) as Partial<typeof DEFAULTS> | null;
      if (v) {
        set({ ...DEFAULTS, ...v, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  update: (patch) => {
    set((s) => ({ ...s, ...patch }));
    void persist(get());
  },
}));
