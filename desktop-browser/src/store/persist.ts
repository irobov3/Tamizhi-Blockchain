// Lightweight persistence wrapper. Uses Tauri Store plugin if available,
// otherwise falls back to localStorage so the app also works in `npm run dev`
// (without `tauri dev`).

type StoreLike = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
};

let cached: StoreLike | null = null;

async function getStore(): Promise<StoreLike> {
  if (cached) return cached;
  try {
    const mod = await import("@tauri-apps/plugin-store");
    // Plugin v2 exposes `Store.load`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const StoreCtor: any = (mod as any).Store ?? (mod as any).default;
    if (StoreCtor && typeof StoreCtor.load === "function") {
      const store = await StoreCtor.load("tamizhi-browser.dat");
      cached = store as StoreLike;
      return cached;
    }
  } catch {
    // fall through to localStorage
  }
  cached = {
    async get<T>(key: string): Promise<T | null> {
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      try { return JSON.parse(raw) as T; } catch { return null; }
    },
    async set(key: string, value: unknown) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    async save() { /* localStorage is synchronous */ },
  };
  return cached;
}

export async function loadKey<T>(key: string, fallback: T): Promise<T> {
  const s = await getStore();
  const v = await s.get<T>(key);
  return v ?? fallback;
}

export async function saveKey(key: string, value: unknown): Promise<void> {
  const s = await getStore();
  await s.set(key, value);
  await s.save();
}
