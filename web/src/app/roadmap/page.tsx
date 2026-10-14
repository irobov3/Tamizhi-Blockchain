'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Rocket,
  Globe,
  BookOpen,
  Brain,
  Flag,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

// ─── Helper ───────────────────────────────────────────────────────────────────
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
  const inView = useInView(ref, { once: true, margin: '-40px' });
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

// ─── Types ────────────────────────────────────────────────────────────────────
type DeliverableStatus = 'done' | 'in-progress' | 'planned';

interface Deliverable {
  text: string;
  status: DeliverableStatus;
}

interface Phase {
  phase: string;
  quarter: string;
  title: string;
  titleTamil: string;
  status: 'completed' | 'in-progress' | 'planned';
  icon: React.ElementType;
  borderColor: string;
  glowColor: string;
  badgeColor: string;
  badgeText: string;
  dotColor: string;
  summary: string;
  deliverables: Deliverable[];
}

// ─── Phase data ───────────────────────────────────────────────────────────────
const phases: Phase[] = [
  {
    phase: 'Phase 1',
    quarter: 'Q1 2026',
    title: 'Testnet Launch',
    titleTamil: 'சோதனை வலைப்பின்னல்',
    status: 'completed',
    icon: Rocket,
    borderColor: 'border-green-500/40',
    glowColor: 'rgba(34,197,94,0.12)',
    badgeColor: 'bg-green-500/15 text-green-400 border-green-500/30',
    badgeText: '✅ Complete',
    dotColor: 'bg-green-400',
    summary:
      'Deploy the Tamizhi chain (tamizhi-1) on testnet with BFT consensus, TMZ token, 5 custom modules, and full-stack apps for iOS, Android, Windows, macOS, and Linux.',
    deliverables: [
      { text: 'Cosmos SDK chain deployed (tamizhi-1)', status: 'done' },
      { text: 'CometBFT consensus (2s block time)', status: 'done' },
      { text: 'TMZ token (1,000,000,000 supply) at genesis', status: 'done' },
      { text: 'x/literature module — on-chain work registry', status: 'done' },
      { text: 'x/nodes module — service node registry', status: 'done' },
      { text: 'x/rewards module — community reward distribution', status: 'done' },
      { text: 'x/security module — alert management', status: 'done' },
      { text: 'x/identity module — on-chain identity records', status: 'done' },
      { text: 'Testnet launch with public faucet', status: 'done' },
      { text: 'Mobile apps: iOS + Android (React Native / Expo)', status: 'done' },
      { text: 'Desktop apps: Windows, macOS, Linux (Electron)', status: 'done' },
      { text: 'Docker Compose + k8s deployment manifests', status: 'done' },
    ],
  },
  {
    phase: 'Phase 2',
    quarter: 'Q2 2026',
    title: 'Mainnet + Mobile Apps',
    titleTamil: 'Mainnet + மொபைல் ஆப்கள்',
    status: 'in-progress',
    icon: Globe,
    borderColor: 'border-[#00d4ff]/40',
    glowColor: 'rgba(0,212,255,0.1)',
    badgeColor: 'bg-cyan-500/15 text-[#00d4ff] border-cyan-500/30',
    badgeText: '🔄 In Progress',
    dotColor: 'bg-[#00d4ff] animate-pulse',
    summary:
      'Launch the Tamizhi mainnet, integrate Keplr wallet, deploy CosmWasm smart contracts, go live with the block explorer, and open the Literature NFT marketplace.',
    deliverables: [
      { text: 'Mainnet genesis ceremony', status: 'in-progress' },
      { text: 'Keplr wallet integration (chain registered)', status: 'in-progress' },
      { text: 'CosmWasm smart contracts enabled (wasmd v0.53)', status: 'in-progress' },
      { text: 'Block explorer live (public URL)', status: 'in-progress' },
      { text: 'Literature NFT marketplace (Phase 1)', status: 'planned' },
      { text: 'Security audit (Oak Security / Halborn)', status: 'planned' },
      { text: 'Bug bounty programme launch', status: 'planned' },
      { text: 'Governance portal UI', status: 'planned' },
      { text: 'Hardware wallet support (Ledger)', status: 'planned' },
      { text: 'Cross-chain bridge to Cosmos Hub', status: 'planned' },
    ],
  },
  {
    phase: 'Phase 3',
    quarter: 'Q3 2026',
    title: 'Literature Registry + CosmWasm',
    titleTamil: 'இலக்கியம் + CosmWasm',
    status: 'planned',
    icon: BookOpen,
    borderColor: 'border-[#d4a017]/30',
    glowColor: 'rgba(212,160,23,0.08)',
    badgeColor: 'bg-yellow-500/10 text-[#d4a017] border-yellow-500/20',
    badgeText: '📋 Planned',
    dotColor: 'bg-white/20',
    summary:
      'Grow the validator set to 10+, go live with on-chain governance voting, connect via IBC to Cosmos Hub and Osmosis, and launch on-chain AI translation services.',
    deliverables: [
      { text: '10+ active validators on mainnet', status: 'planned' },
      { text: 'Governance voting live (first on-chain proposals)', status: 'planned' },
      { text: 'IBC connection to Cosmos Hub', status: 'planned' },
      { text: 'IBC connection to Osmosis (TMZ liquidity)', status: 'planned' },
      { text: 'Tamil Literature Archive — 500 works', status: 'planned' },
      { text: 'Tamizhi Literary NFT standard (CosmWasm)', status: 'planned' },
      { text: 'NFT marketplace — buy, sell, transfer', status: 'planned' },
      { text: 'Tamil Scholar DAO (grant voting)', status: 'planned' },
      { text: 'Curation Committee multisig smart contract', status: 'planned' },
      { text: 'AI translation services on-chain (Claude API)', status: 'planned' },
    ],
  },
  {
    phase: 'Phase 4',
    quarter: 'Q4 2026',
    title: 'AI Integration + Ecosystem',
    titleTamil: 'AI + சூழல்',
    status: 'planned',
    icon: Brain,
    borderColor: 'border-[#7c3aed]/30',
    glowColor: 'rgba(124,58,237,0.08)',
    badgeColor: 'bg-purple-500/10 text-[#7c3aed] border-purple-500/20',
    badgeText: '📋 Planned',
    dotColor: 'bg-white/20',
    summary:
      'Scale to 1,000+ literary works on-chain, launch cross-chain bridges to major DeFi networks, open the mobile dApp store, and deploy the Tamil language AI model.',
    deliverables: [
      { text: '1,000+ literary works preserved on-chain', status: 'planned' },
      { text: 'Thirukkural (1,330 couplets) fully on-chain as NFTs', status: 'planned' },
      { text: 'Cross-chain bridges to major DeFi networks', status: 'planned' },
      { text: 'Mobile dApp store launch', status: 'planned' },
      { text: 'Tamil language AI model (pre-training complete)', status: 'planned' },
      { text: 'Tamil ↔ English + 20 language translation', status: 'planned' },
      { text: 'On-chain inference marketplace (pay with TMZ)', status: 'planned' },
      { text: 'Tamizhi AI API (REST + streaming)', status: 'planned' },
      { text: 'Tamil speech-to-text / text-to-speech', status: 'planned' },
      { text: 'Community DApps SDK & framework', status: 'planned' },
    ],
  },
];

