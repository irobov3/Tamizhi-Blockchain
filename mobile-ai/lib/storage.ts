// Tamizhi AI — conversation persistence via AsyncStorage.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Conversation } from "./ai";

const KEYS = {
  conversations: "tamizhi_lib_conversations",
  apiKey: "tamizhi_lib_api_key",
};

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function saveConversation(conv: Conversation): Promise<void> {
  try {
    const existing = await loadConversations();
    const idx = existing.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      existing[idx] = conv;
    } else {
      existing.unshift(conv);
    }
    await AsyncStorage.setItem(KEYS.conversations, JSON.stringify(existing));
  } catch (err) {
    console.warn("[storage] saveConversation failed", err);
  }
}

export async function loadConversations(): Promise<Conversation[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.conversations);
    if (!raw) return [];
    const list = JSON.parse(raw) as Conversation[];
    // Sort by updatedAt descending (most recent first).
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn("[storage] loadConversations failed", err);
    return [];
  }
}

export async function loadConversation(
  id: string
): Promise<Conversation | null> {
  try {
    const list = await loadConversations();
    return list.find((c) => c.id === id) ?? null;
  } catch (err) {
    console.warn("[storage] loadConversation failed", err);
    return null;
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const list = await loadConversations();
    const filtered = list.filter((c) => c.id !== id);
    await AsyncStorage.setItem(KEYS.conversations, JSON.stringify(filtered));
  } catch (err) {
    console.warn("[storage] deleteConversation failed", err);
  }
}

// ---------------------------------------------------------------------------
// API Key
// ---------------------------------------------------------------------------

export async function saveApiKey(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.apiKey, key);
  } catch (err) {
    console.warn("[storage] saveApiKey failed", err);
  }
}

export async function loadApiKey(): Promise<string> {
  try {
    const val = await AsyncStorage.getItem(KEYS.apiKey);
    return val ?? "";
  } catch (err) {
    console.warn("[storage] loadApiKey failed", err);
    return "";
  }
}
