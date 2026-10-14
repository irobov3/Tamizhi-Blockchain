'use client';

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import {
  Code2,
  Terminal,
  Cpu,
  Globe,
  Shield,
  Zap,
  BookOpen,
  Users,
  Database,
  GitBranch,
  Package,
  Layers,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// ─── Sidebar sections ─────────────────────────────────────────────────────────
const sections: Section[] = [
  { id: 'quick-start',  label: 'Quick Start',          icon: <Zap className="w-4 h-4" /> },
  { id: 'tech-stack',   label: 'Tech Stack',           icon: <Layers className="w-4 h-4" /> },
  { id: 'chain-config', label: 'Chain Configuration',  icon: <Database className="w-4 h-4" /> },
  { id: 'modules',      label: 'Custom Modules',       icon: <Package className="w-4 h-4" /> },
  { id: 'cosmwasm',     label: 'Smart Contracts',      icon: <Code2 className="w-4 h-4" /> },
  { id: 'rest-api',     label: 'REST API Reference',   icon: <Globe className="w-4 h-4" /> },
  { id: 'cosmjs',       label: 'CosmJS Integration',   icon: <GitBranch className="w-4 h-4" /> },
  { id: 'cli',          label: 'CLI Reference',        icon: <Terminal className="w-4 h-4" /> },
  { id: 'validator',    label: 'Running a Validator',  icon: <Cpu className="w-4 h-4" /> },
  { id: 'faucet',       label: 'Faucet',               icon: <Zap className="w-4 h-4" /> },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionDivider() {
  return <hr className="border-[#2a1f5c] my-12" />;
}

function SectionHeading({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-6 scroll-mt-24">
      <div className="w-9 h-9 rounded-lg bg-[#7c3aed]/10 border border-[#7c3aed]/30 flex items-center justify-center text-[#00d4ff] flex-shrink-0">
        {icon}
      </div>
      <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
    </div>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#2a1f5c] mb-6">
      <div className="flex items-center justify-between bg-[#0a0618] px-4 py-2.5 border-b border-[#2a1f5c]">
        <span className="text-xs text-white/30 font-mono uppercase tracking-widest">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white transition-colors px-3 py-1 rounded bg-white/5 hover:bg-white/10"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-[#0a0618] p-5 overflow-x-auto">
        <code className="text-sm font-mono leading-relaxed text-[#e2e8f0] whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-6 rounded-xl border border-[#2a1f5c]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1a1040] border-b border-[#2a1f5c]">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-white/30 font-bold uppercase tracking-wider text-xs">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-[#2a1f5c]/40 last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-white/50 align-top">
                  {cell.startsWith('`') && cell.endsWith('`') ? (
                    <code className="font-mono text-[#00d4ff] bg-[#00d4ff]/5 px-2 py-0.5 rounded text-xs">
                      {cell.slice(1, -1)}
                    </code>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[#7c3aed]/20 border border-[#7c3aed]/30 text-[#00d4ff] text-xs font-mono px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/5 p-4 mb-6">
      <p className="text-sm text-[#00d4ff]/80">{children}</p>
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#d4a017]/30 bg-[#d4a017]/5 p-4 mb-6">
      <p className="text-sm text-[#d4a017]/80">{children}</p>
    </div>
  );
}

// ─── Section content ──────────────────────────────────────────────────────────
function QuickStart() {
  const prereqs = [
    { name: 'Go', version: '1.21+', purpose: 'Build the chain binary' },
    { name: 'Rust', version: '1.81+', purpose: 'Compile CosmWasm contracts' },
    { name: 'Node.js', version: '20+', purpose: 'Web apps and tooling' },
    { name: 'Docker', version: 'Latest', purpose: 'Reproducible builds & local testnet' },
  ];

  const makeCode = `# Clone the repository
git clone https://github.com/tamizhi/chain
cd chain

# Build binary → outputs to build/tamizhi
make build

# Initialize the node (genesis, config, keys)
make init

# Start the local node
make start`;

  return (
    <section>
      <SectionHeading id="quick-start" icon={<Zap className="w-4 h-4" />} title="Quick Start" />
      <p className="text-white/50 mb-6 leading-relaxed">
        Get a local Tamizhi node running in under five minutes.
      </p>

      <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Prerequisites</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {prereqs.map((p) => (
          <div key={p.name} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-[#2a1f5c]">
            <div className="w-2 h-2 rounded-full bg-[#00d4ff] mt-1.5 flex-shrink-0" />
            <div>
              <div className="text-white font-bold text-sm">
                {p.name} <Badge>{p.version}</Badge>
              </div>
              <div className="text-white/30 text-xs mt-0.5">{p.purpose}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Build & Run</h3>
      <CodeBlock code={makeCode} language="bash" />

      <InfoBox>
        <strong>Note:</strong>{' '}
        <code className="font-mono text-[#00d4ff]">make build</code> produces the{' '}
        <code className="font-mono text-[#00d4ff]">build/tamizhi</code> binary. Add it to your{' '}
        <code className="font-mono text-[#00d4ff]">$PATH</code> or reference it directly.
      </InfoBox>
    </section>
  );
}

function TechStack() {
  const rows = [
    ['Blockchain Framework', 'Cosmos SDK', 'v0.50.9', 'Core blockchain engine, modules, governance'],
    ['Consensus', 'CometBFT', 'v0.38.11', 'BFT consensus, 2s block time, absolute finality'],
    ['Smart Contracts', 'CosmWasm (wasmd)', 'v0.53.0', 'WASM contracts in Rust'],
    ['Cross-chain', 'IBC-go', 'v8.4.0', 'Inter-Blockchain Communication'],
    ['Encryption', 'TweetNaCl', 'v1.0.3', 'X25519 + XSalsa20-Poly1305 E2E encryption'],
    ['Mobile', 'Expo / React Native', 'SDK 52', 'iOS + Android cross-platform apps'],
    ['Web', 'Next.js', '14.2.4', 'Web app, explorer, and marketing site'],
  ];

  return (
    <section>
      <SectionHeading id="tech-stack" icon={<Layers className="w-4 h-4" />} title="Tech Stack" />
      <p className="text-white/50 mb-6 leading-relaxed">
        Definitive reference for the technologies powering the Tamizhi chain.
      </p>
      <div className="overflow-x-auto mb-4 rounded-xl border border-[#2a1f5c]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a1040] border-b border-[#2a1f5c]">
              {['Component', 'Technology', 'Version', 'Purpose'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-white/30 font-bold uppercase tracking-wider text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-[#2a1f5c]/40 last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-white font-semibold">{row[0]}</td>
                <td className="px-4 py-3 text-[#00d4ff] font-mono text-xs">{row[1]}</td>
                <td className="px-4 py-3"><Badge>{row[2]}</Badge></td>
                <td className="px-4 py-3 text-white/40">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChainConfig() {
  const configYaml = `chain_id: tamizhi-1
bech32_prefix: tamizhi
coin_type: 118
base_denom: utmz
display_denom: TMZ
decimals: 6  # 1 TMZ = 1,000,000 utmz
min_gas_price: 0.025utmz
block_time: ~2 seconds
unbonding_time: 21 days
max_validators: 100`;

  const endpointRows = [
    ['RPC',      'http://localhost:26657', 'CometBFT RPC — blocks, txs, status'],
    ['LCD/REST', 'http://localhost:1317',  'REST API — Cosmos SDK gRPC-gateway'],
    ['gRPC',     'localhost:9090',         'gRPC — CosmJS / SDK clients'],
    ['P2P',      'localhost:26656',        'Peer-to-peer networking'],
  ];

  return (
    <section>
      <SectionHeading id="chain-config" icon={<Database className="w-4 h-4" />} title="Chain Configuration" />
      <p className="text-white/50 mb-6 leading-relaxed">Core chain parameters for Tamizhi mainnet and local development.</p>
      <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Parameters</h3>
      <CodeBlock code={configYaml} language="yaml" />
      <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Endpoints (Local Dev)</h3>
      <DataTable headers={['Endpoint', 'URL', 'Purpose']} rows={endpointRows} />
    </section>
  );
}

function CustomModules() {
  const mods = [
    {
      key: 'x/literature',
      msgs: ['MsgPublishWork', 'MsgUpdateWork'],
      desc: 'On-chain Tamil literary work registry. Stores title, author, period, genre, IPFS CID, and content hash.',
      color: 'border-rose-800/40 bg-rose-900/10',
      icon: <BookOpen className="w-4 h-4 text-rose-400" />,
    },
    {
      key: 'x/messaging',
      msgs: ['MsgRegisterSession', 'MsgCreateGroup'],
      desc: 'Decentralized encrypted messenger sessions. E2E encrypted using TweetNaCl (X25519 + XSalsa20-Poly1305).',
      color: 'border-sky-800/40 bg-sky-900/10',
      icon: <Users className="w-4 h-4 text-sky-400" />,
    },
    {
      key: 'x/nodes',
      msgs: ['MsgRegisterNode', 'MsgUpdateNode'],
      desc: 'Service node registry. Tracks active relay and storage nodes across the network for messaging infrastructure.',
      color: 'border-violet-800/40 bg-violet-900/10',
      icon: <Cpu className="w-4 h-4 text-violet-400" />,
    },
    {
      key: 'x/rewards',
      msgs: ['MsgIssueReward', 'MsgCreateRule'],
      desc: 'Community reward distribution. Mints TMZ for verified community contributions via on-chain rules.',
      color: 'border-amber-800/40 bg-amber-900/10',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
    {
      key: 'x/identity',
      msgs: ['MsgSetIdentity'],
      desc: 'On-chain identity records linking user IDs to wallet addresses. Identity layer for accesslog and other modules.',
      color: 'border-cyan-800/40 bg-cyan-900/10',
      icon: <Globe className="w-4 h-4 text-cyan-400" />,
    },
    {
      key: 'x/security',
      msgs: ['MsgRaiseAlert', 'MsgResolveAlert'],
      desc: 'Security policy and alert management. Authorized accounts can raise and resolve security alerts stored on-chain.',
      color: 'border-red-800/40 bg-red-900/10',
      icon: <Shield className="w-4 h-4 text-red-400" />,
    },
  ];

  return (
    <section>
      <SectionHeading id="modules" icon={<Package className="w-4 h-4" />} title="Custom Modules" />
      <p className="text-white/50 mb-6 leading-relaxed">
        Tamizhi ships six custom Cosmos SDK modules under{' '}
        <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1.5 py-0.5 rounded">chain/x/</code>.
      </p>
      <div className="grid grid-cols-1 gap-4">
        {mods.map((mod) => (
          <div key={mod.key} className={`rounded-xl border ${mod.color} p-5`}>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                {mod.icon}
              </div>
              <div className="flex-1 min-w-0">
                <code className="font-mono text-sm text-white font-bold">{mod.key}</code>
                <p className="text-white/40 text-sm leading-relaxed my-2">{mod.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {mod.msgs.map((msg) => (
                    <span key={msg} className="font-mono text-xs bg-black/30 border border-white/10 text-white/40 px-2 py-0.5 rounded">
                      {msg}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CosmWasm() {
  const buildCode = `# Build contract (Rust → Wasm)
cargo build --release --target wasm32-unknown-unknown

# Validate the wasm binary
cosmwasm-check target/wasm32-unknown-unknown/release/my_contract.wasm`;

  const deployCode = `# Store contract on-chain
tamizhi tx wasm store contract.wasm \\
  --from validator --chain-id tamizhi-1 \\
  --gas auto --fees 5000utmz --keyring-backend test -y

# Instantiate (use code_id from previous tx)
tamizhi tx wasm instantiate $CODE_ID '{}' \\
  --label "my-contract" --admin tamizhi1... \\
  --from validator --chain-id tamizhi-1 \\
  --gas auto --fees 5000utmz -y`;

  return (
    <section>
      <SectionHeading id="cosmwasm" icon={<Code2 className="w-4 h-4" />} title="Smart Contracts (CosmWasm)" />
      <p className="text-white/50 mb-6 leading-relaxed">
        Tamizhi supports CosmWasm v0.53.0. Contracts are written in Rust and compiled to WebAssembly
        targeting{' '}
        <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1.5 py-0.5 rounded">
          wasm32-unknown-unknown
        </code>.
      </p>
      <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Build & Validate</h3>
      <CodeBlock code={buildCode} language="bash" />
      <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Deploy</h3>
      <CodeBlock code={deployCode} language="bash" />
      <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Bundled Contracts</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {['payments', 'rewards', 'access_control'].map((c) => (
          <div key={c} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-[#2a1f5c]">
            <Code2 className="w-4 h-4 text-[#7c3aed] flex-shrink-0" />
            <code className="font-mono text-sm text-white">{c}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

function RestApi() {
  const rows = [
    ['GET',  '/cosmos/bank/v1beta1/balances/{address}',           'Get TMZ balance for address'],
    ['GET',  '/cosmos/staking/v1beta1/validators',                 'List all validators'],
    ['GET',  '/cosmos/gov/v1/proposals',                           'List governance proposals'],
    ['GET',  '/tamizhi/literature/v1/works',                       'List on-chain literary works'],
    ['GET',  '/cosmos/base/tendermint/v1beta1/blocks/latest',      'Latest block information'],
    ['POST', '/cosmos/tx/v1beta1/txs',                             'Broadcast a signed transaction'],
    ['GET',  '/cosmos/tx/v1beta1/txs/{hash}',                     'Query transaction by hash'],
  ];

  const methodColor = (m: string) =>
    m === 'GET'
      ? 'text-emerald-400 bg-emerald-900/20 border-emerald-800/40'
      : 'text-sky-400 bg-sky-900/20 border-sky-800/40';

  return (
    <section>
      <SectionHeading id="rest-api" icon={<Globe className="w-4 h-4" />} title="REST API Reference" />
      <p className="text-white/50 mb-6 leading-relaxed">
        The LCD exposes a gRPC-gateway REST API at{' '}
        <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1.5 py-0.5 rounded">
          http://localhost:1317
        </code>. All Cosmos SDK and custom Tamizhi modules are reachable here.
      </p>
      <div className="overflow-x-auto rounded-xl border border-[#2a1f5c]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a1040] border-b border-[#2a1f5c]">
              {['Method', 'Path', 'Description'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-white/30 font-bold uppercase tracking-wider text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-[#2a1f5c]/40 last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <span className={`font-mono text-xs font-bold border px-2 py-0.5 rounded ${methodColor(row[0])}`}>
                    {row[0]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#00d4ff]/80 break-all">{row[1]}</td>
                <td className="px-4 py-3 text-white/40">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CosmJS() {
  const code = `import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

const RPC       = 'http://localhost:26657';
const CHAIN_ID  = 'tamizhi-1';
const GAS_PRICE = GasPrice.fromString('0.025utmz');

// Connect with mnemonic
const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
  prefix: 'tamizhi',
});

const client = await SigningStargateClient.connectWithSigner(RPC, wallet, {
  gasPrice: GAS_PRICE,
});

// Send 1 TMZ (= 1,000,000 utmz)
const result = await client.sendTokens(
  fromAddress,
  toAddress,
  [{ denom: 'utmz', amount: '1000000' }],
  'auto',
  'Sent via CosmJS'
);

console.log('TX hash:', result.transactionHash);`;

  return (
    <section>
      <SectionHeading id="cosmjs" icon={<GitBranch className="w-4 h-4" />} title="CosmJS Integration" />
      <p className="text-white/50 mb-4 leading-relaxed">
        Use <strong className="text-white">CosmJS</strong> to interact with Tamizhi from browser or Node.js.
        Install with{' '}
        <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1.5 py-0.5 rounded">
          npm install @cosmjs/stargate @cosmjs/proto-signing
        </code>.
      </p>
      <CodeBlock code={code} language="typescript" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {[
          { pkg: '@cosmjs/stargate', desc: 'High-level client, bank, staking, governance' },
          { pkg: '@cosmjs/proto-signing', desc: 'Wallet, key management, transaction signing' },
          { pkg: '@cosmjs/cosmwasm-stargate', desc: 'CosmWasm smart contract interaction' },
        ].map((p) => (
          <div key={p.pkg} className="p-3 rounded-xl bg-white/[0.03] border border-[#2a1f5c]">
            <code className="font-mono text-xs text-[#00d4ff] block mb-1">{p.pkg}</code>
            <p className="text-white/30 text-xs">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CliReference() {
  const rows = [
    ['`tamizhi status`',                           'Node status and latest block'],
    ['`tamizhi keys add mykey`',                    'Create new key (mnemonic)'],
    ['`tamizhi keys list`',                         'List all local keys'],
    ['`tamizhi q bank balances <addr>`',            'Query TMZ balance'],
    ['`tamizhi tx bank send <from> <to> <amt>utmz`','Send TMZ tokens'],
    ['`tamizhi q gov proposals`',                   'List governance proposals'],
    ['`tamizhi tx gov submit-proposal ...`',         'Submit governance proposal'],
    ['`tamizhi q wasm list-code`',                  'List uploaded CosmWasm contracts'],
    ['`tamizhi q literature works`',                'List on-chain literary works'],
    ['`tamizhi tx literature publish-work ...`',    'Publish a new Tamil work on-chain'],
  ];

  return (
    <section>
      <SectionHeading id="cli" icon={<Terminal className="w-4 h-4" />} title="CLI Reference" />
      <p className="text-white/50 mb-6 leading-relaxed">
        Common commands using the{' '}
        <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1.5 py-0.5 rounded">tamizhi</code>{' '}
        binary.
      </p>
      <DataTable headers={['Command', 'Description']} rows={rows} />
      <InfoBox>
        Append{' '}
        <code className="font-mono text-[#00d4ff]">--node tcp://localhost:26657</code> to any command
        if your RPC port differs from the default.
      </InfoBox>
    </section>
  );
}

function ValidatorGuide() {
  const createCmd = `tamizhi tx staking create-validator \\
  --amount 1000000utmz \\
  --pubkey $(tamizhi tendermint show-validator) \\
  --moniker "my-validator" \\
  --commission-rate 0.1 \\
  --commission-max-rate 0.2 \\
  --commission-max-change-rate 0.01 \\
  --min-self-delegation 1 \\
  --from validator \\
  --chain-id tamizhi-1 \\
  --gas auto \\
  --fees 5000utmz \\
  --keyring-backend test -y`;

  const steps = [
    {
      num: '01',
      title: 'Build & Initialize',
      desc: (
        <>
          Run{' '}
          <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1 py-0.5 rounded">
            make build && make init
          </code>{' '}
          to compile and scaffold your node under{' '}
          <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1 py-0.5 rounded">~/.tamizhi</code>.
        </>
      ),
    },
    {
      num: '02',
      title: 'Get Peer Info',
      desc: (
        <>
          Run{' '}
          <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1 py-0.5 rounded">
            tamizhi tendermint show-node-id
          </code>{' '}
          and share <code className="text-white/60 font-mono">&lt;id&gt;@&lt;ip&gt;:26656</code> with peers.
        </>
      ),
    },
    {
      num: '03',
      title: 'Create Validator',
      desc: 'Submit the create-validator transaction shown below.',
    },
    {
      num: '04',
      title: 'Monitor',
      desc: (
        <>
          Use{' '}
          <code className="font-mono text-[#00d4ff] text-xs bg-[#00d4ff]/5 px-1 py-0.5 rounded">
            tamizhi status
          </code>{' '}
          to check sync status and latest block height.
        </>
      ),
    },
  ];

  return (
    <section>
      <SectionHeading id="validator" icon={<Cpu className="w-4 h-4" />} title="Running a Validator" />
      <p className="text-white/50 mb-6 leading-relaxed">
        Validators secure the network via CometBFT BFT consensus. Minimum self-delegation: 1 TMZ.
        Up to 100 validators active at any time.
      </p>
      <div className="space-y-4 mb-6">
        {steps.map((step) => (
          <div key={step.num} className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-[#2a1f5c]">
            <div className="text-[#00d4ff] font-black text-lg font-mono flex-shrink-0 mt-0.5 w-7">{step.num}</div>
            <div>
              <div className="text-white font-bold mb-1">{step.title}</div>
              <div className="text-white/40 text-sm leading-relaxed">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <CodeBlock code={createCmd} language="bash" />
    </section>
  );
}

function Faucet() {
  return (
    <section>
      <SectionHeading id="faucet" icon={<Zap className="w-4 h-4" />} title="Faucet" />
      <p className="text-white/50 mb-6 leading-relaxed">
        The faucet dispenses test TMZ for local development and testnet use. Never use on mainnet.
      </p>
      <WarnBox>
        <strong>Testnet and local development only.</strong> Mainnet tokens have real value. Never
        use the faucet against a production chain.
      </WarnBox>
      <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Local Faucet</h3>
      <CodeBlock code="bash chain/scripts/faucet.sh <your-tamizhi-address>" language="bash" />
      <div className="p-4 rounded-xl bg-white/[0.03] border border-[#2a1f5c]">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-[#00d4ff] flex-shrink-0" />
          <div>
            <div className="text-white font-bold">10 TMZ per request</div>
            <div className="text-white/30 text-sm">
              = 10,000,000 utmz. One request per address per session.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('quick-start');
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setMobileSectionOpen(false);
  };

  const activeSectionLabel = sections.find((s) => s.id === activeSection)?.label ?? 'Sections';

  return (
    <div className="min-h-screen bg-[#0e0824] text-[#fdf6e3] flex flex-col">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative pt-28 pb-14 px-4 text-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.2) 0%, transparent 70%)' }}
      >
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#7c3aed]/10 border border-[#7c3aed]/30 text-[#00d4ff] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <Code2 className="w-3.5 h-3.5" />
            Developer Documentation
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-3 tracking-tight">
            Developer Docs
          </h1>
          <p className="tamil-text text-xl text-[#d4a017] mb-4 font-bold">
            டெவலப்பர் ஆவணங்கள்
          </p>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Everything you need to build on Tamizhi — from running a local node to deploying smart
            contracts and integrating with the chain.
          </p>
        </div>
      </div>

      {/* ── MOBILE SECTION DROPDOWN ───────────────────────────────────────── */}
      <div className="lg:hidden sticky top-16 z-30 bg-[#0e0824] border-b border-[#2a1f5c]">
        <div className="relative px-4 py-2">
          <button
            onClick={() => setMobileSectionOpen(!mobileSectionOpen)}
            className="flex items-center justify-between w-full bg-white/[0.03] border border-[#2a1f5c] rounded-lg px-4 py-2.5 text-sm text-white font-bold"
          >
            <span className="flex items-center gap-2">
              {sections.find((s) => s.id === activeSection)?.icon}
              {activeSectionLabel}
            </span>
            <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${mobileSectionOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileSectionOpen && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-[#0a0618] border border-[#2a1f5c] rounded-xl shadow-2xl z-50 overflow-hidden">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`flex items-center gap-3 w-full text-left px-4 py-3 text-sm transition-colors border-b border-[#2a1f5c]/50 last:border-0 ${
                    activeSection === s.id
                      ? 'bg-[#7c3aed]/20 text-[#00d4ff] font-bold'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28">
              <p className="text-xs text-white/30 font-bold uppercase tracking-widest mb-4 px-3">
                On this page
              </p>
              <nav className="space-y-0.5">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      activeSection === s.id
                        ? 'bg-[#7c3aed]/20 text-[#00d4ff] font-bold border border-[#7c3aed]/30'
                        : 'text-white/30 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={activeSection === s.id ? 'text-[#00d4ff]' : 'text-white/20'}>
                      {s.icon}
                    </span>
                    {s.label}
                  </button>
                ))}
              </nav>

              {/* Chain quick-ref */}
              <div className="mt-8 p-4 rounded-xl bg-white/[0.03] border border-[#2a1f5c]">
                <p className="text-xs text-white/30 mb-2 font-bold uppercase tracking-wider">Chain ID</p>
                <code className="font-mono text-sm text-[#00d4ff]">tamizhi-1</code>
                <p className="text-xs text-white/30 mt-3 mb-2 font-bold uppercase tracking-wider">Token</p>
                <code className="font-mono text-sm text-[#00d4ff]">TMZ / utmz</code>
                <p className="text-xs text-white/30 mt-3 mb-2 font-bold uppercase tracking-wider">Prefix</p>
                <code className="font-mono text-sm text-[#00d4ff]">tamizhi</code>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 max-w-4xl">
            <QuickStart />
            <SectionDivider />
            <TechStack />
            <SectionDivider />
            <ChainConfig />
            <SectionDivider />
            <CustomModules />
            <SectionDivider />
            <CosmWasm />
            <SectionDivider />
            <RestApi />
            <SectionDivider />
            <CosmJS />
            <SectionDivider />
            <CliReference />
            <SectionDivider />
            <ValidatorGuide />
            <SectionDivider />
            <Faucet />
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
