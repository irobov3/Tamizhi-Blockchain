import type { LiteratureWork } from './types'

const EXPLORER_API = process.env.NEXT_PUBLIC_EXPLORER_API ?? 'http://localhost:3001/api/v1'
const REST = process.env.NEXT_PUBLIC_REST_URL ?? 'https://api.tamizhi.ai'

export const MOCK_WORKS: LiteratureWork[] = [
  {
    id: '1',
    title: 'Thirukkural',
    titleTamil: 'திருக்குறள்',
    author: 'Thiruvalluvar',
    authorTamil: 'திருவள்ளுவர்',
    period: '200 BC',
    genre: 'philosophy',
    language: 'tamil',
    description: 'Universal scripture of ethics, political and economical matters, and love written in Tamil couplets. Considered one of the greatest works in Tamil literature, comprising 1330 couplets organized into 133 chapters.',
    excerpt: 'A is the first of letters; the Eternal God is first in all the world.',
    excerptTamil: 'அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு',
    verified: true,
    viewCount: 1247,
    txHash: 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2',
    submitter: 'tamizhi1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu',
    arweaveId: 'ArweaveIdForThirukkural1234567890123456789012',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    title: 'Silappatikaram',
    titleTamil: 'சிலப்பதிகாரம்',
    author: 'Ilango Adigal',
    authorTamil: 'இளங்கோவடிகள்',
    period: '2nd century AD',
    genre: 'epic',
    language: 'tamil',
    description: 'One of the Five Great Epics of Tamil literature, the story of Kannagi and her anklet (silambu). A masterpiece weaving together poetry, dance, music, and philosophy.',
    excerpt: 'The city of Puhar where the sun rises over the sea, adorned with pearls and gems...',
    excerptTamil: 'புகார் நகரில் கடல் கரையில் பூம்புகார் என்னும் நகர்...',
    verified: true,
    viewCount: 892,
    txHash: 'B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3',
    submitter: 'tamizhi1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu',
    createdAt: '2024-01-16T14:20:00Z',
  },
  {
    id: '3',
    title: 'Purananuru',
    titleTamil: 'புறநானூறு',
    author: 'Various (Sangam)',
    authorTamil: 'சங்கப் புலவர்கள்',
    period: '300 BC - 300 AD',
    genre: 'poetry',
    language: 'tamil',
    description: '400 poems from the Sangam literature about war, heroism, death, and the ethics of kings. Written by multiple poets across centuries.',
    excerpt: 'யாதும் ஊரே யாவரும் கேளிர்',
    excerptTamil: 'யாதும் ஊரே யாவரும் கேளிர் தீதும் நன்றும் பிறர்தர வாரா',
    verified: true,
    viewCount: 634,
    txHash: 'C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4',
    submitter: 'tamizhi1abc123def456ghi789jkl012mno345pqr678stu',
    createdAt: '2024-01-17T09:00:00Z',
  },
  {
    id: '4',
    title: 'Tolkappiyam',
    titleTamil: 'தொல்காப்பியம்',
    author: 'Tolkappiyar',
    authorTamil: 'தொல்காப்பியர்',
    period: '3rd century BC',
    genre: 'grammar',
    language: 'tamil',
    description: 'The oldest extant Tamil grammar text, covering phonology, grammar and poetics. One of the oldest surviving works of Tamil literature, dealing systematically with letters, words, subject matter, and prosody.',
    excerptTamil: 'எழுத்தெனப் படுவ அகரமுதல் னகர இறுவாய் முப்பஃதென்ப',
    verified: true,
    viewCount: 521,
    txHash: 'D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5',
    submitter: 'tamizhi1xyz789abc123def456ghi789jkl012mno345pqr',
    arweaveId: 'ArweaveIdForTolkappiyam1234567890123456789012',
    createdAt: '2024-01-18T11:45:00Z',
  },
  {
    id: '5',
    title: 'Manimekalai',
    titleTamil: 'மணிமேகலை',
    author: 'Seethalai Saathanar',
    authorTamil: 'சீத்தலைச் சாத்தனார்',
    period: '6th century AD',
    genre: 'epic',
    language: 'tamil',
    description: 'Buddhist epic sequel to Silappatikaram, telling the story of Manimekalai, daughter of Kovalan and Madhavi. A profound exploration of Buddhist philosophy through narrative poetry.',
    excerptTamil: 'மணிமேகலை திருவடி வணங்கி மலர்அடி போற்றி வாழ்த்தி',
    verified: false,
    viewCount: 412,
    createdAt: '2024-01-19T16:30:00Z',
  },
  {
    id: '6',
    title: 'Kambaramayanam',
    titleTamil: 'கம்பராமாயணம்',
    author: 'Kambar',
    authorTamil: 'கம்பர்',
    period: '12th century AD',
    genre: 'epic',
    language: 'tamil',
    description: 'Tamil version of the Ramayana by the poet Kambar, considered a masterpiece of Tamil literature. Known for its beautiful imagery, complex meter, and philosophical depth.',
    excerpt: 'உலகம் யாவையும் தாம் உள ஆக்கலும்',
    excerptTamil: 'உலகம் யாவையும் தாம் உள ஆக்கலும் நிலைபெறுத்தலும் நீக்கலும் நீங்கலா',
    verified: true,
    viewCount: 789,
    txHash: 'F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1',
    submitter: 'tamizhi1pqr678stu901vwx234yz567abc890def123ghi456',
    arweaveId: 'ArweaveIdForKambaramayanam123456789012345678901',
    createdAt: '2024-01-20T08:15:00Z',
  },
]

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`API error ${res.status} — ${url}`)
  return res.json() as Promise<T>
}

