// Tamizhi AI — Zustand store for lib layer.

import { create } from "zustand";
import type { Conversation } from "./ai";
import {
  loadConversations,
  saveConversation,
  deleteConversation as storageDelete,
  saveApiKey,
  loadApiKey,
} from "./storage";

interface AppStore {
  // State
  apiKey: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  hydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  addConversation: (conv: Conversation) => Promise<void>;
  updateConversation: (conv: Conversation) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  setStreaming: (streaming: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  apiKey: "",
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  hydrated: false,

  hydrate: async () => {
    const [conversations, apiKey] = await Promise.all([
      loadConversations(),
      loadApiKey(),
    ]);
    set({ conversations, apiKey, hydrated: true });
  },

  setApiKey: async (key: string) => {
    set({ apiKey: key });
    await saveApiKey(key);
  },

  addConversation: async (conv: Conversation) => {
    set((state) => ({
      conversations: [conv, ...state.conversations.filter((c) => c.id !== conv.id)],
    }));
    await saveConversation(conv);
  },

  updateConversation: async (conv: Conversation) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conv.id ? conv : c
      ),
    }));
    await saveConversation(conv);
  },

  deleteConversation: async (id: string) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    }));
    await storageDelete(id);
  },

  setActiveConversation: (id: string | null) => {
    set({ activeConversationId: id });
  },

  setStreaming: (streaming: boolean) => {
    set({ isStreaming: streaming });
  },
}));
