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
  MessageSquare,
  Globe,
  Wallet,
  BookOpen,
  Brain,
  Shield,
  Zap,
  Users,
  Code2,
  Cpu,
  Database,
  Smartphone,
  Lock,
  ExternalLink,
  Flag,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
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

type DeliverableStatus = 'done' | 'in-progress' | 'planned';

interface Deliverable {
  text: string;
  status: DeliverableStatus;
}

interface Phase {
  phase: string;
  title: string;
  titleTamil: string;
  date: string;
  status: 'in-progress' | 'planned' | 'completed';
  color: string;
  glowColor: string;
  icon: React.ElementType;
  summary: string;
  deliverables: Deliverable[];
}

const phases: Phase[] = [
  {
    phase: 'Phase 1',
    title: 'Blockchain Foundation + Messenger',
    titleTamil: 'அடித்தளம் + செய்தியாளர்',
    date: '2025 – Q2 2026',
    status: 'in-progress',
    color: 'border-primary-500/40 bg-primary-500/5',
    glowColor: 'rgba(232,80,10,0.15)',
    icon: Rocket,
    summary:
      'Launch the Tamizhi blockchain (tamizhi-1), establish the validator network, issue TMZ tokens, and release the Tamizhi Messenger across all platforms.',
    deliverables: [
      { text: 'Tamizhi Chain (tamizhi-1) genesis block', status: 'done' },
      { text: 'TMZ token (utmz) — 1,000,000,000 supply', status: 'done' },
      { text: 'BFT consensus + initial validator set', status: 'done' },
      { text: 'Chain Explorer (web-based block explorer)', status: 'done' },
      { text: 'Web Wallet — Keplr compatible, send/receive/stake', status: 'done' },
      { text: 'Cross-chain bridge integration for interoperability', status: 'done' },
      { text: 'Tamizhi WASM VM integration for smart contracts', status: 'done' },
      { text: 'Tamizhi Messenger — Web app (E2E encrypted)', status: 'in-progress' },
      { text: 'Tamizhi Messenger — Android app (React Native)', status: 'in-progress' },
      { text: 'Tamizhi Messenger — iOS app (React Native)', status: 'in-progress' },
      { text: 'Tamizhi Messenger — Windows / Mac / Linux desktop', status: 'planned' },
      { text: 'Public testnet with faucet', status: 'in-progress' },
      { text: 'Docker Compose + k8s deployment manifests', status: 'done' },
    ],
  },
  {
    phase: 'Phase 2',
    title: 'Browser + Wallet + TMZ Mainnet',
    titleTamil: 'உலாவி + நிதியிடம் + Mainnet',
    date: 'Q3–Q4 2026',
    status: 'planned',
    color: 'border-blue-500/30 bg-blue-500/3',
    glowColor: 'rgba(59,130,246,0.1)',
    icon: Globe,
    summary:
      'Launch Tamizhi Browser (Tamil-first web browser with AI sidebar), TMZ Coin mainnet, enhanced wallet, and first cross-chain bridge connections.',
    deliverables: [
      { text: 'Tamizhi Browser (Ulaa-based, Tamil-first)', status: 'planned' },
      { text: 'Built-in AI sidebar (early Tamil NLP model)', status: 'planned' },
      { text: 'TMZ Coin mainnet launch (genesis ceremony)', status: 'planned' },
      { text: 'Cross-chain bridge to major DeFi networks', status: 'planned' },
      { text: 'Liquidity bridge for TMZ trading', status: 'planned' },
      { text: 'Tamizhi Wallet — full hardware wallet support', status: 'planned' },
      { text: 'Third-party wallet integrations', status: 'planned' },
      { text: 'Governance portal UI', status: 'planned' },
      { text: 'External security audit (Oak Security / Halborn)', status: 'planned' },
      { text: 'Bug bounty programme launch', status: 'planned' },
    ],
  },
  {
    phase: 'Phase 3',
    title: 'Literature Archive + NFT + Community DApps',
    titleTamil: 'இலக்கியம் + NFT + DApps',
    date: '2027',
    status: 'planned',
    color: 'border-amber-500/30 bg-amber-500/3',
    glowColor: 'rgba(245,197,24,0.08)',
    icon: BookOpen,
    summary:
      'Launch the Tamil Literature Archive with 2,000+ classical works as on-chain NFTs, a Tamizhi smart contract marketplace, and a community DAO for grants to Tamil scholars.',
    deliverables: [
      { text: 'Tamil Literature Archive — Phase 1 (500 works)', status: 'planned' },
      { text: 'Tamil Literature Archive — Phase 2 (2,000+ works)', status: 'planned' },
      { text: 'Tamizhi Literary NFT standard (on-chain)', status: 'planned' },
      { text: 'NFT marketplace (buy/sell/transfer)', status: 'planned' },
      { text: 'Tamil Scholar DAO (grant voting)', status: 'planned' },
      { text: 'Curation Committee multisig smart contract', status: 'planned' },
      { text: 'Thirukkural on-chain (1,330 kurals as NFTs)', status: 'planned' },
      { text: 'Sangam poetry collection (2,000+ poems)', status: 'planned' },
      { text: 'Community DApps SDK / framework', status: 'planned' },
      { text: 'IPFS + Arweave permanence pinning', status: 'planned' },
    ],
  },
  {
    phase: 'Phase 4',
    title: 'Tamizhi AI Platform',
    titleTamil: 'செயற்கை நுண்ணறிவு தளம்',
    date: '2027–2028',
    status: 'planned',
    color: 'border-purple-500/30 bg-purple-500/3',
    glowColor: 'rgba(139,92,246,0.08)',
    icon: Brain,
    summary:
      'Build and deploy the Tamizhi AI — a Tamil-native language model trained on the on-chain literary corpus. Make inference available on-chain and via API.',
    deliverables: [
      { text: 'Tamil corpus data pipeline (on-chain → training)', status: 'planned' },
      { text: 'Pre-training: Tamil language model (7B parameters)', status: 'planned' },
      { text: 'Classical Tamil grammar understanding', status: 'planned' },
      { text: 'Sangam poetry comprehension & analysis', status: 'planned' },
      { text: 'Translation: Tamil ↔ English, Hindi, French, German, Japanese (20+ total)', status: 'planned' },
      { text: 'Transliteration: Tamil → ISO 15919 romanization', status: 'planned' },
      { text: 'On-chain inference marketplace (pay with TMZ)', status: 'planned' },
      { text: 'Tamizhi AI API (REST + streaming)', status: 'planned' },
      { text: 'AI-powered literature discovery and recommendation', status: 'planned' },
      { text: 'Tamil speech-to-text / text-to-speech (Phase 4b)', status: 'planned' },
    ],
  },
];