export async function getWorks(
  limit?: number,
  offset?: number
): Promise<{ works: LiteratureWork[]; total: number }> {
  try {
    const params = new URLSearchParams()
    if (limit !== undefined) params.set('limit', String(limit))
    if (offset !== undefined) params.set('offset', String(offset))
    const qs = params.toString()
    const data = await apiFetch<{ works: LiteratureWork[]; total: number }>(
      `${EXPLORER_API}/literature${qs ? `?${qs}` : ''}`
    )
    return { works: data.works ?? [], total: data.total ?? 0 }
  } catch {
    return { works: MOCK_WORKS, total: MOCK_WORKS.length }
  }
}

export async function getWork(id: string): Promise<LiteratureWork> {
  try {
    const data = await apiFetch<{ work: LiteratureWork }>(
      `${EXPLORER_API}/literature/${encodeURIComponent(id)}`
    )
    return data.work
  } catch {
    // Try chain REST
    try {
      const data = await apiFetch<{ work: LiteratureWork }>(
        `${REST}/tamizhi/literature/v1/works/${encodeURIComponent(id)}`
      )
      return data.work
    } catch {
      const mock = MOCK_WORKS.find((w) => w.id === id)
      if (mock) return mock
      throw new Error(`Work not found: ${id}`)
    }
  }
}

export async function searchWorks(query: string): Promise<LiteratureWork[]> {
  if (!query.trim()) return []
  try {
    const params = new URLSearchParams({ q: query })
    const data = await apiFetch<{ works: LiteratureWork[] }>(
      `${EXPLORER_API}/literature/search?${params.toString()}`
    )
    return data.works ?? []
  } catch {
    // Fallback: filter mock data
    const q = query.toLowerCase()
    return MOCK_WORKS.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        (w.titleTamil ?? '').includes(q) ||
        w.author.toLowerCase().includes(q) ||
        (w.authorTamil ?? '').includes(q) ||
        w.description.toLowerCase().includes(q) ||
        (w.excerpt ?? '').toLowerCase().includes(q) ||
        (w.excerptTamil ?? '').includes(q)
    )
  }
}

export async function getWorksByGenre(genre: string): Promise<LiteratureWork[]> {
  try {
    const data = await apiFetch<{ works: LiteratureWork[] }>(
      `${EXPLORER_API}/literature?genre=${encodeURIComponent(genre)}`
    )
    return data.works ?? []
  } catch {
    return MOCK_WORKS.filter((w) => w.genre === genre)
  }
}

export async function getFeaturedWorks(): Promise<LiteratureWork[]> {
  try {
    const data = await apiFetch<{ works: LiteratureWork[] }>(
      `${EXPLORER_API}/literature/featured`
    )
    return data.works ?? []
  } catch {
    return MOCK_WORKS.slice(0, 6)
  }
}
