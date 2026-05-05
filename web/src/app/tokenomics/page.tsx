'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Database,
  Shield,
  Zap,
  Activity,
  BookOpen,
  Lock,
  Users,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Info,
  Coins,
  BarChart3,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
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

const distribution = [
  {
    label: 'Community & Ecosystem',
    tamil: 'சமூகம் & சூழல்',
    pct: 30,
    amount: 300_000_000,
    color: '#E8500A',
    vesting: 'No lock-up — distributed via grants & ecosystem programs',
    purpose: 'Developer grants, community incentives, ecosystem growth funds, DApp development bounties.',
  },
  {
    label: 'Validators & Staking',
    tamil: 'Validators & Staking',
    pct: 25,
    amount: 250_000_000,
    color: '#F5C518',
    vesting: 'Released via block rewards over 4+ years',
    purpose: 'Block rewards for validators, delegator staking incentives, network security.',
  },
  {
    label: 'Foundation & Development',
    tamil: 'அடித்தளம் & மேம்பாடு',
    pct: 20,
    amount: 200_000_000,
    color: '#3B82F6',
    vesting: '4-year vesting with 1-year cliff',
    purpose: 'Protocol development, audits, infrastructure, legal, and long-term operations.',
  },
  {
    label: 'Team & Advisors',
    tamil: 'குழு & ஆலோசகர்கள்',
    pct: 15,
    amount: 150_000_000,
    color: '#8B5CF6',
    vesting: '4-year vesting with 1-year cliff — no early unlock',
    purpose: 'Core team compensation and advisor tokens. Aligned with long-term chain success.',
  },
  {
    label: 'Initial Distribution',
    tamil: 'ஆரம்ப விநியோகம்',
    pct: 10,
    amount: 100_000_000,
    color: '#10B981',
    vesting: 'Immediately liquid at genesis',
    purpose: 'Genesis validator stakes, initial liquidity, public sale participants.',
  },
];

const vestingSchedule = [
  { milestone: 'Genesis (Day 0)', community: '30M', validators: '0', foundation: '0', team: '0', initial: '100M' },
  { milestone: '1 Year (Cliff)', community: '60M', validators: '62.5M', foundation: '50M', team: '37.5M', initial: '—' },
  { milestone: '2 Years', community: '120M', validators: '125M', foundation: '100M', team: '75M', initial: '—' },
  { milestone: '3 Years', community: '210M', validators: '187.5M', foundation: '150M', team: '112.5M', initial: '—' },
  { milestone: '4 Years (Full)', community: '300M', validators: '250M', foundation: '200M', team: '150M', initial: '—' },
];

