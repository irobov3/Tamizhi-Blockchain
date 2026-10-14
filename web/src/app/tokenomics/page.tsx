'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  TrendingUp,
  Shield,
  Zap,
  Lock,
  BookOpen,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Info,
  Coins,
  BarChart3,
  Database,
  Activity,
  Flame,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Distribution data ────────────────────────────────────────────────────────
const distribution = [
  {
    label: 'Validators & Staking',
    tamil: 'வேலிடேட்டர்கள்',
    pct: 40,
    amount: 400_000_000,
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.3)',
    vesting: 'Released via block rewards over 4+ years',
    purpose:
      'Block rewards for validators, delegator staking incentives, network security. The largest share ensures robust decentralization.',
  },
  {
    label: 'Community & Ecosystem',
    tamil: 'சமூகம்',
    pct: 30,
    amount: 300_000_000,
    color: '#7c3aed',
    glow: 'rgba(124,58,237,0.3)',
    vesting: 'No lock-up — distributed via grants & ecosystem programs',
    purpose:
      'Developer grants, Tamil scholar programs, DApp incentives, community events, and ecosystem growth funds.',
  },
  {
    label: 'Development',
    tamil: 'மேம்பாடு',
    pct: 20,
    amount: 200_000_000,
    color: '#d4a017',
    glow: 'rgba(212,160,23,0.3)',
    vesting: '4-year vesting, 1-year cliff',
    purpose:
      'Protocol development, security audits, infrastructure, legal compliance, and long-term operational costs.',
  },
  {
    label: 'Reserve',
    tamil: 'இருப்பு நிதி',
    pct: 10,
    amount: 100_000_000,
    color: '#94a3b8',
    glow: 'rgba(148,163,184,0.2)',
    vesting: 'Locked — governance-controlled release',
    purpose:
      'Strategic reserve for ecosystem emergencies, partnerships, future exchange listings, and unforeseen costs.',
  },
];

// ─── Vesting schedule ─────────────────────────────────────────────────────────
const vestingSchedule = [
  { milestone: 'Genesis (Day 0)', validators: '0M', community: '30M', dev: '0M', reserve: '0M' },
  { milestone: '1 Year (Cliff)', validators: '100M', community: '120M', dev: '50M', reserve: '0M' },
  { milestone: '2 Years', validators: '200M', community: '210M', dev: '100M', reserve: '0M' },
  { milestone: '3 Years', validators: '300M', community: '270M', dev: '150M', reserve: '0M' },
  { milestone: '4 Years (Full)', validators: '400M', community: '300M', dev: '200M', reserve: '100M*' },
];

// ─── Economic model cards ─────────────────────────────────────────────────────
const economicModel = [
  {
    icon: TrendingUp,
    title: 'Inflation Schedule',
    tamil: 'பணவீக்க அட்டவணை',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    items: [
      'Year 1: 7% annual inflation',
      'Year 2: 5.75% (linear decay)',
      'Year 3: 4.25% (linear decay)',
      'Year 4+: stabilizes at 2%',
      'All new TMZ → validators & delegators',
      'Community pool receives 2% of inflation',
    ],
  },
  {
    icon: Shield,
    title: 'Staking Economics',
    tamil: 'Staking பொருளாதாரம்',
    color: 'text-[#00d4ff]',
    bg: 'bg-cyan-500/10',
    items: [
      'Estimated staking APR: ~12% (Year 1)',
      '21-day unbonding period',
      'Double-sign slashing: 5% stake',
      'Downtime slashing: 0.01%',
      'Validator commission: 0%–100%',
      'Min self-delegation: 1,000 TMZ',
    ],
  },
  {
    icon: Zap,
    title: 'Gas & Fees',
    tamil: 'Gas & கட்டணங்கள்',
    color: 'text-[#d4a017]',
    bg: 'bg-yellow-500/10',
    items: [
      'Minimum gas price: 0.025 utmz',
      '1 TMZ = 1,000,000 utmz (micro-TMZ)',
      'Simple transfer: ~21,000 gas (~0.001 TMZ)',
      'NFT mint: ~100,000–200,000 gas',
      'Smart contract call: varies by complexity',
      '100% of fees distributed to validators',
    ],
  },
  {
    icon: BarChart3,
    title: 'Governance',
    tamil: 'ஆட்சி',
    color: 'text-[#7c3aed]',
    bg: 'bg-purple-500/10',
    items: [
      'Min deposit: 1,000 TMZ',
      'Voting period: 5 days',
      'Quorum: 33.4% bonded TMZ',
      'Pass threshold: 50%',
      'Veto threshold: 33.4%',
      'Abstain counts toward quorum',
    ],
  },
];

