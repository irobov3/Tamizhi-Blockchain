import { create } from 'zustand'
import type { Conversation, Message, Model } from './types'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function now(): number {
  return Date.now()
}

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignore
  }
  return fallback
}

function saveToLS(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Seed conversations so the UI looks populated on first launch
// ---------------------------------------------------------------------------
function makeSeedConversations(): Conversation[] {
  const t1 = now() - 1000 * 60 * 60 * 2 // 2 hours ago
  const t2 = now() - 1000 * 60 * 60 * 24 // 1 day ago
  const t3 = now() - 1000 * 60 * 60 * 48 // 2 days ago
  const model: Model = 'claude-3-5-sonnet-20241022'

  const kural1Content = [
    'The very first Thirukkural (Kural 1) opens with:',
    '',
    '**Agara mudala ezhuthellam** — "As the letter A is the first of all letters..."',
    '**Aadhi bhagavan mudhatre ulaghu** — "...so the primordial God is first in the world."',
    '',
    'Thiruvalluvar begins the Thirukkural by comparing God to the first letter of the Tamil',
    'alphabet. Just as every word is rooted in that primal sound, all of existence is rooted',
    'in the divine. This is regarded as one of the most elegant opening verses in world literature.',
  ].join('\n')

  const stakingContent = [
    'Staking on the Tamizhi chain works through the standard Cosmos SDK delegation model:',
    '',
    '1. **Choose a validator** — Browse active validators by voting power and commission rate.',
    '2. **Delegate TMZ tokens** — Use `tamizhi tx staking delegate <validator-addr> <amount>utmz` or the GUI.',
    '3. **Earn rewards** — Rewards accrue every block. Claim with `tx distribution withdraw-rewards`.',
    '4. **Unbonding period** — 21 days to unbond (standard Cosmos default). Plan accordingly.',
    '',
    '**Slashing risks:** validators can be slashed for double-signing (5%) or prolonged downtime (0.01%).',
    'Always delegate to reliable, well-maintained validators.',
    '',
    'Want me to walk through a specific validator selection strategy?',
  ].join('\n')

  const sangamContent = [
    'Sangam literature is a body of classical Tamil poetry composed roughly between 300 BCE and 300 CE.',
    'It represents one of humanity\'s oldest literary traditions.',
    '',
    '**The Eight Anthologies (Ettuthokai):**',
    '- *Ainkurunuru* — 500 short love poems',
    '- *Akananuru* — 400 longer love poems',
    '- *Purananuru* — 400 poems on war, death, and heroism',
    '- *Kalittokai* — 150 dramatic poems',
    '- ...and four more collections',
    '',
    '**Two themes (akam / puram):**',
    '- **akam** — interior: love, longing, reunion',
    '- **puram** — exterior: war, kings, ethics',
    '',
    'The landscape (tinai) system maps five landscapes to emotional states:',
    'Mountain (Kurinji) = union, Seaside (Neytal) = separation, Forest (Mullai) = waiting,',
    'Farmland (Marudam) = infidelity, Wasteland (Paalai) = elopement.',
  ].join('\n')

  return [
    {
      id: uid(),
      title: 'Thirukkural Chapter 1',
      model,
      createdAt: t1,
      updatedAt: t1 + 1000,
      messages: [
        {
          id: uid(),
          role: 'user',
          content: 'Tell me about the first Thirukkural',
          timestamp: t1,
        },
        {
          id: uid(),
          role: 'assistant',
          content: kural1Content,
          timestamp: t1 + 500,
          model,
        },
      ],
    },
    {
      id: uid(),
      title: 'TMZ Staking Guide',
      model,
      createdAt: t2,
      updatedAt: t2 + 2000,
      messages: [
        {
          id: uid(),
          role: 'user',
          content: 'How does staking work on the Tamizhi blockchain?',
          timestamp: t2,
        },
        {
          id: uid(),
          role: 'assistant',
          content: stakingContent,
          timestamp: t2 + 1000,
          model,
        },
      ],
    },
    {
      id: uid(),
      title: 'Sangam Poetry overview',
      model,
      createdAt: t3,
      updatedAt: t3 + 3000,
      messages: [
        {
          id: uid(),
          role: 'user',
          content: 'Give me an overview of Sangam poetry',
          timestamp: t3,
        },
        {
          id: uid(),
          role: 'assistant',
          content: sangamContent,
          timestamp: t3 + 1500,
          model,
        },
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------
interface AppState {
  conversations: Conversation[]
  activeConversationId: string | null
  apiKey: string
  model: Model
  isStreaming: boolean
  showSettings: boolean
  showSources: boolean
  searchQuery: string

  // actions
  createConversation: (firstMessage?: string) => string
  setActiveConversation: (id: string) => void
  addMessage: (convId: string, msg: Message) => void
  updateLastMessage: (convId: string, content: string) => void
  finalizeLastMessage: (convId: string, content: string) => void
  deleteConversation: (convId: string) => void
  setApiKey: (key: string) => void
  loadApiKey: () => void
  setModel: (m: Model) => void
  setStreaming: (b: boolean) => void
  toggleSettings: () => void
  toggleSources: () => void
  setSearchQuery: (q: string) => void
}

// ---------------------------------------------------------------------------
// Create store
// ---------------------------------------------------------------------------
export const useStore = create<AppState>((set, get) => {
  // Load persisted conversations or seed with starters
  const savedConvs = loadFromLS<Conversation[] | null>('tmz_conversations', null)
  const initialConversations: Conversation[] = savedConvs ?? makeSeedConversations()
  const initialActiveId =
    loadFromLS<string | null>('tmz_activeId', null) ??
    (initialConversations.length > 0 ? initialConversations[0].id : null)

  // Persist whenever conversations change
  function persistConvs(conversations: Conversation[], activeId: string | null) {
    saveToLS('tmz_conversations', conversations)
    saveToLS('tmz_activeId', activeId)
  }

  return {
    conversations: initialConversations,
    activeConversationId: initialActiveId,
    apiKey: loadFromLS<string>('tmz_apiKey', ''),
    model: loadFromLS<Model>('tmz_model', 'claude-3-5-sonnet-20241022'),
    isStreaming: false,
    showSettings: false,
    showSources: false,
    searchQuery: '',

    createConversation: (firstMessage?: string) => {
      const id = uid()
      const ts = now()
      const { model, conversations } = get()
      const conv: Conversation = {
        id,
        title: firstMessage ? firstMessage.slice(0, 40) : 'New conversation',
        messages: [],
        createdAt: ts,
        updatedAt: ts,
        model,
      }
      const next = [conv, ...conversations]
      set({ conversations: next, activeConversationId: id })
      persistConvs(next, id)
      return id
    },

    setActiveConversation: (id: string) => {
      set({ activeConversationId: id })
      persistConvs(get().conversations, id)
    },

    addMessage: (convId: string, msg: Message) => {
      set((s) => {
        const conversations = s.conversations.map((c) => {
          if (c.id !== convId) return c
          const isFirstUser = msg.role === 'user' && c.messages.length === 0
          return {
            ...c,
            messages: [...c.messages, msg],
            updatedAt: now(),
            title:
              isFirstUser || (c.title === 'New conversation' && msg.role === 'user')
                ? msg.content.slice(0, 40)
                : c.title,
          }
        })
        persistConvs(conversations, s.activeConversationId)
        return { conversations }
      })
    },

    updateLastMessage: (convId: string, content: string) => {
      set((s) => {
        const conversations = s.conversations.map((c) => {
          if (c.id !== convId) return c
          const msgs = [...c.messages]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant') {
              msgs[i] = { ...msgs[i], content }
              break
            }
          }
          return { ...c, messages: msgs }
        })
        return { conversations }
      })
    },

    finalizeLastMessage: (convId: string, content: string) => {
      set((s) => {
        const conversations = s.conversations.map((c) => {
          if (c.id !== convId) return c
          const msgs = [...c.messages]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant') {
              msgs[i] = { ...msgs[i], content, isStreaming: false }
              break
            }
          }
          return { ...c, messages: msgs, updatedAt: now() }
        })
        persistConvs(conversations, s.activeConversationId)
        return { conversations, isStreaming: false }
      })
    },

    deleteConversation: (convId: string) => {
      set((s) => {
        const conversations = s.conversations.filter((c) => c.id !== convId)
        const activeConversationId =
          s.activeConversationId === convId
            ? (conversations[0]?.id ?? null)
            : s.activeConversationId
        persistConvs(conversations, activeConversationId)
        return { conversations, activeConversationId }
      })
    },

    setApiKey: (key: string) => {
      saveToLS('tmz_apiKey', key)
      set({ apiKey: key })
    },

    loadApiKey: () => {
      const key = loadFromLS<string>('tmz_apiKey', '')
      set({ apiKey: key })
    },

    setModel: (m: Model) => {
      saveToLS('tmz_model', m)
      set({ model: m })
    },

    setStreaming: (b: boolean) => set({ isStreaming: b }),

    toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),

    toggleSources: () => set((s) => ({ showSources: !s.showSources })),

    setSearchQuery: (q: string) => set({ searchQuery: q }),
  }
})
