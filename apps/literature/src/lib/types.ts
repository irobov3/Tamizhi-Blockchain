// ── Core domain types for the Tamizhi literary browser ──

export interface LiteratureWork {
  id: string
  title: string
  titleTamil?: string        // Tamil script title
  author: string
  authorTamil?: string
  period: string             // e.g. "300 BC - 200 AD"
  genre: 'poetry' | 'epic' | 'grammar' | 'philosophy' | 'history' | 'other'
  language: 'tamil' | 'bilingual'
  description: string
  excerpt?: string           // first few lines
  excerptTamil?: string      // Tamil excerpt
  arweaveId?: string         // Arweave content hash
  txHash?: string            // submission tx hash
  submitter?: string         // tamizhi1... address
  nftTokenId?: string
  verified: boolean
  verifiedBy?: string
  viewCount?: number
  createdAt?: string
}

export interface SubmitWorkForm {
  title: string
  titleTamil?: string
  author: string
  period: string
  genre: string
  description: string
  content: string            // full text
  language: string
}
