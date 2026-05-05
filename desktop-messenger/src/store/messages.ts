import { create } from "zustand";

export interface Message {
  id: string;
  conversationId: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  size: number;
  mime: string;
  cid?: string; // storage CID once uploaded
  localPath?: string;
}

export interface Conversation {
  id: string;
  peerAddress: string;
  peerName: string;
  lastMessage?: string;
  lastTimestamp?: number;
  unread: number;
  muted?: boolean;
}

interface MessagesState {
  conversations: Conversation[];
  messages: Record<string, Message[]>; // conversationId -> messages
  activeId: string | null;
  myAddress: string | null;
  showInfo: boolean;
  searchQuery: string;
  setActive: (id: string | null) => void;
  setMyAddress: (addr: string | null) => void;
  toggleInfo: () => void;
  setSearch: (q: string) => void;
  upsertConversation: (c: Conversation) => void;
  appendMessage: (m: Message) => void;
  markRead: (id: string) => void;
  totalUnread: () => number;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: {},
  activeId: null,
  myAddress: null,
  showInfo: true,
  searchQuery: "",
  setActive: (id) => {
    set({ activeId: id });
    if (id) get().markRead(id);
  },
  setMyAddress: (addr) => set({ myAddress: addr }),
  toggleInfo: () => set((s) => ({ showInfo: !s.showInfo })),
  setSearch: (q) => set({ searchQuery: q }),
  upsertConversation: (c) =>
    set((s) => {
      const idx = s.conversations.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        const next = [...s.conversations];
        next[idx] = { ...next[idx], ...c };
        return { conversations: next };
      }
      return { conversations: [c, ...s.conversations] };
    }),
  appendMessage: (m) =>
    set((s) => {
      const list = s.messages[m.conversationId] ?? [];
      const conv = s.conversations.find((c) => c.id === m.conversationId);
      const isActive = s.activeId === m.conversationId;
      const isInbound = m.from !== s.myAddress;
      const updatedConv: Conversation = conv
        ? {
            ...conv,
            lastMessage: m.body.slice(0, 80),
            lastTimestamp: m.timestamp,
            unread: isInbound && !isActive ? conv.unread + 1 : conv.unread,
          }
        : {
            id: m.conversationId,
            peerAddress: isInbound ? m.from : m.to,
            peerName: (isInbound ? m.from : m.to).slice(0, 10),
            lastMessage: m.body.slice(0, 80),
            lastTimestamp: m.timestamp,
            unread: isInbound && !isActive ? 1 : 0,
          };
      const conversations = [
        updatedConv,
        ...s.conversations.filter((c) => c.id !== m.conversationId),
      ];
      return {
        messages: { ...s.messages, [m.conversationId]: [...list, m] },
        conversations,
      };
    }),
  markRead: (id) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, unread: 0 } : c
      ),
    })),
  totalUnread: () =>
    get().conversations.reduce((sum, c) => sum + c.unread, 0),
}));
