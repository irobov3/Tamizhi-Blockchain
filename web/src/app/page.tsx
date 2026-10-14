'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Lock,
  Zap,
  Globe,
  Bot,
  Smartphone,
  Shield,
  MessageCircle,
  Wallet,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Clock,
  Twitter,
  Github,
  Send,
  MessageSquare,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

// ─── Live stats (with fallback demo values) ───────────────────────────────────
function useChainStats() {
  const [stats, setStats] = useState({
    blockHeight: 142_831,
    worksPreserved: 47,
    validators: 5,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest', {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          const height = parseInt(data?.block?.header?.height ?? '0', 10);
          if (height > 0) setStats((s) => ({ ...s, blockHeight: height }));
        }
      } catch {
        // silently use fallback
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 6000);
    return () => clearInterval(id);
  }, []);

  return stats;
}

// ─── Feature cards ────────────────────────────────────────────────────────────
const features = [
  {
    emoji: '🔏',
    title: 'Immutable Literature',
    desc: 'Every Tamil text cryptographically preserved forever on-chain with IPFS + Arweave permanence.',
  },
  {
    emoji: '⚡',
    title: 'Fast & Cheap',
    desc: '2-second block finality, near-zero fees powered by Cosmos SDK and CometBFT consensus.',
  },
  {
    emoji: '🌐',
    title: 'Web3 Native',
    desc: 'Built-in wallet, Keplr support, and CosmWasm smart contracts for a full dApp ecosystem.',
  },
  {
    emoji: '🤖',
    title: 'AI-Powered',
    desc: 'Claude AI integration for Tamil text analysis, translation, and literary comprehension.',
  },
  {
    emoji: '📱',
    title: 'Cross-Platform',
    desc: 'iOS, Android, Windows, macOS, Linux, and Web apps — your chain, everywhere.',
  },
  {
    emoji: '🏛️',
    title: 'Decentralized',
    desc: 'No single point of failure. Community governance controls every chain parameter.',
  },
];

// ─── Literature works ─────────────────────────────────────────────────────────
const literatureWorks = [
  {
    tamil: 'திருக்குறள்',
    name: 'Thirukkural',
    period: '200 BC',
    desc: 'The universal scripture of ethics — 1,330 couplets of timeless wisdom.',
    author: 'Thiruvalluvar',
  },
  {
    tamil: 'சிலப்பதிகாரம்',
    name: 'Silappatikaram',
    period: '2nd century AD',
    desc: 'The anklet epic — one of the five great Tamil epics of love and justice.',
    author: 'Ilanko Adigal',
  },
  {
    tamil: 'புறநானூறு',
    name: 'Purananuru',
    period: '300 BC – 300 AD',
    desc: 'An anthology of 400 ancient Tamil poems on war, valor, and generosity.',
    author: 'Various Sangam Poets',
  },
  {
    tamil: 'தொல்காப்பியம்',
    name: 'Tolkāppiyam',
    period: '3rd century BC',
    desc: 'The oldest surviving Tamil grammar — the foundation of Tamil linguistic science.',
    author: 'Tolkāppiyar',
  },
];

// ─── Ecosystem apps ───────────────────────────────────────────────────────────
const ecosystemApps = [
  {
    emoji: '💬',
    title: 'Messenger',
    desc: 'Encrypted on-chain messaging for the global Tamil diaspora.',
    href: '/messenger',
    color: 'from-violet-600/20 to-purple-800/10',
    border: 'border-violet-500/30',
    accent: 'text-violet-400',
  },
  {
    emoji: '💳',
    title: 'Wallet',
    desc: 'Send, receive, and stake TMZ with Keplr and hardware wallet support.',
    href: '/wallet',
    color: 'from-cyan-600/20 to-blue-800/10',
    border: 'border-cyan-500/30',
    accent: 'text-cyan-400',
  },
  {
    emoji: '🌐',
    title: 'Browser',
    desc: 'Web3-native mobile browser with built-in AI sidebar.',
    href: '#',
    color: 'from-emerald-600/20 to-teal-800/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
  },
  {
    emoji: '🤖',
    title: 'AI Assistant',
    desc: 'Tamil language AI powered by Claude — translation, analysis, and more.',
    href: '/ai',
    color: 'from-amber-600/20 to-orange-800/10',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
  },
];

