import { create } from 'zustand'
import { Contact, Message, WalletState } from './types'

// conversationId = sorted pair of addresses joined by ':'
export function makeConvId(a: string, b: string): string {
  return [a, b].sort().join(':')
}

export const MY_ADDRESS = 'tamizhi1me000000000000000000000000000000000'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const DEMO_CONTACTS: Contact[] = [
  {
    id: '1',
    address: 'tamizhi1abc123abc123abc123abc123abc123abc123',
    name: 'Alice Kumar',
    initials: 'AK',
    avatarColor: '#7c3aed',
    lastMessage: 'வணக்கம்! How are you?',
    lastMessageTime: Date.now() - 300000,
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: '2',
    address: 'tamizhi1def456def456def456def456def456def456',
    name: 'Bob Rajan',
    initials: 'BR',
    avatarColor: '#0891b2',
    lastMessage: 'Sent you 10 TMZ',
    lastMessageTime: Date.now() - 3600000,
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: '3',
    address: 'tamizhi1ghi789ghi789ghi789ghi789ghi789ghi789',
    name: 'Carol Devi',
    initials: 'CD',
    avatarColor: '#059669',
    lastMessage: 'Check the new dApp!',
    lastMessageTime: Date.now() - 86400000,
    unreadCount: 1,
    isOnline: false,
  },
  {
    id: '4',
    address: 'tamizhi1jkl012jkl012jkl012jkl012jkl012jkl012',
    name: 'Dave Murugan',
    initials: 'DM',
    avatarColor: '#d97706',
    lastMessage: 'Meeting at 3?',
    lastMessageTime: Date.now() - 172800000,
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: '5',
    address: 'tamizhi1mno345mno345mno345mno345mno345mno345',
    name: 'Eve Lakshmi',
    initials: 'EL',
    avatarColor: '#dc2626',
    lastMessage: 'Tamil poem I found',
    lastMessageTime: Date.now() - 259200000,
    unreadCount: 0,
    isOnline: true,
  },
]

const C0 = DEMO_CONTACTS[0]
const C1 = DEMO_CONTACTS[1]

const DEMO_MESSAGES: Record<string, Message[]> = {
  [makeConvId(MY_ADDRESS, C0.address)]: [
    {
      id: 'm1',
      conversationId: makeConvId(MY_ADDRESS, C0.address),
      from: C0.address,
      to: MY_ADDRESS,
      content: 'வணக்கம்! How are you?',
      timestamp: Date.now() - 10 * 60 * 1000,
      status: 'delivered',
      type: 'text',
    },
    {
      id: 'm2',
      conversationId: makeConvId(MY_ADDRESS, C0.address),
      from: MY_ADDRESS,
      to: C0.address,
      content: 'நலமாக இருக்கிறேன்! Great to hear from you 😊',
      timestamp: Date.now() - 8 * 60 * 1000,
      status: 'read',
      type: 'text',
    },
    {
      id: 'm3',
      conversationId: makeConvId(MY_ADDRESS, C0.address),
      from: C0.address,
      to: MY_ADDRESS,
      content: 'Have you seen the new Tamizhi chain update? The block times are incredible!',
      timestamp: Date.now() - 5 * 60 * 1000,
      status: 'delivered',
      type: 'text',
    },
    {
      id: 'm4',
      conversationId: makeConvId(MY_ADDRESS, C0.address),
      from: MY_ADDRESS,
      to: C0.address,
      content: 'Yes! The validators did an amazing job. Sub-2 second finality 🚀',
      timestamp: Date.now() - 3 * 60 * 1000,
      status: 'delivered',
      type: 'text',
    },
    {
      id: 'm5',
      conversationId: makeConvId(MY_ADDRESS, C0.address),
      from: C0.address,
      to: MY_ADDRESS,
      content: 'வணக்கம்! How are you?',
      timestamp: Date.now() - 300000,
      status: 'delivered',
      type: 'text',
    },
  ],
  [makeConvId(MY_ADDRESS, C1.address)]: [
    {
      id: 'm10',
      conversationId: makeConvId(MY_ADDRESS, C1.address),
      from: C1.address,
      to: MY_ADDRESS,
      content: 'Hey! Sending you some TMZ for the project',
      timestamp: Date.now() - 25 * 60 * 1000,
      status: 'delivered',
      type: 'text',
    },
    {
      id: 'm11',
      conversationId: makeConvId(MY_ADDRESS, C1.address),
      from: C1.address,
      to: MY_ADDRESS,
      content: '10',
      timestamp: Date.now() - 20 * 60 * 1000,
      status: 'delivered',
      type: 'tmz_transfer',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount: '10',
    },
    {
      id: 'm12',
      conversationId: makeConvId(MY_ADDRESS, C1.address),
      from: MY_ADDRESS,
      to: C1.address,
      content: 'Thanks Bob! Received it 🙏 Really appreciate it.',
      timestamp: Date.now() - 18 * 60 * 1000,
      status: 'read',
      type: 'text',
    },
    {
      id: 'm13',
      conversationId: makeConvId(MY_ADDRESS, C1.address),
      from: C1.address,
      to: MY_ADDRESS,
      content: 'Sent you 10 TMZ',
      timestamp: Date.now() - 3600000,
      status: 'delivered',
      type: 'text',
    },
  ],
}