// ─── Token utility ────────────────────────────────────────────────────────────
const utilityItems = [
  {
    icon: Zap,
    title: 'Gas Fees',
    tamil: 'பரிவர்த்தனை கட்டணம்',
    color: 'text-[#d4a017]',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    desc: 'Every transaction on the Tamizhi chain requires TMZ for gas. From token transfers to complex smart contract calls, utmz powers the economic engine.',
    examples: ['Send TMZ: ~0.001 TMZ', 'Mint Literature NFT: ~0.05 TMZ', 'Smart contract: ~0.01–0.1 TMZ'],
  },
  {
    icon: Shield,
    title: 'Governance Voting',
    tamil: 'ஆட்சி வாக்கெடுப்பு',
    color: 'text-[#00d4ff]',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    desc: 'TMZ holders govern the chain. Vote on chain parameters, software upgrades, community pool spend, and curator committee membership.',
    examples: ['Parameter changes', 'Software upgrades', 'Community grants', 'Validator jailing'],
  },
  {
    icon: Lock,
    title: 'Staking & Security',
    tamil: 'Staking & பாதுகாப்பு',
    color: 'text-[#7c3aed]',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    desc: 'Validators stake TMZ as economic security for the network. Delegators earn rewards proportional to their stake and secure the chain.',
    examples: ['~12% APR Year 1', '21-day unbonding', 'Slashing protection', 'Compound rewards'],
  },
  {
    icon: BookOpen,
    title: 'Literature NFTs',
    tamil: 'இலக்கிய NFT',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    desc: 'Mint Tamil literary works as on-chain NFTs. Pay mint fees in TMZ. Verified works receive a Tamizhi Foundation seal of authenticity.',
    examples: ['Thirukkural verses', 'Sangam poems', 'Modern Tamil literature', 'Scholar submissions'],
  },
];

// ─── Fee burn mechanism ───────────────────────────────────────────────────────
const burnSteps = [
  { step: '01', title: 'Transaction Submitted', desc: 'User broadcasts a transaction with a gas fee in utmz.' },
  { step: '02', title: 'Validator Processes', desc: 'Validator includes tx in a block and receives the full gas fee.' },
  { step: '03', title: 'Fee Distribution', desc: 'Fees distributed to validators and delegators proportionally.' },
  { step: '04', title: 'Community Pool', desc: '2% of all block rewards flow to the community pool for governance.' },
];

