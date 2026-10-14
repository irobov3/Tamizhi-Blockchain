export interface Contact {
  id: string
  address: string        // tamizhi1... blockchain address
  name: string
  initials: string
  avatarColor: string
  lastMessage?: string
  lastMessageTime?: number
  unreadCount: number
  isOnline: boolean
}

export interface Message {
  id: string
  conversationId: string
  from: string           // tamizhi address
  to: string
  content: string
  timestamp: number
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  type: 'text' | 'image' | 'file' | 'tmz_transfer'
  txHash?: string        // if type === 'tmz_transfer'
  amount?: string        // for tmz_transfer
}

export interface WalletState {
  address: string
  balance: string
  isConnected: boolean
}
