'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Shield,
  Globe,
  Zap,
  Database,
  Code2,
  Users,
  Lock,
  ChevronRight,
  Brain,
  Cpu,
  Activity,
  FileText,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

// ─── Table of Contents ───────────────────────────────────────────────────────
const toc = [
  { id: 'abstract', number: '0', title: 'Abstract', tamil: 'சுருக்கம்' },
  { id: 'introduction', number: '1', title: 'Introduction', tamil: 'அறிமுகம்' },
  { id: 'vision', number: '2', title: 'Vision', tamil: 'தொலைநோக்கு' },
  { id: 'architecture', number: '3', title: 'Technology Architecture', tamil: 'தொழில்நுட்பம்' },
  { id: 'tamil-ai', number: '4', title: 'Tamil + AI', tamil: 'தமிழ் + AI' },
  { id: 'tokenomics', number: '5', title: 'Tokenomics', tamil: 'டோக்கன்' },
  { id: 'governance', number: '6', title: 'Governance', tamil: 'ஆட்சி' },
  { id: 'roadmap', number: '7', title: 'Roadmap', tamil: 'வழிமாப்பு' },
  { id: 'team', number: '8', title: 'Team', tamil: 'குழு' },
  { id: 'disclaimer', number: '9', title: 'Legal Disclaimer', tamil: 'சட்டப் பொறுப்புத் துறப்பு' },
];

// ─── Helper components ────────────────────────────────────────────────────────
function Section({
  id,
  number,
  title,
  tamil,
  children,
}: {
  id: string;
  number: string;
  title: string;
  tamil: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-28">
      <div className="flex items-baseline gap-4 mb-6 border-b border-white/8 pb-4">
        <span className="text-primary-400 font-mono text-sm flex-shrink-0">{number}.</span>
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="tamil-text text-primary-400 text-sm mt-0.5">{tamil}</p>
        </div>
      </div>
      <div className="space-y-4 text-text-secondary leading-relaxed">{children}</div>
    </section>
  );
}

