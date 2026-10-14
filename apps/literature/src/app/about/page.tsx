import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About | தமிழி Literature',
  description: 'Learn how Tamizhi preserves Tamil literary heritage permanently on the blockchain.',
}

function Section({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: '#1a1040',
      border: '1px solid #2a1f5c',
      borderLeft: accent ? `4px solid ${accent}` : '1px solid #2a1f5c',
      borderRadius: '14px',
      padding: '32px',
      marginBottom: '24px',
    }}>
      {children}
    </div>
  )
}

function Step({ n, title, body, color }: { n: number; title: string; body: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '18px', marginBottom: '24px', alignItems: 'flex-start' }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: `${color}15`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '16px',
        color,
        flexShrink: 0,
      }}>
        {n}
      </div>
      <div>
        <div style={{ fontWeight: 700, color: '#fdf6e3', marginBottom: '6px', fontSize: '16px' }}>
          {title}
        </div>
        <div style={{ fontSize: '14px', color: '#8a8aa0', lineHeight: 1.8 }}>{body}</div>
      </div>
    </div>
  )
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: '1px solid #2a1f5c' }}>
      <td style={{
        padding: '12px 0',
        fontSize: '13px',
        fontWeight: 600,
        color: '#fdf6e3',
        width: '40%',
        verticalAlign: 'top',
      }}>
        {label}
      </td>
      <td style={{ padding: '12px 0' }}>
        <code style={{ fontSize: '13px', color: '#00d4ff', fontFamily: 'monospace' }}>{value}</code>
      </td>
    </tr>
  )
}

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '56px 24px 80px' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '56px' }}>
        <div style={{
          fontFamily: 'Noto Sans Tamil, serif',
          fontSize: '64px',
          color: '#d4a017',
          lineHeight: 1,
          marginBottom: '16px',
          textShadow: '0 0 40px rgba(212,160,23,0.3)',
        }}>
          தமிழி
        </div>
        <h1 style={{
          fontSize: 'clamp(22px, 3.5vw, 32px)',
          fontWeight: 700,
          color: '#fdf6e3',
          marginBottom: '14px',
          letterSpacing: '-0.01em',
        }}>
          About the Tamizhi Literature dApp
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#8a8aa0',
          maxWidth: '540px',
          margin: '0 auto',
          lineHeight: 1.8,
        }}>
          Preserving thousands of years of Tamil literary heritage through
          blockchain technology — immutably, openly, and forever.
        </p>
      </div>

      {/* Mission */}
      <Section accent="#d4a017">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#d4a017', marginBottom: '16px' }}>
          Our Mission
        </h2>
        <p style={{ fontSize: '15px', color: '#8a8aa0', lineHeight: 1.9, marginBottom: '14px' }}>
          Tamil is one of the world's oldest living languages, with a literary tradition spanning
          over 2,000 years. Works like Thirukkural, Silappatikaram, and Tolkappiyam are among
          humanity's greatest cultural treasures.
        </p>
        <p style={{ fontSize: '15px', color: '#8a8aa0', lineHeight: 1.9, marginBottom: '14px' }}>
          Tamizhi exists to ensure these works are never lost, censored, or forgotten. By
          recording cryptographic proofs of Tamil literature on a decentralised blockchain,
          we create a permanent, tamper-proof record that no single entity can delete.
        </p>
        <p style={{ fontSize: '15px', color: '#8a8aa0', lineHeight: 1.9 }}>
          Built on the Cosmos SDK, Tamizhi is a purpose-built Layer-1 chain governed by the
          global Tamil community through its native token <strong style={{ color: '#d4a017' }}>TMZ</strong>.
        </p>
      </Section>

      {/* How it works */}
      <Section accent="#a855f7">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fdf6e3', marginBottom: '24px' }}>
          How It Works
        </h2>
        <Step
          n={1}
          title="Submit"
          color="#d4a017"
          body="A contributor prepares a Tamil literary work, computes its SHA-256 hash, and uploads the full text to Arweave for permanent decentralised storage. They then submit the metadata and content hash via a MsgSubmitWork transaction signed with their Keplr wallet."
        />
        <Step
          n={2}
          title="Verify"
          color="#a855f7"
          body="Once the transaction is included in a block, the work receives on-chain verification status. Validators confirm the transaction, and the content hash becomes a permanent, cryptographically verifiable record of the exact text submitted."
        />
        <Step
          n={3}
          title="Preserve"
          color="#22c55e"
          body="The work is indexed by the Tamizhi explorer and becomes searchable and accessible to anyone. Community members can mint NFT editions as acts of patronage, funding further preservation. The content remains accessible via Arweave for hundreds of years."
        />
      </Section>

      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {[
          { value: '2,500+', label: 'Years of History', color: '#d4a017' },
          { value: '1,330', label: 'Thirukkural Couplets', color: '#a855f7' },
          { value: '400+', label: 'Sangam Poems', color: '#00d4ff' },
          { value: '∞', label: 'Years Preserved', color: '#22c55e' },
        ].map((s) => (
          <div key={s.label} style={{
            background: '#1a1040',
            border: '1px solid #2a1f5c',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '12px', color: '#8a8aa0', marginTop: '8px', lineHeight: 1.4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Technology Stack */}
      <Section accent="#00d4ff">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fdf6e3', marginBottom: '20px' }}>
          Technology Stack
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <TechRow label="Blockchain SDK" value="Cosmos SDK v0.50" />
            <TechRow label="Consensus" value="CometBFT (Tendermint v2)" />
            <TechRow label="Smart Contracts" value="CosmWasm" />
            <TechRow label="Native Token" value="TMZ / utmz (1 TMZ = 1,000,000 utmz)" />
            <TechRow label="Wallet" value="Keplr (Cosmos-compatible)" />
            <TechRow label="Signing Library" value="@cosmjs/stargate + @cosmjs/proto-signing" />
            <TechRow label="Permanent Storage" value="Arweave" />
            <TechRow label="Chain REST API" value="https://api.tamizhi.ai" />
            <TechRow label="Literature Module" value="GET /tamizhi/literature/v1/works" />
          </tbody>
        </table>
      </Section>

      {/* Community */}
      <Section accent="#22c55e">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fdf6e3', marginBottom: '16px' }}>
          Community & Governance
        </h2>
        <p style={{ fontSize: '15px', color: '#8a8aa0', lineHeight: 1.9, marginBottom: '16px' }}>
          Tamizhi is a community-owned protocol. TMZ holders participate in governance
          decisions — from listing policies to treasury allocation for preservation efforts.
          There is no corporate entity behind Tamizhi; it exists to serve the Tamil community worldwide.
        </p>
        <p style={{ fontSize: '15px', color: '#8a8aa0', lineHeight: 1.9, marginBottom: '28px' }}>
          Anyone can submit a work, run a validator node, or contribute to the open-source
          codebase. NFT revenue above base fees flows to a community treasury, funding
          academic research, digitisation projects, and educational initiatives.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/submit" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #d4a017, #b8860b)',
            color: '#0a0618',
            padding: '12px 28px',
            borderRadius: '9px',
            fontWeight: 700,
            fontSize: '15px',
          }}>
            Submit a Work →
          </Link>
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(212,160,23,0.1)',
            border: '1px solid rgba(212,160,23,0.3)',
            color: '#d4a017',
            padding: '12px 28px',
            borderRadius: '9px',
            fontWeight: 600,
            fontSize: '15px',
          }}>
            Browse Works
          </Link>
        </div>
      </Section>

      {/* Tamil heritage quote */}
      <div style={{
        textAlign: 'center',
        padding: '40px 24px',
        borderTop: '1px solid #2a1f5c',
      }}>
        <p style={{
          fontFamily: 'Noto Sans Tamil, serif',
          fontSize: '22px',
          color: '#d4a017',
          fontStyle: 'italic',
          lineHeight: 2,
          marginBottom: '12px',
        }}>
          யாதும் ஊரே யாவரும் கேளிர்
        </p>
        <p style={{ fontSize: '14px', color: '#8a8aa0', fontStyle: 'italic' }}>
          &ldquo;Every place is my hometown; every person is my kin.&rdquo;
          <span style={{ marginLeft: '8px', opacity: 0.6 }}>— Purananuru, Sangam literature</span>
        </p>
      </div>
    </div>
  )
}