interface AppStore {
  contacts: Contact[]
  messages: Record<string, Message[]>
  activeContactId: string | null
  wallet: WalletState
  searchQuery: string
  showContactInfo: boolean

  // Actions
  setContacts: (contacts: Contact[]) => void
  addMessage: (message: Message) => void
  setActiveContact: (id: string | null) => void
  setWallet: (wallet: WalletState) => void
  setSearch: (query: string) => void
  markRead: (contactId: string) => void
  updateMessageStatus: (convId: string, msgId: string, status: Message['status']) => void
  toggleContactInfo: () => void
}

export const useStore = create<AppStore>((set, _get) => ({
  contacts: DEMO_CONTACTS,
  messages: DEMO_MESSAGES,
  activeContactId: null,
  wallet: {
    address: MY_ADDRESS,
    balance: '1,250.00 TMZ',
    isConnected: true,
  },
  searchQuery: '',
  showContactInfo: false,

  setContacts: (contacts) => set({ contacts }),

  addMessage: (message) =>
    set((s) => {
      const list = s.messages[message.conversationId] ?? []
      const contactAddr =
        message.from === MY_ADDRESS ? message.to : message.from
      const contacts = s.contacts.map((c) => {
        if (c.address !== contactAddr) return c
        const isActive = s.activeContactId === c.id
        return {
          ...c,
          lastMessage:
            message.type === 'tmz_transfer'
              ? `Sent ${message.amount} TMZ`
              : message.content.slice(0, 80),
          lastMessageTime: message.timestamp,
          unreadCount:
            message.from !== MY_ADDRESS && !isActive
              ? c.unreadCount + 1
              : c.unreadCount,
        }
      })
      return {
        messages: {
          ...s.messages,
          [message.conversationId]: [...list, message],
        },
        contacts,
      }
    }),

  setActiveContact: (id) =>
    set((s) => {
      const contacts = id
        ? s.contacts.map((c) =>
            c.id === id ? { ...c, unreadCount: 0 } : c
          )
        : s.contacts
      return { activeContactId: id, contacts }
    }),

  setWallet: (wallet) => set({ wallet }),

  setSearch: (query) => set({ searchQuery: query }),

  markRead: (contactId) =>
    set((s) => ({
      contacts: s.contacts.map((c) =>
        c.id === contactId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  updateMessageStatus: (convId, msgId, status) =>
    set((s) => {
      const list = s.messages[convId] ?? []
      return {
        messages: {
          ...s.messages,
          [convId]: list.map((m) =>
            m.id === msgId ? { ...m, status } : m
          ),
        },
      }
    }),

  toggleContactInfo: () =>
    set((s) => ({ showContactInfo: !s.showContactInfo })),
}))

// Re-export initials helper for components
export { initials }
