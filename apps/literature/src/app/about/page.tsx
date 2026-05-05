import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | தமிழி Literary Browser',
  description: 'Learn how Tamizhi preserves Tamil literary heritage on the blockchain.',
};

const SECTION: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e0d0',
  borderRadius: '14px',
  padding: '32px',
  marginBottom: '28px',
};

const H2: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#2d1b00',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const P: React.CSSProperties = {
  fontSize: '15px',
  color: '#4a3520',
  lineHeight: 1.8,
  marginBottom: '12px',
};

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#c0392b',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '15px',
          flexShrink: 0,
          marginTop: '2px',
        }}
        aria-hidden="true"
      >
        {n}
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#2d1b00', marginBottom: '4px', fontSize: '15px' }}>
          {title}
        </div>
        <div style={{ fontSize: '14px', color: '#6b5a3e', lineHeight: 1.7 }}>{body}</div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div
          style={{
            fontFamily: 'Noto Sans Tamil, serif',
            fontSize: '48px',
            color: '#c0392b',
            marginBottom: '12px',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          தமிழி
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2d1b00', marginBottom: '12px' }}>
          About the Tamizhi Literary Browser
        </h1>
        <p style={{ fontSize: '16px', color: '#7a6545', maxWidth: '520px', margin: '0 auto' }}>
          Preserving Tamil literary heritage through blockchain technology — immutably,
          openly, and forever.
        </p>
      </div>

      {/* What is Tamizhi */}
      <div style={SECTION}>
        <h2 style={H2}>
          <span aria-hidden="true">🔗</span>
          What is the Tamizhi Blockchain?
        </h2>
        <p style={P}>
          Tamizhi is a purpose-built Layer-1 blockchain designed to preserve and celebrate
          Tamil culture. Built on the Cosmos SDK, it provides a decentralised, censorship-resistant
          ledger for Tamil literary works, NFT ownership records, and cultural metadata.
        </p>
        <p style={P}>
          Unlike centralised databases or archives that can be taken offline, edited, or lost,
          Tamizhi stores a cryptographic fingerprint of every registered work directly on-chain.
          The data is replicated across a network of validators around the world, ensuring
          permanent availability.
        </p>
        <p style={P}>
          The chain&apos;s native token <strong>TMZH</strong> (micro-denom: utmzh) is used
          for transaction fees and governance, allowing the Tamil community worldwide to
          participate in decisions about the network.
        </p>
      </div>

      {/* How works are stored */}
      <div style={SECTION}>
        <h2 style={H2}>
          <span aria-hidden="true">📦</span>
          How Literary Works Are Stored
        </h2>
        <p style={{ ...P, marginBottom: '24px' }}>
          Tamizhi uses a layered storage architecture to balance cost, permanence, and
          verifiability:
        </p>
        <Step
          n={1}
          title="Content Hash on Chain"
          body="A SHA-256 hash of the work's text is computed and submitted to the Tamizhi blockchain via a MsgSubmitWork transaction. This hash is the canonical identifier — any tampering with the text will change the hash, making forgery detectable."
        />
        <Step
          n={2}
          title="Full Text on Arweave"
          body="The full text is uploaded to Arweave, a permanent decentralised storage network. Arweave's endowment model guarantees storage for hundreds of years. The resulting Arweave transaction ID is stored alongside the hash on-chain."
        />
        <Step
          n={3}
          title="Indexed by the Explorer"
          body="The Tamizhi explorer indexes all on-chain works and their metadata (author, type, era, language) into a queryable database, enabling fast search and filtering without reading every block."
        />
        <Step
          n={4}
          title="Verification"
          body="Once a work is included in a confirmed block, it receives a verified status with the block height and transaction hash. Anyone can independently verify the content hash against the stored Arweave text."
        />
      </div>

      {/* NFT model */}
      <div style={SECTION}>
        <h2 style={H2}>
          <span aria-hidden="true">🎖️</span>
          NFT Ownership Model
        </h2>
        <p style={P}>
          Every literary work registered on Tamizhi can have multiple NFT editions minted
          against it. Owning an NFT does <em>not</em> grant copyright over the work — Tamil
          literature is a shared cultural heritage — but it does represent a cryptographically
          verifiable act of patronage and stewardship.
        </p>
        <p style={P}>
          NFTs are minted via <code style={{ fontFamily: 'monospace', fontSize: '13px', background: '#f5f0e8', padding: '1px 6px', borderRadius: '4px' }}>MsgMintNFT</code>,
          referencing the work&apos;s ID on-chain. Each token has a unique token ID and is
          permanently linked to the content hash of the work. Ownership is transferable and
          recorded on Tamizhi&apos;s NFT module.
        </p>
        <p style={P}>
          Revenue from NFT minting (above the base fee) can be directed to a community
          treasury governed by TMZH holders, funding further preservation efforts.
        </p>
      </div>

      {/* How to contribute */}
      <div style={SECTION}>
        <h2 style={H2}>
          <span aria-hidden="true">✍️</span>
          How to Contribute a Work
        </h2>
        <Step
          n={1}
          title="Prepare the text"
          body="Obtain or transcribe the work you wish to preserve. Ensure the text is in Unicode Tamil (UTF-8) and faithful to a reliable source."
        />
        <Step
          n={2}
          title="Compute the SHA-256 hash"
          body='Run: sha256sum yourwork.txt on Linux/macOS, or use an online tool. The output is 64 hexadecimal characters — this is your content hash.'
        />
        <Step
          n={3}
          title="Upload to Arweave (recommended)"
          body="Use arweave.app or the Arweave CLI to upload the text file and obtain a transaction ID. This ensures the full text is permanently accessible."
        />
        <Step
          n={4}
          title="Submit via this browser"
          body="Go to the Submit page, fill in the metadata form, paste your content hash and Arweave ID, then sign the MsgSubmitWork transaction with your Keplr wallet."
        />
        <Step
          n={5}
          title="Share and mint"
          body="Once confirmed, share the work's URL from this browser. Community members can mint NFT editions to show their support and contribute to preservation funding."
        />

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link
            href="/submit"
            style={{
              display: 'inline-block',
              background: '#c0392b',
              color: '#fff',
              padding: '13px 32px',
              borderRadius: '10px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '15px',
            }}
          >
            Submit a Work →
          </Link>
        </div>
      </div>

      {/* Technical details */}
      <div
        style={{
          background: '#f5f0e8',
          border: '1px solid #e8e0d0',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h2 style={{ ...H2, marginBottom: '12px' }}>
          <span aria-hidden="true">⚙️</span>
          Technical Details
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            {[
              ['Chain SDK', 'Cosmos SDK v0.50'],
              ['Consensus', 'CometBFT (Tendermint v2)'],
              ['Native denom', 'TMZH / utmzh (1 TMZH = 1,000,000 utmzh)'],
              ['REST API', 'http://localhost:1317'],
              ['RPC', 'http://localhost:26657'],
              ['Explorer API', 'http://localhost:3001'],
              ['Wallet', 'Keplr (Cosmos-compatible)'],
              ['Signing', '@cosmjs/stargate + @cosmjs/proto-signing'],
              ['Permanent storage', 'Arweave'],
            ].map(([k, v]) => (
              <tr
                key={k}
                style={{ borderBottom: '1px solid #e8e0d0' }}
              >
                <td
                  style={{
                    padding: '10px 0',
                    fontWeight: 600,
                    color: '#4a3520',
                    width: '40%',
                    verticalAlign: 'top',
                  }}
                >
                  {k}
                </td>
                <td style={{ padding: '10px 0', color: '#6b5a3e' }}>
                  <code style={{ fontFamily: 'monospace', fontSize: '13px' }}>{v}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