const statusConfig = {
  done: {
    icon: CheckCircle2,
    color: 'text-green-400',
    label: 'Complete',
  },
  'in-progress': {
    icon: Clock,
    color: 'text-primary-400',
    label: 'In Progress',
  },
  planned: {
    icon: Circle,
    color: 'text-text-muted',
    label: 'Planned',
  },
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-[#0D0D1A] overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary-500/6 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(232,80,10,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(232,80,10,0.08) 1px, transparent 1px)`,
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-400 text-sm font-medium mb-6">
              <Flag className="w-4 h-4" />
              Project Roadmap
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              வழிமாப்பு
            </h1>
            <p className="text-3xl font-bold text-text-secondary mb-4">Project Roadmap</p>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
              From blockchain foundation to Tamil AI platform — a four-phase journey spanning
              2025 to 2028. Building the world&apos;s first Tamil AI blockchain ecosystem, one block at a time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Current Status Banner */}
      <section className="px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-primary-500/10 border border-primary-500/25"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary-400 animate-pulse flex-shrink-0" />
              <div>
                <div className="text-white font-semibold">Currently in Phase 1</div>
                <div className="tamil-text text-primary-400 text-sm">நடப்பு நிலை: Phase 1 — Blockchain + Messenger</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                7 of 13 deliverables complete
              </div>
              <Link
                href="/explorer"
                className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors font-medium"
              >
                View Chain <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Phase cards */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-5xl mx-auto space-y-10">
          {phases.map((phase, phaseIndex) => {
            const PhaseIcon = phase.icon;
            const doneCount = phase.deliverables.filter((d) => d.status === 'done').length;
            const inProgressCount = phase.deliverables.filter((d) => d.status === 'in-progress').length;

            return (
              <FadeIn key={phase.phase} delay={phaseIndex * 0.1}>
                <div
                  className={`rounded-3xl border ${phase.color} overflow-hidden`}
                  style={{ boxShadow: `0 0 60px ${phase.glowColor}` }}
                >
                  {/* Phase header */}
                  <div className="p-7 pb-5 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/8 flex-shrink-0">
                          <PhaseIcon className="w-6 h-6 text-primary-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="font-mono text-xs text-text-muted">{phase.phase}</span>
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                                phase.status === 'in-progress'
                                  ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                                  : phase.status === 'completed'
                                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                  : 'bg-white/5 text-text-muted border-white/10'
                              }`}
                            >
                              {phase.status === 'in-progress'
                                ? '🔵 In Progress'
                                : phase.status === 'completed'
                                ? '✅ Complete'
                                : '⚪ Planned'}
                            </span>
                          </div>
                          <h2 className="text-2xl font-bold text-white mb-0.5">{phase.title}</h2>
                          <p className="tamil-text text-primary-400 text-sm">{phase.titleTamil}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-white font-mono text-sm">{phase.date}</div>
                        {phase.status === 'in-progress' && (
                          <div className="text-text-muted text-xs mt-1">
                            {doneCount} done · {inProgressCount} active
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed mt-4 ml-0 sm:ml-16">{phase.summary}</p>
                  </div>

                  {/* Deliverables */}
                  <div className="p-7 pt-5">
                    <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                      <span>Deliverables</span>
                      <span className="text-text-muted font-normal font-mono">({phase.deliverables.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {phase.deliverables.map((d) => {
                        const cfg = statusConfig[d.status];
                        const StatusIcon = cfg.icon;
                        return (
                          <div
                            key={d.text}
                            className={`flex items-start gap-2.5 p-3 rounded-xl ${
                              d.status === 'done'
                                ? 'bg-green-500/5 border border-green-500/15'
                                : d.status === 'in-progress'
                                ? 'bg-primary-500/5 border border-primary-500/15'
                                : 'bg-white/2 border border-white/5'
                            }`}
                          >
                            <StatusIcon
                              className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color}`}
                            />
                            <span
                              className={`text-sm leading-snug ${
                                d.status === 'done'
                                  ? 'text-green-100/80'
                                  : d.status === 'in-progress'
                                  ? 'text-white'
                                  : 'text-text-muted'
                              }`}
                            >
                              {d.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    {phase.status === 'in-progress' && (
                      <div className="mt-5">
                        <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                          <span>Progress</span>
                          <span>{Math.round((doneCount / phase.deliverables.length) * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(doneCount / phase.deliverables.length) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle2 className="w-3 h-3" /> {doneCount} done
                          </span>
                          <span className="flex items-center gap-1 text-primary-400">
                            <Clock className="w-3 h-3" /> {inProgressCount} in progress
                          </span>
                          <span className="flex items-center gap-1 text-text-muted">
                            <Circle className="w-3 h-3" /> {phase.deliverables.length - doneCount - inProgressCount} planned
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-2xl font-bold text-white mb-3">Be part of Phase 1</h2>
            <p className="tamil-text text-text-secondary mb-6">Phase 1-இல் பங்கேற்கவும்</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wallet"
                className="group inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm"
                style={{ boxShadow: '0 0 24px rgba(232,80,10,0.35)' }}
              >
                Launch App
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/whitepaper#roadmap"
                className="inline-flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-text-secondary hover:text-white px-7 py-3.5 rounded-xl transition-all duration-200 text-sm"
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