function Callout({ type = 'info', children }: { type?: 'info' | 'warning' | 'code'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-primary-500/6 border-primary-500/20 text-text-secondary',
    warning: 'bg-yellow-500/6 border-yellow-500/20 text-text-secondary',
    code: 'bg-[#0A0A16] border-white/10 text-green-300 font-mono text-sm',
  };
  return (
    <div className={`my-5 p-4 rounded-xl border leading-relaxed text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto my-5 rounded-xl border border-white/8">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 bg-[#13131F]">
            {headers.map((h) => (
              <th key={h} className="text-left px-5 py-3 text-text-secondary font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/2'} hover:bg-white/3 transition-colors`}>
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-3 text-text-secondary">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sticky ToC (desktop) ─────────────────────────────────────────────────────
function TableOfContents() {
  const [activeId, setActiveId] = useState('abstract');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: '-20% 0% -70% 0%' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <aside className="hidden xl:block w-56 flex-shrink-0">
      <div className="sticky top-28">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">Contents</p>
        <nav className="space-y-0.5">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${
                activeId === item.id
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/3'
              }`}
            >
              <span className="font-mono text-xs w-5 flex-shrink-0 text-center">{item.number}</span>
              <span className="leading-tight">{item.title}</span>
              {activeId === item.id && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
            </a>
          ))}
        </nav>

        <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
          <div>
            <p className="text-xs text-text-muted mb-0.5">Version</p>
            <p className="text-sm text-white font-mono">v1.2.0</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">Published</p>
            <p className="text-sm text-text-secondary">May 2026</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">Chain</p>
            <p className="text-sm text-text-secondary font-mono">tamizhi-1</p>
          </div>
          <a
            href="https://github.com/tamizhi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary-400 hover:text-primary-300 transition-colors text-xs"
          >
            <Code2 className="w-3 h-3" /> GitHub
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </aside>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-[#0D0D1A] overflow-x-hidden">
      <Navbar />

      {/* Document header */}
      <div className="pt-28 pb-0 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 pb-10 border-b border-white/8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
              <FileText className="w-3.5 h-3.5" />
              Technical Whitepaper · v1.2.0 · May 2026
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
              <h1 className="text-5xl sm:text-6xl font-bold text-white">
                Tamizhi
              </h1>
              <span className="tamil-text text-4xl sm:text-5xl font-bold text-primary-400">
                தமிழி
              </span>
            </div>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl leading-relaxed">
              The World&apos;s First Tamil AI Blockchain Ecosystem — A Purpose-Built Sovereign Chain
              for Tamil Language, Culture, and Community.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Database, label: 'Tamizhi Core', sub: 'Sovereign Chain' },
                { icon: Shield, label: 'Tamizhi VM', sub: 'WASM Contracts' },
                { icon: Globe, label: 'Bridge Protocol', sub: 'Cross-Chain' },
                { icon: Zap, label: 'BFT Consensus', sub: 'v0.38.11' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="p-3.5 rounded-xl bg-[#13131F] border border-white/8 text-center">
                  <Icon className="w-5 h-5 text-primary-400 mx-auto mb-1.5" />
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-text-muted text-xs font-mono">{sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content area with sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto flex gap-12">
          <TableOfContents />

          <main className="flex-1 min-w-0 max-w-3xl">
            {/* ── 0. Abstract ────────────────────────────────────────────── */}
            <Section id="abstract" number="0" title="Abstract" tamil="சுருக்கம்">
              <p>
                Tamizhi is a purpose-built sovereign blockchain designed
                specifically for the Tamil-speaking global community. It combines three
                transformative technologies: decentralized blockchain infrastructure, AI language
                modeling trained on Tamil corpus, and encrypted peer-to-peer communication — all
                unified under a community-owned, community-governed network.
              </p>
              <p>
                The native token <strong className="text-white">TMZ</strong> (base denomination:{' '}
                <code className="text-primary-300 bg-primary-500/10 px-1.5 py-0.5 rounded font-mono text-sm">utmz</code>)
                powers gas fees, on-chain governance, validator incentives, and literary NFT
                operations. The total supply is fixed at 1,000,000,000 TMZ with declining inflation
                from 7% to 2% over four years.
              </p>
              <Callout type="info">
                <strong className="text-primary-400">Core thesis:</strong> Tamil is one of the
                world&apos;s oldest living classical languages, with over 2,000 years of unbroken
                literary tradition. It deserves its own blockchain — not as a sidechain or Layer-2,
                but as a sovereign, community-owned Tamizhi chain where Tamil culture, language, and
                commerce can thrive without dependence on any centralized custodian.
              </Callout>
              <p>
                This paper describes the technical architecture, token economics, governance model,
                four-phase roadmap, and the vision for the Tamizhi AI platform — the world&apos;s
                first language model trained natively on Tamil literary corpus stored on-chain.
              </p>
            </Section>

            {/* ── 1. Introduction ─────────────────────────────────────────── */}
            <Section id="introduction" number="1" title="Introduction" tamil="அறிமுகம்">
              <p>
                Tamil (<span className="tamil-text text-white">தமிழ்</span>) is spoken by over
                80 million people worldwide, predominantly in Tamil Nadu (India), Sri Lanka,
                Singapore, Malaysia, and a global diaspora spanning every continent. It is
                classified as a classical language by the Government of India and is one of the
                few living languages with an unbroken literary tradition spanning more than
                2,000 years.
              </p>
              <p>
                The Sangam corpus (300 BCE – 300 CE) alone contains over 2,000 poems across 18
                anthologies. Works like <em className="text-white">Thirukkural</em>,{' '}
                <em className="text-white">Silappatikaram</em>, and{' '}
                <em className="text-white">Manimekalai</em> represent the pinnacle of ancient
                literary achievement — yet most Tamil speakers have limited digital access to
                their own heritage.
              </p>
              <p>
                Despite this richness, Tamil culture faces three existential digital threats:
                centralized preservation (works stored on servers controlled by governments or
                universities that can be deleted or altered), attribution fraud (digital copies
                lack cryptographic provenance), and financial exclusion (the Tamil diaspora lacks
                infrastructure for Tamil-denominated digital finance).
              </p>
              <p>
                Tamizhi is the answer. A blockchain built for Tamil, governed by Tamil speakers,
                with a token that powers a complete ecosystem: messaging, browsing, literature
                preservation, and AI — all unified on the Tamizhi chain.
              </p>
            </Section>

            {/* ── 2. Vision ────────────────────────────────────────────────── */}
            <Section id="vision" number="2" title="Vision" tamil="தொலைநோக்கு">
              <p className="tamil-text text-lg text-white/90 leading-relaxed italic">
                &ldquo;யாதும் ஊரே யாவரும் கேளிர்&rdquo;
              </p>
              <p className="text-text-muted text-sm italic mb-4">
                &ldquo;Every land is my homeland; every person is my kin.&rdquo;
                — Kaniyan Pungundranar, Sangam Era
              </p>
              <p>
                Our vision is a world where Tamil language and culture thrive in the digital age —
                permanently preserved, globally accessible, AI-augmented, and community-owned.
                Tamizhi is the infrastructure layer for this vision.
              </p>
              <p>
                By 2028, we aim to be the primary digital infrastructure for the Tamil-speaking
                world: the messaging platform Tamil communities use, the financial network Tamil
                businesses build on, the archive where Tamil literature lives forever, and the
                AI platform that speaks Tamil natively — not as a translation of English, but as
                a first-class language with deep grammatical and cultural understanding.
              </p>
              <p>
                The four pillars of our vision:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
                {[
                  { icon: Database, title: 'Preserve', desc: 'Anchor 2,000+ years of Tamil literary heritage on an immutable ledger.' },
                  { icon: Globe, title: 'Connect', desc: 'E2E encrypted messaging for the global Tamil diaspora.' },
                  { icon: Zap, title: 'Empower', desc: 'TMZ token for Tamil-denominated commerce and DeFi.' },
                  { icon: Brain, title: 'Augment', desc: 'Tamil-native AI trained on on-chain corpus.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="p-4 rounded-xl bg-[#13131F] border border-white/8 flex gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/10 h-fit">
                      <Icon className="w-4 h-4 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
                      <p className="text-text-muted text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── 3. Architecture ──────────────────────────────────────────── */}
            <Section id="architecture" number="3" title="Technology Architecture" tamil="கட்டமைப்பு">
              <p>
                Tamizhi is a sovereign, independent blockchain — not a sidechain,
                not a rollup, but a full independent network with its own validator set,
                consensus, and governance. This architectural choice gives the Tamil community
                complete sovereignty over the chain&apos;s evolution.
              </p>

              <h3 className="text-white font-semibold mt-6 mb-2">Module Stack</h3>
              <Table
                headers={['Module', 'Purpose', 'Status']}
                rows={[
                  ['auth, bank, staking, slashing, distribution', 'Core Tamizhi economic primitives', 'Live'],
                  ['gov', 'On-chain governance with deposit & voting', 'Live'],
                  ['mint', 'TMZ inflation schedule (7% → 2%)', 'Live'],
                  ['upgrade', 'Governance-gated software upgrades', 'Live'],
                  ['bridge + transfer', 'Cross-chain bridge protocol', 'Live'],
                  ['wasm (Tamizhi VM)', 'WebAssembly smart contract execution', 'Live'],
                  ['x/literature (custom)', 'On-chain literary work registry & metadata', 'Phase 3'],
                ]}
              />

              <h3 className="text-white font-semibold mt-6 mb-2">Consensus</h3>
              <p>
                Tamizhi uses Byzantine Fault Tolerant (BFT) consensus — the same battle-tested
                model securing billions in assets across major blockchain networks. Blocks finalize
                in under 2 seconds with absolute finality — no probabilistic confirmation required.
                Validators use Ed25519 keys for block signing. A 2/3+ supermajority of voting
                power must agree for any block to be committed.
              </p>

              <h3 className="text-white font-semibold mt-6 mb-2">Storage Strategy</h3>
              <p>
                Full literary text is stored on IPFS with optional Arweave permanence pinning.
                Only the content hash (SHA-256), IPFS CID, and structured metadata are stored
                on-chain in smart contract state. This design keeps on-chain storage costs
                minimal while ensuring immutable content addressing.
              </p>

              <Callout type="code">
                {`# Chain configuration
chain_id: tamizhi-1
bech32_prefix: tamizhi
coin_type: 118
min_gas_price: 0.025utmz
block_time_target: 2s
unbonding_time: 1814400s (21 days)
max_validators: 100`}
              </Callout>

              <h3 className="text-white font-semibold mt-6 mb-2">Cross-Chain Bridge</h3>
              <p>
                The Tamizhi bridge protocol is active from genesis. Trustless cross-chain
                token transfers allow TMZ to bridge to major DeFi networks for liquidity,
                and to any compatible blockchain network. The Tamizhi relayer network ensures
                continuous packet relay across all connected chains.
              </p>
            </Section>

            {/* ── 4. Tamil + AI ────────────────────────────────────────────── */}
            <Section id="tamil-ai" number="4" title="Tamil + AI" tamil="தமிழ் + செயற்கை நுண்ணறிவு">
              <p>
                The Tamizhi AI Platform (Phase 4, 2027–2028) represents the most ambitious
                component of the ecosystem: a language model trained natively on Tamil corpus —
                not a translation layer over English, but a model that thinks in Tamil.
              </p>
              <p>
                Existing large language models treat Tamil as a secondary language with limited
                training data. They struggle with:
              </p>
              <ul className="space-y-2 list-none pl-0">
                {[
                  ['Classical Tamil', 'Sangam-era grammar (எழுத்தியல், சொல்லியல்) is largely absent from modern training sets'],
                  ['Script complexity', 'Tamil script has 247 characters; most tokenizers split words sub-optimally'],
                  ['Cultural context', 'Idioms, proverbs, and literary references require deep cultural grounding'],
                  ['Transliteration', 'No standard mapping between Tamil script and romanization in training data'],
                ].map(([t, d]) => (
                  <li key={t as string} className="flex gap-3 p-3 rounded-lg bg-[#13131F] border border-white/8">
                    <span className="text-primary-400 font-semibold text-sm w-36 flex-shrink-0">{t}</span>
                    <span className="text-sm text-text-secondary">{d}</span>
                  </li>
                ))}
              </ul>
              <p>
                The Tamizhi AI training pipeline uses the on-chain literary corpus as ground truth.
                Every work minted to the chain becomes training data for the model — verified,
                attributed, and immutably sourced. This creates a virtuous cycle: more literature
                on-chain means a better AI, which drives more engagement with Tamil literature.
              </p>

              <h3 className="text-white font-semibold mt-6 mb-2">AI Capabilities (Phase 4)</h3>
              <Table
                headers={['Capability', 'Description', 'Status']}
                rows={[
                  ['Tamil text generation', 'Classical and modern Tamil prose/poetry generation', 'Phase 4'],
                  ['Translation', 'Tamil ↔ 20+ languages with cultural context preservation', 'Phase 4'],
                  ['Transliteration', 'Tamil ↔ ISO 15919 romanization, lossless', 'Phase 4'],
                  ['Literary analysis', 'Meter, genre, period, authorship detection', 'Phase 4'],
                  ['Classical grammar', 'Tolkappiyam-based grammatical analysis', 'Phase 4'],
                  ['On-chain inference', 'Pay-per-query API using TMZ tokens', 'Phase 4b'],
                  ['Speech (TTS/STT)', 'Tamil text-to-speech and speech recognition', 'Phase 4b'],
                ]}
              />
            </Section>

            {/* ── 5. Tokenomics ────────────────────────────────────────────── */}
            <Section id="tokenomics" number="5" title="Tokenomics" tamil="டோக்கன் பொருளாதாரம்">
              <p>
                TMZ (Tamizhi) is the native token of the Tamizhi chain. The base denomination
                is <code className="text-primary-300 bg-primary-500/10 px-1.5 py-0.5 rounded font-mono text-sm">utmz</code>{' '}
                (micro-TMZ), where 1 TMZ = 1,000,000 utmz. The micro-denomination enables
                precise, low-cost transactions at any scale.
              </p>

              <Table
                headers={['Parameter', 'Value']}
                rows={[
                  ['Token name', 'Tamizhi (TMZ)'],
                  ['Base denomination', 'utmz (micro-TMZ)'],
                  ['Conversion', '1 TMZ = 1,000,000 utmz'],
                  ['Total supply (genesis)', '1,000,000,000 TMZ (1 billion)'],
                  ['Initial inflation', '7% annual'],
                  ['Terminal inflation', '2% (reached after 4 years)'],
                  ['Inflation decay', 'Linear, ~1.25% per year'],
                  ['Min gas price', '0.025 utmz per unit of gas'],
                  ['Block time', '~2 seconds (BFT consensus)'],
                  ['Unbonding period', '21 days'],
                  ['Voting period', '5 days'],
                  ['Min deposit', '1,000 TMZ'],
                ]}
              />

              <h3 className="text-white font-semibold mt-6 mb-3">Distribution</h3>
              <Table
                headers={['Allocation', 'Percentage', 'Amount', 'Vesting']}
                rows={[
                  ['Community & Ecosystem', '30%', '300M TMZ', 'No lock — distributed via grants'],
                  ['Validators & Staking', '25%', '250M TMZ', 'Released via block rewards'],
                  ['Foundation & Dev', '20%', '200M TMZ', '4-year vesting, 1-year cliff'],
                  ['Team & Advisors', '15%', '150M TMZ', '4-year vesting, 1-year cliff'],
                  ['Initial Distribution', '10%', '100M TMZ', 'Liquid at genesis'],
                ]}
              />

              <Callout type="info">
                <strong className="text-primary-400">Gas model:</strong> Gas fees are paid in
                utmz and collected by validators. A simple token transfer costs approximately
                21,000 gas. At 0.025 utmz/gas, this is 525 utmz (0.000525 TMZ) — a fraction of
                a cent. Literary NFT minting costs approximately 100,000–200,000 gas (~0.005 TMZ).
              </Callout>
            </Section>

            {/* ── 6. Governance ─────────────────────────────────────────────── */}
            <Section id="governance" number="6" title="Governance" tamil="ஆட்சி">
              <p>
                Tamizhi uses fully on-chain governance. Any TMZ holder can submit a
                governance proposal after depositing a minimum of 1,000 TMZ. Once the deposit
                threshold is reached, a 5-day voting period opens. Bonded TMZ holders vote
                Yes, No, No With Veto, or Abstain.
              </p>
              <p>
                Governance controls every mutable parameter of the chain: minimum gas prices,
                staking parameters, inflation rates, smart contract upload permissions,
                community pool spend proposals, and software upgrade schedules. This means
                no centralized entity — including the Tamizhi Foundation — can unilaterally
                change the chain.
              </p>

              <Table
                headers={['Parameter', 'Value']}
                rows={[
                  ['Voting period', '5 days (432,000 seconds)'],
                  ['Quorum', '33.4% of total bonded TMZ'],
                  ['Pass threshold', '50% of non-abstain votes'],
                  ['Veto threshold', '33.4% of participating votes'],
                  ['Min deposit', '1,000 TMZ'],
                  ['Max deposit period', '14 days'],
                ]}
              />

              <h3 className="text-white font-semibold mt-6 mb-2">Curation Committee</h3>
              <p>
                A multisig DAO smart contract holds the minter role for the Literary NFT contract.
                This Curation Committee reviews submissions for authenticity, provenance, and
                license compliance before minting. Committee membership (5–9 members) is itself
                governed by TMZ holder voting, ensuring that no permanent authority controls
                what gets preserved on-chain.
              </p>

              <h3 className="text-white font-semibold mt-6 mb-2">Proposal Types</h3>
              <ul className="space-y-1.5 list-none pl-0">
                {[
                  'Parameter Change — modify chain parameters',
                  'Software Upgrade — schedule a binary upgrade at a specific block height',
                  'Community Pool Spend — distribute funds to Tamil scholars, devs, or institutions',
                  'Text Proposal — on-chain signaling (non-binding resolutions)',
                  'Tamizhi VM: StoreCode — upload new smart contract bytecode',
                  'Tamizhi VM: MigrateContract — upgrade existing contract state',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-text-secondary text-sm">
                    <ChevronRight className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            {/* ── 7. Roadmap ────────────────────────────────────────────────── */}
            <Section id="roadmap" number="7" title="Roadmap" tamil="வழிமாப்பு">
              <p>
                The Tamizhi roadmap spans four phases from 2025 to 2028. Each phase builds
                on the previous, expanding from blockchain infrastructure to a complete
                Tamil AI ecosystem.
              </p>
              <Table
                headers={['Phase', 'Timeline', 'Key Deliverables']}
                rows={[
                  [
                    <span key="p1" className="text-primary-400 font-semibold">Phase 1</span>,
                    '2025–Q2 2026',
                    'Tamizhi Chain, TMZ token, validators, Chain Explorer, Tamizhi Messenger (all platforms)',
                  ],
                  [
                    <span key="p2" className="text-blue-400 font-semibold">Phase 2</span>,
                    'Q3–Q4 2026',
                    'Tamizhi Browser, TMZ Mainnet launch, cross-chain bridge to major networks, wallet integrations, Security audit',
                  ],
                  [
                    <span key="p3" className="text-amber-400 font-semibold">Phase 3</span>,
                    '2027',
                    'Tamil Literature Archive (2,000+ works), Tamizhi NFT standard, NFT marketplace, Scholar DAO, Community DApps',
                  ],
                  [
                    <span key="p4" className="text-purple-400 font-semibold">Phase 4</span>,
                    '2027–2028',
                    'Tamizhi AI Platform, Tamil language model, 20+ language translation, on-chain inference marketplace, TTS/STT',
                  ],
                ]}
              />
              <p>
                Phase 1 is currently in progress. The chain is running on testnet with a
                genesis validator set. The Tamizhi Messenger web app is in beta.
              </p>
              <p>
                For granular milestone tracking with individual deliverable status, see the{' '}
                <Link href="/roadmap" className="text-primary-400 hover:underline">
                  interactive roadmap page
                </Link>.
              </p>
            </Section>

            {/* ── 8. Team ──────────────────────────────────────────────────── */}
            <Section id="team" number="8" title="Team" tamil="குழு">
              <p>
                The Tamizhi Foundation is a non-profit organization established to steward the
                development of the Tamizhi ecosystem. The founding team comprises blockchain
                engineers, Tamil scholars, AI researchers, and community organizers from across
                the Tamil diaspora.
              </p>
              <p>
                Team token allocations (15%, 150M TMZ) are subject to a 1-year cliff and
                4-year total vesting schedule — ensuring long-term alignment with the ecosystem.
                Advisor allocations follow the same schedule.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                {[
                  { icon: Cpu, role: 'Blockchain Engineering', desc: 'Tamizhi Core engineers building the chain, bridge relayer, and smart contracts.' },
                  { icon: Brain, role: 'AI & NLP Research', desc: 'Tamil NLP researchers designing the corpus pipeline and language model architecture.' },
                  { icon: Users, role: 'Community & Culture', desc: 'Tamil scholars and community leaders guiding cultural authenticity and adoption.' },
                  { icon: Code2, role: 'Application Development', desc: 'Full-stack engineers building the messenger, browser, wallet, and explorer.' },
                ].map(({ icon: Icon, role, desc }) => (
                  <div key={role} className="p-4 rounded-xl bg-[#13131F] border border-white/8 flex gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/10 h-fit flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1">{role}</h4>
                      <p className="text-text-muted text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Callout type="info">
                The Tamizhi Foundation is committed to progressive decentralization.
                As governance matures and the validator set grows, foundation control over
                chain parameters will be fully transferred to TMZ holders via on-chain governance.
              </Callout>
            </Section>

            {/* ── 9. Disclaimer ─────────────────────────────────────────────── */}
            <Section id="disclaimer" number="9" title="Legal Disclaimer" tamil="சட்டப் பொறுப்புத் துறப்பு">
              <Callout type="warning">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <strong className="text-yellow-400">Important Legal Notice</strong>
                </div>
              </Callout>
              <p>
                This whitepaper is provided for informational purposes only. It does not
                constitute financial advice, investment advice, or a solicitation to buy or sell
                any token, security, or financial instrument. Nothing in this document should
                be relied upon as a promise or representation of future performance.
              </p>
              <p>
                TMZ tokens are utility tokens intended for use within the Tamizhi ecosystem
                (gas fees, governance voting, staking, and literary NFT operations). They are
                not designed or intended to function as securities, investment contracts, or
                financial instruments in any jurisdiction.
              </p>
              <p>
                The Tamizhi Foundation makes no warranties, express or implied, regarding the
                accuracy, completeness, or timeliness of the information contained in this
                document. The roadmap, token economics, and technical specifications are subject
                to change based on community governance decisions, technical constraints,
                regulatory developments, and other factors outside the Foundation&apos;s control.
              </p>
              <p>
                Participation in the Tamizhi ecosystem involves significant risks, including
                but not limited to: smart contract vulnerabilities, validator misbehavior,
                regulatory changes, market volatility, and technology failure. Participants
                should conduct their own due diligence and consult qualified legal and financial
                advisors before making any decisions.
              </p>
              <p>
                This document is governed by the Apache 2.0 license. The Tamizhi chain source
                code is open source and available on{' '}
                <a
                  href="https://github.com/tamizhi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline"
                >
                  GitHub
                </a>. Community contributions are welcome and encouraged.
              </p>
              <p className="tamil-text text-text-muted italic mt-4">
                © 2026 Tamizhi Foundation. Apache 2.0 License. Built for the Tamil people, by the Tamil people.
              </p>
            </Section>

            {/* Footer CTA */}
            <div className="mt-12 pt-8 border-t border-white/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-text-muted text-sm">Chain tamizhi-1 — Phase 1 Active</span>
                </div>
                <p className="text-text-muted text-xs">
                  © 2026 Tamizhi Foundation · Apache 2.0 ·{' '}
                  <a href="https://github.com/tamizhi" className="text-primary-400 hover:underline" target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/roadmap"
                  className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-text-secondary hover:text-white px-4 py-2.5 rounded-xl transition-all duration-200 text-sm"
                >
                  Full Roadmap
                </Link>
                <Link
                  href="/wallet"
                  className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm"
                  style={{ boxShadow: '0 0 20px rgba(232,80,10,0.35)' }}
                >
                  Launch App
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
