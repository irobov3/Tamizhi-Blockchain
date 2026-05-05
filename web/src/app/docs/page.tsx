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
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// ─── Sidebar sections ─────────────────────────────────────────────────────────

const sections: Section[] = [
  { id: 'quick-start',    label: 'Quick Start',        icon: <Zap className="w-4 h-4" /> },
  { id: 'tech-stack',     label: 'Tech Stack',         icon: <Layers className="w-4 h-4" /> },
  { id: 'chain-config',   label: 'Chain Configuration',icon: <Database className="w-4 h-4" /> },
  { id: 'modules',        label: 'Custom Modules',     icon: <Package className="w-4 h-4" /> },
  { id: 'cosmwasm',       label: 'Smart Contracts',    icon: <Code2 className="w-4 h-4" /> },
  { id: 'rest-api',       label: 'REST API Reference', icon: <Globe className="w-4 h-4" /> },
  { id: 'cosmjs',         label: 'CosmJS Integration', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'cli-reference',  label: 'CLI Reference',      icon: <Terminal className="w-4 h-4" /> },
  { id: 'validator',      label: 'Running a Validator',icon: <Cpu className="w-4 h-4" /> },
  { id: 'faucet',         label: 'Faucet',             icon: <Zap className="w-4 h-4" /> },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider() {
  return <hr className="border-white/10 my-12" />;
}

function SectionHeading({
  id,
  icon,
  title,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div id={id} className="flex items-center gap-3 mb-6 scroll-mt-24">
      <div className="w-9 h-9 rounded-lg bg-primary-900/60 border border-primary-700/50 flex items-center justify-center text-primary-400 flex-shrink-0">
        {icon}
      </div>
      <h2 className="text-2xl font-black text-white tracking-wide">{title}</h2>
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
    <div className="relative rounded-xl overflow-hidden border border-white/10 mb-6">
      <div className="flex items-center justify-between bg-[#0a0a1a] px-4 py-2 border-b border-white/10">
        <span className="text-xs text-text-muted font-mono uppercase tracking-widest">{language}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-text-muted hover:text-white transition-colors px-3 py-1 rounded bg-white/5 hover:bg-white/10"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-[#0a0a1a] p-5 overflow-x-auto">
        <code className="text-sm font-mono leading-relaxed text-[#e2e8f0] whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-6 rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/5 border-b border-white/10">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-text-muted font-bold uppercase tracking-wider text-xs">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-text-secondary align-top">
                  {cell.startsWith('`') && cell.endsWith('`') ? (
                    <code className="font-mono text-primary-400 bg-primary-900/20 px-2 py-0.5 rounded text-xs">
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
    <span className="inline-block bg-primary-900/40 border border-primary-700/40 text-primary-400 text-xs font-mono px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

// ─── Section content components ───────────────────────────────────────────────

function QuickStart() {
  const prereqs = [
    { name: 'Go', version: '1.21+', purpose: 'Build the chain binary' },
    { name: 'Rust', version: '1.81+', purpose: 'Compile CosmWasm contracts' },
    { name: 'Node.js', version: '20+', purpose: 'Web app and tooling' },
    { name: 'Docker', version: 'Latest', purpose: 'Reproducible builds and local testnet' },
  ];

  const makeCommands = `# Clone the repository
git clone https://github.com/tamizhi/chain
cd chain

# Build the binary → outputs to build/tamizhi
make build

# Initialize the node (genesis, config, keys)
make init

# Start the local node
make start`;

  return (
    <section>
      <SectionHeading id="quick-start" icon={<Zap className="w-4 h-4" />} title="Quick Start" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        Get a local Tamizhi node running in under five minutes. All you need is the prerequisites
        installed and a working internet connection.
      </p>

      <h3 className="text-white font-bold mb-3 text-base uppercase tracking-wider">Prerequisites</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {prereqs.map((p) => (
          <div
            key={p.name}
            className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10"
          >
            <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
            <div>
              <div className="text-white font-bold text-sm">
                {p.name} <Badge>{p.version}</Badge>
              </div>
              <div className="text-text-muted text-xs mt-0.5">{p.purpose}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-white font-bold mb-3 text-base uppercase tracking-wider">Build & Run</h3>
      <CodeBlock code={makeCommands} language="bash" />

      <div className="rounded-xl border border-primary-800/50 bg-primary-900/10 p-4">
        <p className="text-sm text-primary-300">
          <strong>Note:</strong> <code className="font-mono text-primary-400">make build</code> produces the{' '}
          <code className="font-mono text-primary-400">build/tamizhi</code> binary. Add it to your{' '}
          <code className="font-mono text-primary-400">$PATH</code> or reference it directly.
        </p>
      </div>
    </section>
  );
}

function TechStack() {
  const rows = [
    ['Blockchain Framework', 'Cosmos SDK', 'v0.50.9', 'Core blockchain engine, modules, governance'],
    ['Consensus', 'CometBFT', 'v0.38.11', 'Byzantine Fault Tolerant consensus, 2s block time'],
    ['Smart Contracts', 'CosmWasm (wasmd)', 'v0.53.0', 'WASM smart contract execution in Rust'],
    ['Cross-chain', 'IBC-go', 'v8.4.0', 'Inter-Blockchain Communication protocol'],
    ['Encryption', 'TweetNaCl', 'v1.0.3', 'X25519 + XSalsa20-Poly1305 E2E encryption'],
    ['Mobile', 'Expo / React Native', 'SDK 52', 'Cross-platform iOS + Android apps'],
    ['Web', 'Next.js', '14.2.4', 'Web app and explorer'],
  ];

  return (
    <section>
      <SectionHeading id="tech-stack" icon={<Layers className="w-4 h-4" />} title="Tech Stack" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        This is the definitive reference for the underlying technologies powering the Tamizhi chain.
      </p>

      <div className="overflow-x-auto mb-4 rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {['Component', 'Technology', 'Version', 'Purpose'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-text-muted font-bold uppercase tracking-wider text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3 text-white font-semibold">{row[0]}</td>
                <td className="px-4 py-3 text-primary-400 font-mono text-xs">{row[1]}</td>
                <td className="px-4 py-3">
                  <Badge>{row[2]}</Badge>
                </td>
                <td className="px-4 py-3 text-text-secondary">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-text-muted text-sm italic">
        Tamizhi builds on these proven foundations and adds a fully custom module stack on top.
      </p>
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
    ['RPC', 'http://localhost:26657', 'CometBFT RPC — blocks, txs, status'],
    ['LCD / REST', 'http://localhost:1317', 'REST API — Cosmos SDK gRPC-gateway'],
    ['gRPC', 'localhost:9090', 'gRPC — for CosmJS / SDK clients'],
    ['P2P', 'localhost:26656', 'Peer-to-peer networking'],
  ];

  return (
    <section>
      <SectionHeading id="chain-config" icon={<Database className="w-4 h-4" />} title="Chain Configuration" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        Core chain parameters for the Tamizhi mainnet and local development.
      </p>

      <h3 className="text-white font-bold mb-3 text-base uppercase tracking-wider">Parameters</h3>
      <CodeBlock code={configYaml} language="yaml" />

      <h3 className="text-white font-bold mb-3 text-base uppercase tracking-wider">Endpoints (Local Dev)</h3>
      <Table
        headers={['Endpoint', 'URL', 'Purpose']}
        rows={endpointRows}
      />
    </section>
  );
}

function CustomModules() {
  const modules = [
    {
      key: 'x/literature',
      title: 'Literature',
      msgs: ['MsgPublishWork', 'MsgUpdateWork'],
      description:
        'On-chain Tamil literary work registry. Stores title, author, period, genre, IPFS CID, and content hash for immutable preservation of Tamil literary heritage.',
      color: 'from-rose-900/30 to-rose-900/10',
      border: 'border-rose-800/40',
      icon: <BookOpen className="w-4 h-4 text-rose-400" />,
    },
    {
      key: 'x/messaging',
      title: 'Messaging',
      msgs: ['MsgRegisterSession', 'MsgCreateGroup'],
      description:
        'Decentralized encrypted messenger sessions. Integrates with the nodes module for relay routing. End-to-end encrypted using TweetNaCl (X25519 + XSalsa20-Poly1305).',
      color: 'from-sky-900/30 to-sky-900/10',
      border: 'border-sky-800/40',
      icon: <Users className="w-4 h-4 text-sky-400" />,
    },
    {
      key: 'x/nodes',
      title: 'Nodes',
      msgs: ['MsgRegisterNode', 'MsgUpdateNode'],
      description:
        'Service node registry. Tracks active relay and storage nodes across the network, enabling decentralized infrastructure for messaging and data services.',
      color: 'from-violet-900/30 to-violet-900/10',
      border: 'border-violet-800/40',
      icon: <Cpu className="w-4 h-4 text-violet-400" />,
    },
    {
      key: 'x/rewards',
      title: 'Rewards',
      msgs: ['MsgIssueReward', 'MsgCreateRule'],
      description:
        'Community reward distribution. Mints TMZ tokens for verified community contributions. Rules are configured on-chain and enforced by the module keeper.',
      color: 'from-amber-900/30 to-amber-900/10',
      border: 'border-amber-800/40',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
    {
      key: 'x/accesslog',
      title: 'Access Log',
      msgs: ['MsgLogAccess'],
      description:
        'Immutable access audit log for sensitive resources. Requires an active on-chain identity before an access event can be recorded.',
      color: 'from-emerald-900/30 to-emerald-900/10',
      border: 'border-emerald-800/40',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
    },
    {
      key: 'x/identity',
      title: 'Identity',
      msgs: ['MsgSetIdentity'],
      description:
        'On-chain identity records that link employee or user IDs to wallet addresses. Provides the identity layer consumed by accesslog and other modules.',
      color: 'from-cyan-900/30 to-cyan-900/10',
      border: 'border-cyan-800/40',
      icon: <Globe className="w-4 h-4 text-cyan-400" />,
    },
    {
      key: 'x/security',
      title: 'Security',
      msgs: ['MsgRaiseAlert', 'MsgResolveAlert'],
      description:
        'Security policy and alert management. Allows authorized accounts to raise and resolve security alerts that are stored immutably on-chain.',
      color: 'from-red-900/30 to-red-900/10',
      border: 'border-red-800/40',
      icon: <Shield className="w-4 h-4 text-red-400" />,
    },
  ];

  return (
    <section>
      <SectionHeading id="modules" icon={<Package className="w-4 h-4" />} title="Custom Modules" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        Tamizhi ships seven custom Cosmos SDK modules that form the application layer of the chain.
        Each module lives in <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1.5 py-0.5 rounded">chain/x/</code> and exposes its own message types, queries, and keeper methods.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {modules.map((mod) => (
          <div
            key={mod.key}
            className={`rounded-xl border ${mod.border} bg-gradient-to-br ${mod.color} p-5`}
          >
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                {mod.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <code className="font-mono text-sm text-white font-bold">{mod.key}</code>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-3">{mod.description}</p>
                <div className="flex flex-wrap gap-2">
                  {mod.msgs.map((msg) => (
                    <span
                      key={msg}
                      className="font-mono text-xs bg-black/30 border border-white/10 text-text-secondary px-2 py-0.5 rounded"
                    >
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
  const deployCode = `# Store contract on-chain
tamizhi tx wasm store contract.wasm \\
  --from validator --chain-id tamizhi-1 \\
  --gas auto --fees 5000utmz --keyring-backend test -y

# Note the code_id from the tx response, then instantiate
tamizhi tx wasm instantiate $CODE_ID '{}' \\
  --label "my-contract" --admin tamizhi1... \\
  --from validator --chain-id tamizhi-1 \\
  --gas auto --fees 5000utmz -y`;

  const buildCode = `# Build contract (Rust → Wasm)
cargo build --release --target wasm32-unknown-unknown

# Validate the wasm binary
cosmwasm-check target/wasm32-unknown-unknown/release/my_contract.wasm`;

  return (
    <section>
      <SectionHeading id="cosmwasm" icon={<Code2 className="w-4 h-4" />} title="Smart Contracts (CosmWasm)" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        Tamizhi supports CosmWasm v0.53.0. Contracts are written in Rust and compiled to WebAssembly
        targeting the <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1.5 py-0.5 rounded">wasm32-unknown-unknown</code> target.
      </p>

      <h3 className="text-white font-bold mb-3 text-base uppercase tracking-wider">Build & Validate</h3>
      <CodeBlock code={buildCode} language="bash" />

      <h3 className="text-white font-bold mb-3 text-base uppercase tracking-wider">Deploy</h3>
      <CodeBlock code={deployCode} language="bash" />

      <h3 className="text-white font-bold mb-3 text-base uppercase tracking-wider">Bundled Contracts</h3>
      <p className="text-text-secondary mb-3 text-sm">
        The following contracts ship with the repository under{' '}
        <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1.5 py-0.5 rounded">chain/contracts/</code>:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {['payments', 'rewards', 'access_control'].map((c) => (
          <div
            key={c}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10"
          >
            <Code2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <code className="font-mono text-sm text-white">{c}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

function RestApi() {
  const rows = [
    ['GET', '/cosmos/bank/v1beta1/balances/{address}', 'Get TMZ balance'],
    ['GET', '/cosmos/staking/v1beta1/validators', 'List validators'],
    ['GET', '/cosmos/gov/v1/proposals', 'List governance proposals'],
    ['GET', '/tamizhi/literature/v1/works', 'List literary works'],
    ['POST', '/cosmos/tx/v1beta1/txs', 'Broadcast transaction'],
    ['GET', '/cosmos/base/tendermint/v1beta1/blocks/latest', 'Latest block'],
  ];

  const methodColor = (method: string) => {
    if (method === 'GET') return 'text-emerald-400 bg-emerald-900/20 border-emerald-800/40';
    if (method === 'POST') return 'text-sky-400 bg-sky-900/20 border-sky-800/40';
    return 'text-text-muted bg-white/5 border-white/10';
  };

  return (
    <section>
      <SectionHeading id="rest-api" icon={<Globe className="w-4 h-4" />} title="REST API Reference" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        The LCD (Light Client Daemon) exposes a gRPC-gateway REST API at{' '}
        <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1.5 py-0.5 rounded">http://localhost:1317</code>.
        All Cosmos SDK modules and custom Tamizhi modules are reachable through this API.
      </p>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {['Method', 'Path', 'Description'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-text-muted font-bold uppercase tracking-wider text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3">
                  <span className={`font-mono text-xs font-bold border px-2 py-0.5 rounded ${methodColor(row[0])}`}>
                    {row[0]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-primary-300 break-all">{row[1]}</td>
                <td className="px-4 py-3 text-text-secondary">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CosmJsIntegration() {
  const code = `import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

const RPC      = 'http://localhost:26657';
const CHAIN_ID = 'tamizhi-1';
const GAS_PRICE = GasPrice.fromString('0.025utmz');

// Connect with mnemonic
const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
  prefix: 'tamizhi',
});

const client = await SigningStargateClient.connectWithSigner(RPC, wallet, {
  gasPrice: GAS_PRICE,
});

// Send TMZ
const result = await client.sendTokens(
  fromAddress,
  toAddress,
  [{ denom: 'utmz', amount: '1000000' }], // 1 TMZ = 1,000,000 utmz
  'auto',
  'memo'
);

console.log('TX hash:', result.transactionHash);`;

  return (
    <section>
      <SectionHeading id="cosmjs" icon={<GitBranch className="w-4 h-4" />} title="CosmJS Integration" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        Use <strong className="text-white">CosmJS</strong> to interact with Tamizhi from browser or Node.js
        applications. Install with{' '}
        <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1.5 py-0.5 rounded">
          npm install @cosmjs/stargate @cosmjs/proto-signing
        </code>.
      </p>

      <CodeBlock code={code} language="typescript" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {[
          { pkg: '@cosmjs/stargate', desc: 'High-level client, bank, staking, gov' },
          { pkg: '@cosmjs/proto-signing', desc: 'Wallet, key management, signing' },
          { pkg: '@cosmjs/cosmwasm-stargate', desc: 'CosmWasm contract interaction' },
        ].map((p) => (
          <div key={p.pkg} className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <code className="font-mono text-xs text-primary-400 block mb-1">{p.pkg}</code>
            <p className="text-text-muted text-xs">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CliReference() {
  const rows = [
    ['`tamizhi status`', 'Node status and latest block'],
    ['`tamizhi keys add mykey`', 'Create new key'],
    ['`tamizhi keys list`', 'List all keys'],
    ['`tamizhi q bank balances <addr>`', 'Query balance'],
    ['`tamizhi tx bank send <from> <to> <amount>utmz`', 'Send TMZ'],
    ['`tamizhi q gov proposals`', 'List proposals'],
    ['`tamizhi tx gov submit-proposal ...`', 'Submit governance proposal'],
    ['`tamizhi q wasm list-code`', 'List uploaded contracts'],
  ];

  return (
    <section>
      <SectionHeading id="cli-reference" icon={<Terminal className="w-4 h-4" />} title="CLI Reference" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        Common commands for interacting with a running Tamizhi node via the{' '}
        <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1.5 py-0.5 rounded">tamizhi</code> binary.
      </p>

      <Table headers={['Command', 'Description']} rows={rows} />

      <div className="rounded-xl border border-primary-800/50 bg-primary-900/10 p-4 mt-2">
        <p className="text-sm text-primary-300">
          Append{' '}
          <code className="font-mono text-primary-400">--node tcp://localhost:26657</code> to any command if
          your RPC is not running on the default port.
        </p>
      </div>
    </section>
  );
}

function ValidatorGuide() {
  const createValidatorCmd = `tamizhi tx staking create-validator \\
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
      title: 'Build and initialize',
      detail: (
        <>
          Run <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1 py-0.5 rounded">make build && make init</code> to compile the binary and scaffold the node directory under{' '}
          <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1 py-0.5 rounded">~/.tamizhi</code>.
        </>
      ),
    },
    {
      num: '02',
      title: 'Get your peer info',
      detail: (
        <>
          Run{' '}
          <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1 py-0.5 rounded">tamizhi tendermint show-node-id</code>{' '}
          to get your peer ID. Share <span className="text-white font-mono">&lt;node-id&gt;@&lt;ip&gt;:26656</span> with other validators.
        </>
      ),
    },
    {
      num: '03',
      title: 'Create validator transaction',
      detail: 'Submit the create-validator transaction using the command below.',
    },
    {
      num: '04',
      title: 'Monitor your validator',
      detail: (
        <>
          Use{' '}
          <code className="font-mono text-primary-400 text-xs bg-primary-900/20 px-1 py-0.5 rounded">tamizhi status</code>{' '}
          to check your node sync status and latest block height.
        </>
      ),
    },
  ];

  return (
    <section>
      <SectionHeading id="validator" icon={<Cpu className="w-4 h-4" />} title="Running a Validator" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        Validators secure the Tamizhi network via CometBFT BFT consensus. A minimum self-delegation of
        1 TMZ is required. Up to 100 validators are active at any time.
      </p>

      <div className="space-y-4 mb-6">
        {steps.map((step) => (
          <div key={step.num} className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-primary-600 font-black text-lg font-mono flex-shrink-0 mt-0.5">{step.num}</div>
            <div>
              <div className="text-white font-bold mb-1">{step.title}</div>
              <div className="text-text-secondary text-sm leading-relaxed">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <CodeBlock code={createValidatorCmd} language="bash" />
    </section>
  );
}

function Faucet() {
  return (
    <section>
      <SectionHeading id="faucet" icon={<Zap className="w-4 h-4" />} title="Faucet" />
      <p className="text-text-secondary mb-6 leading-relaxed">
        The faucet dispenses test TMZ tokens for local development and testnet use. Do not use it on
        mainnet — the script targets whichever chain your node is configured for.
      </p>

      <div className="rounded-xl border border-amber-800/40 bg-amber-900/10 p-4 mb-6">
        <p className="text-sm text-amber-300 font-semibold">For testnet and local development only.</p>
        <p className="text-sm text-amber-400 mt-1">
          Mainnet tokens have real value. Never use a faucet against a production chain.
        </p>
      </div>

      <h3 className="text-white font-bold mb-3 text-base uppercase tracking-wider">Local faucet</h3>
      <CodeBlock code="bash chain/scripts/faucet.sh <your-tamizhi-address>" language="bash" />

      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <div>
            <div className="text-white font-bold">10 TMZ per request</div>
            <div className="text-text-muted text-sm">
              Equivalent to 10,000,000 utmz. One request per address per session.
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
    const sectionIds = sections.map((s) => s.id);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 96;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setMobileSectionOpen(false);
  };

  const activeSectionLabel = sections.find((s) => s.id === activeSection)?.label ?? 'Sections';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0D0D1A' }}>
      <Navbar />

      {/* Hero */}
      <div
        className="relative pt-32 pb-16 px-4 text-center overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(213,0,0,0.15) 0%, transparent 70%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(255,255,255,0.5) 31px, rgba(255,255,255,0.5) 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(255,255,255,0.5) 31px, rgba(255,255,255,0.5) 32px)',
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary-900/30 border border-primary-700/40 text-primary-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <Code2 className="w-3.5 h-3.5" />
            Developer Documentation
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">
            Developer Docs
          </h1>
          <p className="tamil-text text-xl text-primary-400 mb-4 font-bold">
            டெவலப்பர் ஆவணங்கள்
          </p>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Everything you need to build on Tamizhi — from running a local node to deploying smart
            contracts and integrating with the chain.
          </p>
        </div>
      </div>

      {/* Mobile tab row */}
      <div className="lg:hidden sticky top-16 z-30 bg-[#0D0D1A] border-b border-white/10 shadow-lg">
        <div className="relative px-4 py-2">
          <button
            onClick={() => setMobileSectionOpen(!mobileSectionOpen)}
            className="flex items-center justify-between w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-bold"
          >
            <span className="flex items-center gap-2">
              {sections.find((s) => s.id === activeSection)?.icon}
              {activeSectionLabel}
            </span>
            <svg
              className={`w-4 h-4 text-text-muted transition-transform ${mobileSectionOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {mobileSectionOpen && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-[#0a0a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`flex items-center gap-3 w-full text-left px-4 py-3 text-sm transition-colors border-b border-white/5 last:border-0 ${
                    activeSection === s.id
                      ? 'bg-primary-900/30 text-primary-400 font-bold'
                      : 'text-text-secondary hover:text-white hover:bg-white/5'
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

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28">
              <p className="text-xs text-text-muted font-bold uppercase tracking-widest mb-4 px-3">
                On this page
              </p>
              <nav className="space-y-0.5">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      activeSection === s.id
                        ? 'bg-primary-900/40 text-primary-400 font-bold border border-primary-800/40'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={activeSection === s.id ? 'text-primary-400' : 'text-text-muted'}>
                      {s.icon}
                    </span>
                    {s.label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xs text-text-muted mb-2 font-bold uppercase tracking-wider">Chain ID</p>
                <code className="font-mono text-sm text-primary-400">tamizhi-1</code>
                <p className="text-xs text-text-muted mt-3 mb-2 font-bold uppercase tracking-wider">Token</p>
                <code className="font-mono text-sm text-primary-400">TMZ / utmz</code>
                <p className="text-xs text-text-muted mt-3 mb-2 font-bold uppercase tracking-wider">Prefix</p>
                <code className="font-mono text-sm text-primary-400">tamizhi</code>
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
            <CosmJsIntegration />
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