// ─── Roadmap phases ───────────────────────────────────────────────────────────
const roadmapPhases = [
  {
    quarter: 'Q1 2026',
    label: 'Testnet Launch',
    status: 'complete',
    icon: '✅',
    color: 'border-green-500/40',
    dot: 'bg-green-400',
  },
  {
    quarter: 'Q2 2026',
    label: 'Mainnet + Mobile Apps',
    status: 'in-progress',
    icon: '🔄',
    color: 'border-cyan-500/40',
    dot: 'bg-cyan-400',
  },
  {
    quarter: 'Q3 2026',
    label: 'Literature Registry + CosmWasm',
    status: 'planned',
    icon: '📋',
    color: 'border-[#2a1f5c]',
    dot: 'bg-white/20',
  },
  {
    quarter: 'Q4 2026',
    label: 'AI Integration + Ecosystem',
    status: 'planned',
    icon: '📋',
    color: 'border-[#2a1f5c]',
    dot: 'bg-white/20',
  },
];

// ─── Tokenomics bars ──────────────────────────────────────────────────────────
const tokenSlices = [
  { label: 'Validators', pct: 40, color: 'bg-[#00d4ff]', text: 'text-[#00d4ff]' },
  { label: 'Community', pct: 30, color: 'bg-[#7c3aed]', text: 'text-[#7c3aed]' },
  { label: 'Development', pct: 20, color: 'bg-[#d4a017]', text: 'text-[#d4a017]' },
  { label: 'Reserve', pct: 10, color: 'bg-white/30', text: 'text-white/50' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const stats = useChainStats();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setJoined(true);
  };

  return (
    <div className="min-h-screen bg-[#0e0824] text-[#fdf6e3] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0824] via-[#1a0a3c] to-[#0e0824]" />

        {/* Animated orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
            animation: 'orb1 8s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
            animation: 'orb2 10s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, #2563eb 0%, transparent 60%)',
            animation: 'orb3 12s ease-in-out infinite alternate',
          }}
        />

        {/* CSS keyframes injected via style tag */}
        <style>{`
          @keyframes orb1 {
            from { transform: translate(-20px, -30px) scale(1); }
            to   { transform: translate(20px, 30px) scale(1.15); }
          }
          @keyframes orb2 {
            from { transform: translate(30px, 20px) scale(1); }
            to   { transform: translate(-30px, -20px) scale(1.2); }
          }
          @keyframes orb3 {
            from { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
            to   { transform: translate(-50%, -50%) scale(1.1) rotate(10deg); }
          }
          @keyframes statPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}</style>

        {/* Hero content */}
        <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto pt-24 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Tamil script */}
            <p
              className="tamil-text font-black mb-4 text-[#d4a017]"
              style={{ fontSize: 'clamp(40px, 8vw, 72px)' }}
            >
              தமிழி
            </p>

            {/* Main headline */}
            <h1
              className="font-black text-white leading-tight mb-6"
              style={{ fontSize: 'clamp(28px, 5vw, 52px)' }}
            >
              The Blockchain for{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Tamil Civilization
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-white/60 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
              Preserving 2,000+ years of Tamil literature on an immutable,
              community-owned blockchain built for the Tamil people.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Link
                href="/explorer"
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[#0e0824] text-base transition-all duration-200 hover:opacity-90 shadow-[0_0_30px_rgba(0,212,255,0.4)] hover:shadow-[0_0_50px_rgba(0,212,255,0.6)]"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)' }}
              >
                Launch App
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/whitepaper"
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base border border-[#2a1f5c] hover:border-[#7c3aed]/60 hover:bg-[#1a1040] transition-all duration-200"
              >
                Read Whitepaper
                <BookOpen className="w-5 h-5" />
              </Link>
            </div>

            {/* Live stats bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 px-6 sm:px-10 py-4 rounded-2xl bg-white/5 border border-[#2a1f5c] backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#00d4ff] text-sm">🔗</span>
                <span className="text-white/50 text-xs uppercase tracking-wider">Block</span>
                <span className="text-white font-mono font-bold text-sm">
                  #{stats.blockHeight.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-[#d4a017] text-sm">📜</span>
                <span className="text-white/50 text-xs uppercase tracking-wider">Works Preserved</span>
                <span className="text-white font-mono font-bold text-sm">{stats.worksPreserved}</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-[#7c3aed] text-sm">🌐</span>
                <span className="text-white/50 text-xs uppercase tracking-wider">Validators</span>
                <span className="text-white font-mono font-bold text-sm">{stats.validators}</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-semibold">Testnet Live</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="tamil-text text-[#d4a017] text-sm font-semibold mb-3">திறன்கள்</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Built for the Future of Tamil
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              A full-stack blockchain ecosystem purpose-built for Tamil civilization.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="group p-6 rounded-2xl bg-[#1a1040] border border-[#2a1f5c] hover:border-[#7c3aed]/50 hover:bg-[#1e1248] transition-all duration-300"
              >
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TAMIL LITERATURE ─────────────────────────────────────────────────── */}
      <section id="literature" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0618]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="tamil-text text-[#d4a017] text-sm font-semibold mb-3">இலக்கியம்</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Preserving Tamil Heritage
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Ancient masterpieces sealed forever in cryptographic immutability.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {literatureWorks.map((work, i) => (
              <motion.div
                key={work.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group flex flex-col p-6 rounded-2xl bg-[#1a1040] border border-[#2a1f5c] hover:border-[#d4a017]/40 transition-all duration-300"
              >
                {/* Tamil name */}
                <p className="tamil-text text-[#d4a017] font-black text-xl mb-1">{work.tamil}</p>
                <h3 className="text-white font-bold text-base mb-1">{work.name}</h3>
                <p className="text-white/30 text-xs font-mono mb-3">{work.period}</p>
                <p className="text-white/50 text-sm leading-relaxed flex-1">{work.desc}</p>
                <p className="text-white/30 text-xs mt-3 mb-4">— {work.author}</p>
                <Link
                  href="/explorer"
                  className="flex items-center gap-1.5 text-[#00d4ff] text-xs font-semibold hover:gap-2.5 transition-all duration-200 group-hover:text-cyan-300"
                >
                  View on Chain
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="tamil-text text-[#d4a017] text-sm font-semibold mb-3">சூழல்</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Full Ecosystem</h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Four flagship apps connecting Tamil communities worldwide.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ecosystemApps.map((app, i) => (
              <motion.div
                key={app.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Link
                  href={app.href}
                  className={`group flex flex-col p-6 rounded-2xl bg-gradient-to-br ${app.color} border ${app.border} hover:scale-[1.02] transition-all duration-300 h-full`}
                >
                  <div className="text-4xl mb-4">{app.emoji}</div>
                  <h3 className="text-white font-bold text-lg mb-2">{app.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed flex-1">{app.desc}</p>
                  <div className={`flex items-center gap-1.5 mt-4 text-xs font-semibold ${app.accent}`}>
                    Open App
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOKENOMICS PREVIEW ───────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0618]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="tamil-text text-[#d4a017] text-sm font-semibold mb-3">டோக்கன்</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">TMZ Token</h2>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
          >
            {[
              { label: 'Total Supply', value: '1,000,000,000 TMZ' },
              { label: 'Block Reward', value: '5 TMZ' },
              { label: 'Min Stake', value: '1,000 TMZ' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-[#1a1040] border border-[#2a1f5c]"
              >
                <p className="text-white font-black text-xl sm:text-2xl mb-1 font-mono">{stat.value}</p>
                <p className="text-white/40 text-xs uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Distribution bars */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 rounded-2xl bg-[#1a1040] border border-[#2a1f5c] mb-8"
          >
            <h3 className="text-white font-bold mb-5">Distribution</h3>
            <div className="space-y-4">
              {tokenSlices.map((slice, i) => (
                <div key={slice.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium ${slice.text}`}>{slice.label}</span>
                    <span className="text-white/50 text-sm font-mono">{slice.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${slice.color}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${slice.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="text-center">
            <Link
              href="/tokenomics"
              className="inline-flex items-center gap-2 text-[#00d4ff] font-semibold hover:gap-3 transition-all duration-200"
            >
              View full tokenomics
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── ROADMAP PREVIEW ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="tamil-text text-[#d4a017] text-sm font-semibold mb-3">வழிமாப்பு</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">2026 Roadmap</h2>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-green-500/60 via-cyan-500/40 to-[#2a1f5c]" />

            <div className="space-y-6">
              {roadmapPhases.map((phase, i) => (
                <motion.div
                  key={phase.quarter}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`relative pl-14 p-5 rounded-2xl bg-[#1a1040] border ${phase.color} transition-all duration-300`}
                >
                  {/* Dot */}
                  <div
                    className={`absolute left-[14px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${phase.dot} ${phase.status === 'in-progress' ? 'animate-pulse' : ''}`}
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl">{phase.icon}</span>
                    <span className="text-white/40 text-xs font-mono uppercase tracking-widest">{phase.quarter}</span>
                    <span className="text-white font-semibold">{phase.label}</span>
                    {phase.status === 'complete' && (
                      <span className="ml-auto text-xs text-green-400 font-semibold">Complete</span>
                    )}
                    {phase.status === 'in-progress' && (
                      <span className="ml-auto text-xs text-cyan-400 font-semibold">In Progress</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-2 text-[#00d4ff] font-semibold hover:gap-3 transition-all duration-200"
            >
              View detailed roadmap
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA / WAITLIST ───────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0618]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Decorative top gradient line */}
            <div
              className="h-px w-32 mx-auto mb-10 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, #7c3aed, #00d4ff, transparent)' }}
            />

            <p className="tamil-text text-[#d4a017] text-sm font-semibold mb-4">இணையுங்கள்</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Join the Tamil Web3 Revolution
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-10">
              Be part of building the world&apos;s first blockchain dedicated to Tamil civilization.
              Early supporters shape the future of Tamil on-chain.
            </p>

            {/* Email waitlist */}
            {joined ? (
              <div className="flex items-center justify-center gap-3 py-5">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span className="text-green-400 font-semibold">You&apos;re on the list! We&apos;ll be in touch.</span>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 mb-10">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-5 py-4 rounded-xl bg-[#1a1040] border border-[#2a1f5c] text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed]/60 text-sm transition-colors"
                />
                <button
                  type="submit"
                  className="px-7 py-4 rounded-xl font-bold text-[#0e0824] text-sm flex-shrink-0 transition-all duration-200 hover:opacity-90 shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)' }}
                >
                  Join Waitlist
                </button>
              </form>
            )}

            {/* Social links */}
            <div className="flex items-center justify-center gap-4">
              <p className="text-white/30 text-sm">Follow us:</p>
              {[
                { icon: Twitter, label: 'Twitter', href: 'https://twitter.com/tamizhiai' },
                { icon: MessageCircle, label: 'Discord', href: '#' },
                { icon: Github, label: 'GitHub', href: 'https://github.com/tamizhi' },
                { icon: Send, label: 'Telegram', href: '#' },
              ].map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-lg border border-[#2a1f5c] flex items-center justify-center text-white/40 hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
