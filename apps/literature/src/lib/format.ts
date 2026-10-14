import type { LiteratureWork } from './types'

export function formatGenre(genre: LiteratureWork['genre']): string {
  switch (genre) {
    case 'poetry':     return 'Poetry'
    case 'epic':       return 'Epic'
    case 'grammar':    return 'Grammar'
    case 'philosophy': return 'Philosophy'
    case 'history':    return 'History'
    case 'other':      return 'Other'
    default:           return String(genre)
  }
}

export function genreInTamil(genre: LiteratureWork['genre']): string {
  switch (genre) {
    case 'poetry':     return 'கவிதை'
    case 'epic':       return 'காவியம்'
    case 'grammar':    return 'இலக்கணம்'
    case 'philosophy': return 'தத்துவம்'
    case 'history':    return 'வரலாறு'
    case 'other':      return 'மற்றவை'
    default:           return ''
  }
}

export function genreColor(genre: LiteratureWork['genre']): string {
  switch (genre) {
    case 'poetry':     return '#a855f7'  // purple
    case 'epic':       return '#00d4ff'  // cyan
    case 'grammar':    return '#d4a017'  // gold
    case 'philosophy': return '#ef4444'  // red
    case 'history':    return '#22c55e'  // green
    case 'other':      return '#8a8aa0'  // muted
    default:           return '#8a8aa0'
  }
}

export function truncateHash(hash: string, leading = 8, trailing = 8): string {
  if (!hash) return ''
  if (hash.length <= leading + trailing + 3) return hash
  return `${hash.slice(0, leading)}…${hash.slice(-trailing)}`
}

export function isValidContentHash(hash: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hash)
}

export function formatNumber(n: number | undefined | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-IN')
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}
