import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tamizhi.browser.history.lib.v1';
const MAX_ENTRIES = 500;

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
}

const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

async function readEntries(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

async function writeEntries(entries: HistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('[history] write failed', e);
  }
}

/** Prepend a visit to history. Skips tamizhi:// internal URLs. Max 500 entries. */
export async function addHistory(url: string, title: string): Promise<void> {
  if (!url || url.startsWith('tamizhi://')) return;
  const entry: HistoryEntry = {
    id: newId(),
    url,
    title: title || url,
    visitedAt: Date.now(),
  };
  const existing = await readEntries();
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  await writeEntries(updated);
}

/** Load all history entries, newest first. */
export async function loadHistory(): Promise<HistoryEntry[]> {
  const entries = await readEntries();
  return entries.sort((a, b) => b.visitedAt - a.visitedAt);
}

/** Delete all history. */
export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[history] clear failed', e);
  }
}

/** Filter history by query string (matches URL and title). */
export async function searchHistory(query: string): Promise<HistoryEntry[]> {
  const entries = await loadHistory();
  const needle = query.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter(
    (e) =>
      e.url.toLowerCase().includes(needle) ||
      e.title.toLowerCase().includes(needle)
  );
}
