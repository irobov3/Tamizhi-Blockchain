import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Simple typed wrapper around AsyncStorage for persisting app state.
 */

const PREFIX = '@tamizhi:';

export async function storeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function loadJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

export async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter((k) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(appKeys);
}

// Specific helpers

export async function persistConversations(convs: unknown[]): Promise<void> {
  await storeJSON('conversations', convs);
}

export async function loadConversations<T>(): Promise<T[]> {
  return (await loadJSON<T[]>('conversations')) ?? [];
}

export async function persistContacts(contacts: unknown[]): Promise<void> {
  await storeJSON('contacts', contacts);
}

export async function loadContacts<T>(): Promise<T[]> {
  return (await loadJSON<T[]>('contacts')) ?? [];
}
