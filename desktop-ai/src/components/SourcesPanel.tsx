import { useStore } from '../store'

interface SourceCard {
  title: string
  desc: string
  url?: string
}

const TAMIL_CLASSICS: SourceCard[] = [
  {
    title: 'Thirukkural',
    desc: 'அகர முதல எழுத்தெல்லாம் — 1330 couplets of wisdom by Thiruvalluvar',
    url: 'https://www.thirukkural.com',
  },
  {
    title: 'Sangam Poetry',
    desc: 'Classical love and war poems — Akananuru, Purananuru, and more',
  },
  {
    title: 'Tamil Grammar (Tolkāppiyam)',
    desc: "World's oldest surviving grammar, covering phonology and poetics",
  },
]

const BLOCKCHAIN_REFS: SourceCard[] = [
  {
    title: 'Tamizhi Chain Docs',
    desc: 'Official docs for staking, validators, and governance',
    url: 'https://docs.tamizhi.chain',
  },
  {
    title: 'CosmJS Docs',
    desc: 'JavaScript SDK for Cosmos-based blockchains',
    url: 'https://cosmos.github.io/cosmjs',
  },
  {
    title: 'Cosmos SDK',
    desc: 'Framework powering Tamizhi chain — modules and concepts',
    url: 'https://docs.cosmos.network',
  },
]

function Card({ card }: { card: SourceCard }) {
  const handleClick = () => {
    if (card.url) window.open(card.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      onClick={card.url ? handleClick : undefined}
      style={{
        background: '#111130',
        border: '1px solid #1e1e4a',
        borderRadius: 8,
        padding: '10px 12px',
        cursor: card.url ? 'pointer' : 'default',
        marginBottom: 8,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (card.url)
          (e.currentTarget as HTMLDivElement).style.borderColor = '#7c3aed'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e4a'
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: '#f0f0ff',
          fontWeight: 600,
          marginBottom: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {card.title}
        {card.url && (
          <span style={{ fontSize: 10, color: '#6060a0' }}>↗</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#6060a0', lineHeight: 1.4 }}>{card.desc}</div>
    </div>
  )
}

export default function SourcesPanel() {
  const toggleSources = useStore((s) => s.toggleSources)

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: '#0d0d25',
        borderLeft: '1px solid #1e1e4a',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #1e1e4a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 14, color: '#f0f0ff', fontWeight: 700 }}>
          Sources &amp; Context
        </div>
        <button
          onClick={toggleSources}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6060a0',
            cursor: 'pointer',
            fontSize: 18,
            padding: '2px 4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        {/* Tamil Classics */}
        <div
          style={{
            fontSize: 11,
            color: '#7c3aed',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: 10,
          }}
        >
          Tamil Classics
        </div>
        {TAMIL_CLASSICS.map((c) => (
          <Card key={c.title} card={c} />
        ))}

        {/* Blockchain References */}
        <div
          style={{
            fontSize: 11,
            color: '#7c3aed',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            margin: '20px 0 10px',
          }}
        >
          Blockchain References
        </div>
        {BLOCKCHAIN_REFS.map((c) => (
          <Card key={c.title} card={c} />
        ))}

        <div
          style={{
            marginTop: 20,
            padding: '10px 12px',
            background: '#111130',
            border: '1px solid #1e1e4a',
            borderRadius: 8,
            fontSize: 11,
            color: '#6060a0',
            lineHeight: 1.5,
          }}
        >
          Tamizhi AI draws from its training on Tamil literature and blockchain documentation.
          Cited sources open in your browser.
        </div>
      </div>
    </aside>
  )
}