// ─── Status config ────────────────────────────────────────────────────────────
const statusConfig = {
  done: {
    Icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-500/5 border border-green-500/15',
    textColor: 'text-green-100/80',
  },
  'in-progress': {
    Icon: Clock,
    color: 'text-[#00d4ff]',
    bg: 'bg-cyan-500/5 border border-cyan-500/15',
    textColor: 'text-white',
  },
  planned: {
    Icon: Circle,
    color: 'text-white/20',
    bg: 'bg-white/[0.02] border border-white/5',
    textColor: 'text-white/40',
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-[#0e0824] text-[#fdf6e3] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background */}
        <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full opacity-8 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/25 text-[#7c3aed] text-sm font-semibold mb-6">
              <Flag className="w-4 h-4" />
              Project Roadmap
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-white mb-3 tracking-tight">
              வழிமாப்பு
            </h1>
            <p className="text-3xl font-black text-white/70 mb-5">Roadmap 2026</p>
            <p className="text-white/40 text-lg max-w-2xl mx-auto leading-relaxed">
              From blockchain foundation to Tamil AI ecosystem — four phases building
              the world&apos;s first blockchain dedicated to Tamil civilization.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── STATUS BANNER ────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 mb-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-green-500/10 border border-green-500/25"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0" />
              <div>
                <div className="text-white font-semibold">Phase 1 Complete — Entering Phase 2</div>
                <div className="tamil-text text-green-400 text-sm">
                  நடப்பு நிலை: Phase 2 — Mainnet Launch
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-white/50">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                12 of 12 Phase 1 deliverables complete
              </div>
              <Link
                href="/explorer"
                className="flex items-center gap-1 text-[#00d4ff] hover:text-cyan-300 transition-colors font-semibold text-sm"
              >
                View Chain
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PHASE CARDS ──────────────────────────────────────────────────── */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-5xl mx-auto space-y-10">
          {phases.map((phase, phaseIndex) => {
            const PhaseIcon = phase.icon;
            const doneCount = phase.deliverables.filter((d) => d.status === 'done').length;
            const inProgressCount = phase.deliverables.filter((d) => d.status === 'in-progress').length;
            const progressPct =
              phase.status === 'in-progress'
                ? Math.round((doneCount / phase.deliverables.length) * 100)
                : phase.status === 'completed'
                ? 100
                : 0;

            return (
              <FadeIn key={phase.phase} delay={phaseIndex * 0.1}>
                <div
                  className={`rounded-3xl border ${phase.borderColor} overflow-hidden bg-[#1a1040]`}
                  style={{ boxShadow: `0 0 60px ${phase.glowColor}` }}
                >
                  {/* Phase header */}
                  <div className="p-7 pb-5 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/8 flex-shrink-0">
                          <PhaseIcon className="w-6 h-6 text-white/60" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="font-mono text-xs text-white/30">{phase.phase}</span>
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${phase.badgeColor}`}
                            >
                              {phase.badgeText}
                            </span>
                          </div>
                          <h2 className="text-2xl font-black text-white mb-0.5">{phase.title}</h2>
                          <p className="tamil-text text-[#d4a017] text-sm">{phase.titleTamil}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-white font-mono font-bold text-sm">{phase.quarter}</div>
                        {phase.status === 'in-progress' && (
                          <div className="text-white/30 text-xs mt-1">
                            {doneCount} done · {inProgressCount} active
                          </div>
                        )}
                        {phase.status === 'completed' && (
                          <div className="text-green-400 text-xs mt-1">All deliverables complete</div>
                        )}
                      </div>
                    </div>
                    <p className="text-white/40 text-sm leading-relaxed mt-4 sm:ml-16">
                      {phase.summary}
                    </p>
                  </div>

                  {/* Deliverables grid */}
                  <div className="p-7 pt-5">
                    <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                      Deliverables
                      <span className="text-white/30 font-normal font-mono">
                        ({phase.deliverables.length})
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {phase.deliverables.map((d) => {
                        const cfg = statusConfig[d.status];
                        const StatusIcon = cfg.Icon;
                        return (
                          <div
                            key={d.text}
                            className={`flex items-start gap-2.5 p-3 rounded-xl ${cfg.bg}`}
                          >
                            <StatusIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                            <span className={`text-sm leading-snug ${cfg.textColor}`}>{d.text}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar — show for in-progress or completed */}
                    {(phase.status === 'in-progress' || phase.status === 'completed') && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between text-xs text-white/30 mb-2">
                          <span>Progress</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background:
                                phase.status === 'completed'
                                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                  : 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                            }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${progressPct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                        {phase.status === 'in-progress' && (
                          <div className="flex gap-4 mt-2 text-xs">
                            <span className="flex items-center gap-1 text-green-400">
                              <CheckCircle2 className="w-3 h-3" /> {doneCount} done
                            </span>
                            <span className="flex items-center gap-1 text-[#00d4ff]">
                              <Clock className="w-3 h-3" /> {inProgressCount} in progress
                            </span>
                            <span className="flex items-center gap-1 text-white/30">
                              <Circle className="w-3 h-3" />{' '}
                              {phase.deliverables.length - doneCount - inProgressCount} planned
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[#2a1f5c]">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-2xl font-black text-white mb-3">Be part of Phase 2</h2>
            <p className="tamil-text text-white/40 mb-8">Phase 2-இல் பங்கேற்கவும்</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wallet"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[#0e0824] text-sm transition-all duration-200 hover:opacity-90 shadow-[0_0_24px_rgba(0,212,255,0.3)]"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)' }}
              >
                Launch App
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/whitepaper#roadmap"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#2a1f5c] text-white/60 hover:text-white hover:border-[#7c3aed]/60 text-sm font-semibold transition-all duration-200"
              >
                Whitepaper Roadmap
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  );
}