const economicModel = [
  {
    icon: TrendingUp,
    title: 'Inflation Schedule',
    titleTamil: 'பணவீக்க அட்டவணை',
    items: [
      'Year 1: 7% annual inflation',
      'Year 2: 5.75% (linear decay)',
      'Year 3: 4.25% (linear decay)',
      'Year 4+: stabilizes at 2%',
      'All new TMZ goes to validators and delegators',
      'Community pool receives 2% of all inflation',
    ],
  },
  {
    icon: Shield,
    title: 'Staking Economics',
    titleTamil: 'Staking பொருளாதாரம்',
    items: [
      'Estimated staking APR: ~12% (Year 1)',
      '21-day unbonding period',
      'Double-sign slashing: 5% stake',
      'Downtime slashing: 0.01%',
      'Validator commission: 0%–100% (market-set)',
      'Min self-delegation: 1,000 TMZ',
    ],
  },
  {
    icon: Zap,
    title: 'Gas & Fees',
    titleTamil: 'Gas & கட்டணங்கள்',
    items: [
      'Minimum gas price: 0.025 utmz',
      '1 TMZ = 1,000,000 utmz (micro-TMZ)',
      'Simple transfer: ~21,000 gas',
      'NFT mint: ~100,000–200,000 gas',
      'Smart contract call: varies',
      '100% of fees go to validators',
    ],
  },
  {
    icon: BarChart3,
    title: 'Governance',
    titleTamil: 'ஆட்சி',
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

const utility = [
  {
    icon: Zap,
    title: 'Gas Fees',
    titleTamil: 'பரிவர்த்தனை கட்டணம்',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    desc: 'Every transaction on the Tamizhi chain requires TMZ for gas fees. From simple token transfers to complex smart contract calls, utmz powers the economic engine.',
    examples: ['Send TMZ: ~0.001 TMZ', 'Mint Literature NFT: ~0.05 TMZ', 'Smart contract: ~0.01–0.1 TMZ'],
  },
  {
    icon: Shield,
    title: 'Governance Voting',
    titleTamil: 'ஆட்சி வாக்கெடுப்பு',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    desc: 'TMZ holders govern the chain. Vote on chain parameter changes, software upgrades, community pool spend proposals, and curator committee membership.',
    examples: ['Parameter changes', 'Software upgrades', 'Community grants', 'Validator jailing'],
  },
  {
    icon: Lock,
    title: 'Staking & Security',
    titleTamil: 'Staking & பாதுகாப்பு',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    desc: 'Validators stake TMZ as economic security. Delegators earn rewards proportional to their stake. Higher stake = stronger network security.',
    examples: ['~12% APR Year 1', '21-day unbonding', 'Slashing protection', 'Compound rewards'],
  },
  {
    icon: BookOpen,
    title: 'Literature NFTs',
    titleTamil: 'இலக்கிய NFT',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    desc: 'Mint Tamil literary works as on-chain NFTs. Pay mint fees in TMZ. Verified works receive a Tamizhi Foundation seal of authenticity.',
    examples: ['Thirukkural verses', 'Sangam poems', 'Modern literature', 'Scholar submissions'],
  },
];

const faqs = [
  {
    q: 'What is the total supply of TMZ?',
    a: '1,000,000,000 TMZ (1 billion). This is the genesis supply. Additional TMZ enters circulation via inflation (starting at 7%, decaying to 2% over 4 years).',
  },
  {
    q: 'How do I earn TMZ by staking?',
    a: 'Delegate your TMZ to a validator using the Tamizhi wallet or any Keplr-compatible interface. You earn a proportional share of block rewards and transaction fees. The estimated Year 1 APR is ~12%, declining as more TMZ is staked.',
  },
  {
    q: 'When do team tokens unlock?',
    a: 'Team and advisor tokens (15%, 150M TMZ) have a 1-year cliff followed by linear monthly vesting over 3 more years. No team tokens are liquid before the 1-year mark.',
  },
  {
    q: 'What is utmz?',
    a: 'utmz is the base denomination of TMZ on-chain — similar to how wei is to ETH. 1 TMZ = 1,000,000 utmz. Gas fees and minimum balances are expressed in utmz.',
  },
  {
    q: 'Is there a maximum validator commission?',
    a: 'Validators set their own commission rate (0%–100%). The market determines which validators attract delegators. The chain enforces a max commission change rate per day to protect delegators from sudden increases.',
  },
];

export default function TokenomicsPage() {
  let cumulative = 0;
  const conicStops = distribution
    .map((d) => {
      const start = cumulative;
      cumulative += d.pct;
      return `${d.color} ${start}% ${cumulative}%`;
    })
    .join(', ');

  return (
    <div className="min-h-screen bg-[#0D0D1A] overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent/6 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-primary-500/6 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(245,197,24,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-sm font-medium mb-6">
              <Coins className="w-4 h-4" />
              TMZ Token Economics
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              TMZ Tokenomics
            </h1>
            <p className="tamil-text text-primary-400 text-xl mb-4">
              தமிழி டோக்கன் பொருளாதாரம்
            </p>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
              1 billion TMZ tokens. Fair distribution designed for long-term sustainability,
              validator incentives, and community ownership of the Tamil ecosystem.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Supply overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
            {[
              { label: 'Total Supply', value: '1,000,000,000', unit: 'TMZ', icon: Database, color: 'text-primary-400', bg: 'bg-primary-500/10' },
              { label: 'Base Denom', value: 'utmz', unit: '= 0.000001 TMZ', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { label: 'Initial Inflation', value: '7%', unit: 'annual (Year 1)', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Chain ID', value: 'tamizhi-1', unit: 'Tamizhi Network', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            ].map(({ label, value, unit, icon: Icon, color, bg }) => (
              <div key={label} className="p-5 rounded-2xl bg-[#13131F] border border-white/8 text-center">
                <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-white font-bold text-lg leading-tight mb-0.5">{value}</div>
                <div className="text-text-muted text-xs">{unit}</div>
                <div className="text-text-secondary text-xs mt-1 font-medium">{label}</div>
              </div>
            ))}
          </FadeIn>

          {/* Distribution visual + bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
            <FadeIn className="flex flex-col items-center">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                Token Distribution
                <span className="tamil-text text-primary-400 text-lg ml-3">விநியோகம்</span>
              </h2>
              <div className="relative w-72 h-72">
                <motion.div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `conic-gradient(${conicStops})`,
                    boxShadow: '0 0 80px rgba(232,80,10,0.2)',
                  }}
                  initial={{ rotate: -90, opacity: 0 }}
                  whileInView={{ rotate: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                <div className="absolute inset-[20%] bg-[#0D0D1A] rounded-full flex flex-col items-center justify-center border border-white/5">
                  <div className="text-3xl font-bold text-white">1B</div>
                  <div className="text-xs text-text-muted">TMZ Total</div>
                  <div className="tamil-text text-[10px] text-primary-400 mt-1">மொத்தம்</div>
                </div>
              </div>
              {/* Legend */}
              <div className="grid grid-cols-1 gap-2 mt-6 w-full max-w-xs">
                {distribution.map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-text-secondary text-xs flex-1">{d.label}</span>
                    <span className="text-text-muted text-xs font-bold">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* Bar chart */}
            <FadeIn delay={0.2}>
              <h2 className="text-2xl font-bold text-white mb-8">
                Allocation Breakdown
                <span className="tamil-text text-primary-400 text-lg ml-3">பிரிவு</span>
              </h2>
              <div className="space-y-5">
                {distribution.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-white text-sm font-medium">{d.label}</span>
                        <span className="tamil-text text-text-muted text-xs ml-2">{d.tamil}</span>
                      </div>
                      <span className="text-text-secondary text-sm font-mono">{(d.amount / 1_000_000).toFixed(0)}M</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${d.color}, ${d.color}bb)` }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${d.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-text-muted text-xs mt-1">{d.vesting}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Detailed breakdown cards */}
          <FadeIn>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Allocation Details
              <span className="tamil-text text-primary-400 text-lg ml-3">விவரங்கள்</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {distribution.map((d) => (
                <div
                  key={d.label}
                  className="p-5 rounded-2xl bg-[#13131F] border border-white/8"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <div>
                      <div className="text-white font-semibold text-sm">{d.label}</div>
                      <div className="tamil-text text-text-muted text-xs">{d.tamil}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {d.pct}% <span className="text-sm text-text-muted font-normal">({(d.amount / 1_000_000).toFixed(0)}M TMZ)</span>
                  </div>
                  <div className="flex items-start gap-1.5 mt-3">
                    <Info className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                    <p className="text-text-muted text-xs leading-relaxed">{d.purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Vesting Schedule */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0A0A16]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              Vesting Schedule
              <span className="tamil-text text-primary-400 text-xl ml-3">வெஸ்டிங் அட்டவணை</span>
            </h2>
            <p className="text-text-secondary">Cumulative TMZ unlocked over time (in millions)</p>
          </FadeIn>
          <FadeIn>
            <div className="overflow-x-auto rounded-2xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-[#13131F]">
                    {['Milestone', 'Community', 'Validators', 'Foundation', 'Team', 'Initial Dist.'].map((h) => (
                      <th key={h} className="text-left px-5 py-4 text-text-secondary font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vestingSchedule.map((row, i) => (
                    <tr
                      key={row.milestone}
                      className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/2'} hover:bg-white/3 transition-colors`}
                    >
                      <td className="px-5 py-4 text-white font-medium whitespace-nowrap">{row.milestone}</td>
                      <td className="px-5 py-4 text-[#E8500A] font-mono">{row.community}</td>
                      <td className="px-5 py-4 text-[#F5C518] font-mono">{row.validators}</td>
                      <td className="px-5 py-4 text-[#3B82F6] font-mono">{row.foundation}</td>
                      <td className="px-5 py-4 text-[#8B5CF6] font-mono">{row.team}</td>
                      <td className="px-5 py-4 text-[#10B981] font-mono">{row.initial}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-text-muted text-xs mt-3 text-center">
              * Validator allocation is released via block rewards, not cliff-based. Foundation &amp; Team have 1-year cliff then linear monthly vesting.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Economic Model */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              Economic Model
              <span className="tamil-text text-primary-400 text-xl ml-3">பொருளாதார மாதிரி</span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {economicModel.map((section, i) => (
              <FadeIn key={section.title} delay={i * 0.08}>
                <div className="p-5 rounded-2xl bg-[#13131F] border border-white/8 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary-500/10">
                      <section.icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{section.title}</h3>
                      <p className="tamil-text text-text-muted text-xs">{section.titleTamil}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-text-secondary text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
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

      {/* Token Utility Deep Dive */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0A0A16]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              Token Utility
              <span className="tamil-text text-primary-400 text-xl ml-3">பயன்பாடு</span>
            </h2>
            <p className="text-text-secondary">Four core uses of TMZ in the Tamizhi ecosystem.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {utility.map((u, i) => (
              <FadeIn key={u.title} delay={i * 0.1}>
                <div className="p-6 rounded-2xl bg-[#13131F] border border-white/8 hover:border-white/15 transition-all duration-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${u.bg}`}>
                      <u.icon className={`w-6 h-6 ${u.color}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{u.title}</h3>
                      <p className="tamil-text text-text-muted text-xs">{u.titleTamil}</p>
                    </div>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed mb-4">{u.desc}</p>
                  <div className="space-y-1">
                    {u.examples.map((ex) => (
                      <div key={ex} className="flex items-center gap-2 text-xs text-text-muted">
                        <ChevronRight className="w-3 h-3 text-primary-400" />
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

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              FAQ
              <span className="tamil-text text-primary-400 text-xl ml-3">கேள்விகள்</span>
            </h2>
          </FadeIn>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={faq.q} delay={i * 0.07}>
                <div className="p-5 rounded-2xl bg-[#13131F] border border-white/8">
                  <h3 className="text-white font-semibold mb-2 flex items-start gap-2">
                    <span className="text-primary-400 font-mono text-sm mt-0.5">Q{i + 1}</span>
                    {faq.q}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed pl-7">{faq.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-2xl font-bold text-white mb-4">Ready to earn TMZ?</h2>
            <p className="tamil-text text-text-secondary mb-6">TMZ சம்பாதிக்க தயாரா?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wallet"
                className="group inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm"
                style={{ boxShadow: '0 0 24px rgba(232,80,10,0.35)' }}
              >
                Launch Wallet
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/whitepaper#tokenomics"
                className="inline-flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-text-secondary hover:text-white px-7 py-3.5 rounded-xl transition-all duration-200 text-sm"
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