// ─── FAQs ─────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'What is the total supply of TMZ?',
    a: '1,000,000,000 TMZ (1 billion) at genesis. Additional TMZ enters via inflation starting at 7%, decaying to 2% over 4 years.',
  },
  {
    q: 'How do I earn TMZ by staking?',
    a: 'Delegate to a validator using the Tamizhi wallet or Keplr. You earn proportional block rewards and transaction fees. Estimated Year 1 APR: ~12%.',
  },
  {
    q: 'What is utmz?',
    a: 'utmz is the base denomination. 1 TMZ = 1,000,000 utmz. Gas fees and min balances are expressed in utmz — similar to wei in Ethereum.',
  },
  {
    q: 'Is there a token burn mechanism?',
    a: 'Currently 100% of fees go to validators. A community governance proposal can introduce fee burning in a future upgrade. The Foundation has drafted such a proposal for Phase 2.',
  },
  {
    q: 'When do Foundation tokens unlock?',
    a: 'Development tokens (20%) have a 1-year cliff with linear monthly vesting over 4 years total. No Foundation tokens are liquid before the 1-year mark.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TokenomicsPage() {
  // Build conic gradient for pie chart
  let cumulative = 0;
  const conicStops = distribution
    .map((d) => {
      const start = cumulative;
      cumulative += d.pct;
      return `${d.color} ${start}% ${cumulative}%`;
    })
    .join(', ');

  return (
    <div className="min-h-screen bg-[#0e0824] text-[#fdf6e3] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #d4a017 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4a017]/10 border border-[#d4a017]/25 text-[#d4a017] text-sm font-semibold mb-6">
              <Coins className="w-4 h-4" />
              TMZ Token Economics
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">
              TMZ Tokenomics
            </h1>
            <p className="tamil-text text-[#d4a017] text-xl mb-5">
              தமிழி டோக்கன் பொருளாதாரம்
            </p>
            <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
              1 billion TMZ tokens. Fair distribution designed for long-term sustainability,
              validator incentives, and community ownership of the Tamil ecosystem.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SUPPLY OVERVIEW ──────────────────────────────────────────────── */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-20">
            {[
              { label: 'Total Supply', value: '1,000,000,000', unit: 'TMZ', icon: Database, color: 'text-[#00d4ff]', bg: 'bg-cyan-500/10' },
              { label: 'Base Denomination', value: 'utmz', unit: '= 0.000001 TMZ', icon: Zap, color: 'text-[#d4a017]', bg: 'bg-yellow-500/10' },
              { label: 'Initial Inflation', value: '7%', unit: 'annual (Year 1)', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Chain ID', value: 'tamizhi-1', unit: 'Tamizhi Network', icon: Activity, color: 'text-[#7c3aed]', bg: 'bg-purple-500/10' },
            ].map(({ label, value, unit, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="p-5 rounded-2xl bg-[#1a1040] border border-[#2a1f5c] text-center hover:border-[#7c3aed]/40 transition-colors"
              >
                <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-white font-bold text-lg leading-tight mb-0.5">{value}</div>
                <div className="text-white/30 text-xs font-mono">{unit}</div>
                <div className="text-white/50 text-xs mt-1.5 font-medium uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </FadeIn>

          {/* ── DISTRIBUTION ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-20">
            {/* Pie chart */}
            <FadeIn className="flex flex-col items-center">
              <h2 className="text-2xl font-black text-white mb-3 text-center">
                Token Distribution
                <span className="tamil-text text-[#d4a017] text-lg ml-2">விநியோகம்</span>
              </h2>
              <div className="relative w-64 h-64 mt-4">
                <motion.div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `conic-gradient(${conicStops})`,
                    boxShadow: '0 0 80px rgba(0,212,255,0.15), 0 0 40px rgba(124,58,237,0.2)',
                  }}
                  initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
                  whileInView={{ rotate: 0, opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                <div className="absolute inset-[22%] bg-[#0e0824] rounded-full flex flex-col items-center justify-center border border-[#2a1f5c]">
                  <div className="text-3xl font-black text-white">1B</div>
                  <div className="text-white/30 text-xs">TMZ Total</div>
                </div>
              </div>
              {/* Legend */}
              <div className="mt-6 space-y-2 w-full max-w-xs">
                {distribution.map((d) => (
                  <div key={d.label} className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-white/60 text-sm flex-1">{d.label}</span>
                    <span className="text-white/40 text-sm font-mono font-bold">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* Bar chart */}
            <FadeIn delay={0.15}>
              <h2 className="text-2xl font-black text-white mb-6">
                Allocation Breakdown
                <span className="tamil-text text-[#d4a017] text-lg ml-2">பிரிவு</span>
              </h2>
              <div className="space-y-6">
                {distribution.map((d, i) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-white text-sm font-semibold">{d.label}</span>
                        <span className="tamil-text text-white/30 text-xs ml-2">{d.tamil}</span>
                      </div>
                      <span className="text-white/50 text-sm font-mono">
                        {(d.amount / 1_000_000).toFixed(0)}M
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${d.color}, ${d.color}99)` }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${d.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-white/30 text-xs mt-1">{d.vesting}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* ── DETAIL CARDS ───────────────────────────────────────────────── */}
          <FadeIn>
            <h2 className="text-2xl font-black text-white mb-6 text-center">
              Allocation Details
              <span className="tamil-text text-[#d4a017] text-lg ml-2">விவரங்கள்</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {distribution.map((d) => (
                <div
                  key={d.label}
                  className="p-5 rounded-2xl bg-[#1a1040] border border-[#2a1f5c] hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <div>
                      <div className="text-white font-semibold text-sm">{d.label}</div>
                      <div className="tamil-text text-white/30 text-xs">{d.tamil}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white mb-1">
                    {d.pct}%{' '}
                    <span className="text-sm text-white/30 font-normal">
                      ({(d.amount / 1_000_000).toFixed(0)}M TMZ)
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 mt-3">
                    <Info className="w-3.5 h-3.5 text-[#00d4ff] mt-0.5 flex-shrink-0" />
                    <p className="text-white/40 text-xs leading-relaxed">{d.purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── VESTING SCHEDULE ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0618]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2">
              Vesting Schedule
              <span className="tamil-text text-[#d4a017] text-xl ml-3">வெஸ்டிங் அட்டவணை</span>
            </h2>
            <p className="text-white/40">Cumulative TMZ unlocked over time (in millions)</p>
          </FadeIn>
          <FadeIn>
            <div className="overflow-x-auto rounded-2xl border border-[#2a1f5c]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a1f5c] bg-[#1a1040]">
                    {['Milestone', 'Validators', 'Community', 'Development', 'Reserve'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-4 text-white/40 font-semibold uppercase tracking-wider text-xs whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vestingSchedule.map((row, i) => (
                    <tr
                      key={row.milestone}
                      className={`border-b border-[#2a1f5c]/50 last:border-0 ${
                        i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                      } hover:bg-white/[0.03] transition-colors`}
                    >
                      <td className="px-5 py-4 text-white font-medium whitespace-nowrap">{row.milestone}</td>
                      <td className="px-5 py-4 text-[#00d4ff] font-mono">{row.validators}</td>
                      <td className="px-5 py-4 text-[#7c3aed] font-mono">{row.community}</td>
                      <td className="px-5 py-4 text-[#d4a017] font-mono">{row.dev}</td>
                      <td className="px-5 py-4 text-white/40 font-mono">{row.reserve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-white/30 text-xs mt-3 text-center">
              * Reserve released only via governance vote. Foundation &amp; Development have 1-year cliff, then linear monthly vesting.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── ECONOMIC MODEL ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2">
              Economic Model
              <span className="tamil-text text-[#d4a017] text-xl ml-3">பொருளாதார மாதிரி</span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {economicModel.map((section, i) => (
              <FadeIn key={section.title} delay={i * 0.08}>
                <div className="p-5 rounded-2xl bg-[#1a1040] border border-[#2a1f5c] h-full hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${section.bg}`}>
                      <section.icon className={`w-5 h-5 ${section.color}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{section.title}</h3>
                      <p className="tamil-text text-white/30 text-xs">{section.tamil}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-white/50 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00d4ff] flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOKEN UTILITY ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0618]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2">
              Token Utility
              <span className="tamil-text text-[#d4a017] text-xl ml-3">பயன்பாடு</span>
            </h2>
            <p className="text-white/40">Four core uses of TMZ in the Tamizhi ecosystem.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {utilityItems.map((u, i) => (
              <FadeIn key={u.title} delay={i * 0.08}>
                <div className={`p-6 rounded-2xl bg-[#1a1040] border ${u.border} hover:bg-[#1e1248] transition-all duration-200`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${u.bg}`}>
                      <u.icon className={`w-6 h-6 ${u.color}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{u.title}</h3>
                      <p className="tamil-text text-white/30 text-xs">{u.tamil}</p>
                    </div>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed mb-4">{u.desc}</p>
                  <div className="space-y-1.5">
                    {u.examples.map((ex) => (
                      <div key={ex} className="flex items-center gap-2 text-xs text-white/40">
                        <ChevronRight className="w-3 h-3 text-[#00d4ff]" />
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEE & REWARD MECHANISM ───────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-2">
              Fee &amp; Reward Mechanism
              <span className="tamil-text text-[#d4a017] text-xl ml-3">கட்டணம்</span>
            </h2>
            <p className="text-white/40">How transaction fees flow through the Tamizhi chain.</p>
          </FadeIn>
          <div className="space-y-4">
            {burnSteps.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.1}>
                <div className="flex gap-4 p-5 rounded-2xl bg-[#1a1040] border border-[#2a1f5c] hover:border-[#00d4ff]/30 transition-colors">
                  <div className="text-[#00d4ff] font-black text-xl font-mono flex-shrink-0 mt-0.5 w-8">
                    {step.step}
                  </div>
                  <div>
                    <div className="text-white font-bold mb-1">{step.title}</div>
                    <div className="text-white/40 text-sm leading-relaxed">{step.desc}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0618]">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2">
              FAQ
              <span className="tamil-text text-[#d4a017] text-xl ml-3">கேள்விகள்</span>
            </h2>
          </FadeIn>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={faq.q} delay={i * 0.07}>
                <div className="p-5 rounded-2xl bg-[#1a1040] border border-[#2a1f5c]">
                  <h3 className="text-white font-semibold mb-2 flex items-start gap-2">
                    <span className="text-[#00d4ff] font-mono text-sm mt-0.5">Q{i + 1}</span>
                    {faq.q}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed pl-7">{faq.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-2xl font-black text-white mb-3">Ready to earn TMZ?</h2>
            <p className="tamil-text text-white/40 mb-8">TMZ சம்பாதிக்க தயாரா?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wallet"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[#0e0824] text-sm transition-all duration-200 hover:opacity-90 shadow-[0_0_24px_rgba(0,212,255,0.3)]"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)' }}
              >
                Launch Wallet
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/whitepaper#tokenomics"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#2a1f5c] text-white/60 hover:text-white hover:border-[#7c3aed]/60 text-sm font-semibold transition-all duration-200"
              >
                Full Whitepaper
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  );
}
