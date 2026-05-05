'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  ArrowRight, 
  BookOpen, 
  History as HistoryIcon, 
  Globe, 
  Sparkles, 
  ChevronRight,
  ShieldCheck,
  Cpu,
  Layers
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

const FeatureCard = ({ icon: Icon, title, desc, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="premium-card group"
  >
    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary transition-colors duration-500">
      <Icon className="w-7 h-7 text-primary group-hover:text-white transition-colors duration-500" />
    </div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-secondary/60 leading-relaxed">{desc}</p>
  </motion.div>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 text-left">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8">
                  <Sparkles className="w-3 h-3" />
                  Preserving Tamil Heritage
                </span>
                <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tight text-secondary">
                  Digitizing <br />
                  <span className="vibrant-text">2000 Years</span> <br />
                  of Pride.
                </h1>
                <p className="text-xl text-secondary/70 leading-relaxed mb-12 max-w-xl">
                  Tamizhi is the world&apos;s first dedicated digital heritage platform for the preservation of Tamil classical literature, history, and Dravidian pride through advanced AI and Blockchain.
                </p>
                <div className="flex flex-wrap gap-6">
                  <Link href="/ai" className="btn-primary flex items-center gap-3">
                    Launch AI Ecosystem <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="#history" className="btn-secondary flex items-center gap-3">
                    Explore History
                  </Link>
                </div>
              </motion.div>
            </div>
            <div className="lg:w-1/2 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="relative z-10"
              >
                <img 
                  src="/modern-hero.png" 
                  alt="Tamizhi Hero" 
                  className="w-full h-auto drop-shadow-[0_35px_35px_rgba(0,0,0,0.1)]"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-gray-50 bg-gray-50/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: 'Classical Works', val: '2,000+' },
              { label: 'Years of History', val: '5,000+' },
              { label: 'Words Processed', val: '100M+' },
              { label: 'Dravidian Pride', val: '100%' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-black text-secondary mb-2">{stat.val}</div>
                <div className="text-xs uppercase tracking-widest font-bold text-secondary/40">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History Section */}
      <section id="history" className="section-padding overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="lg:w-1/2 order-2 lg:order-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
                <img 
                  src="/modern-history.png" 
                  alt="Tamil History" 
                  className="relative z-10 w-full h-auto rounded-[3rem] shadow-2xl shadow-primary/20"
                />
              </motion.div>
            </div>
            <div className="lg:w-1/2 order-1 lg:order-2">
              <span className="tamil-text text-primary font-bold text-lg mb-6 block">வரலாற்றின் பொற்காலம்</span>
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight text-secondary">
                From Sangam Era <br /> to <span className="italic font-serif">Silicon Age.</span>
              </h2>
              <p className="text-lg text-secondary/70 leading-relaxed mb-10">
                Centuries of wisdom meet the future of technology. We are building the bridge between ancient Tamil literature and the modern decentralized world.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Kumari Kandam Preservation', desc: 'Mapping the legends of the sunken continent.' },
                  { title: 'Digital Sangam', desc: 'Reviving the golden age of Tamil poets and scholars.' },
                  { title: 'Dravidian Renaissance', desc: 'A modern awakening through digital empowerment.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                      <ChevronRight className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-secondary/60 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-padding bg-gray-50/50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Built for the <span className="text-primary">Future.</span></h2>
            <p className="text-lg text-secondary/60">A multi-layered ecosystem designed to protect, promote, and empower Tamil identity across the globe.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={BookOpen} 
              title="Classical Archive" 
              desc="Digital preservation of Tolkāppiyam, Tirukkuṟaḷ, and the Five Great Epics on an immutable ledger."
              delay={0.1}
            />
            <FeatureCard 
              icon={Cpu} 
              title="Tamizhi AI" 
              desc="Natively trained LLMs that understand the nuances of ancient Tamil grammar and modern Dravidian discourse."
              delay={0.2}
            />
            <FeatureCard 
              icon={Layers} 
              title="Blockchain Core" 
              desc="A decentralized infrastructure for literary NFTs, governance, and the TMZ cultural token economy."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Vision Quote */}
      <section className="section-padding text-center relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="tamil-text text-4xl md:text-6xl font-black mb-12 vibrant-text leading-tight">
              &ldquo;யாதும் ஊரே யாவரும் கேளிர்&rdquo;
            </h2>
            <p className="text-2xl font-serif italic text-secondary/80">
              &ldquo;Every town is my hometown, and every person is my kin.&rdquo;
            </p>
            <div className="mt-12 text-sm uppercase tracking-widest font-bold text-secondary/40">— Kaniyan Pungundranar</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding container mx-auto px-6">
        <div className="bg-secondary rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8">Ready to Join the <br /> <span className="text-primary">Renaissance?</span></h2>
            <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">Start your journey into the world&apos;s first digital heritage ecosystem for Tamil scholars and enthusiasts.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link href="/wallet" className="btn-primary">Launch Application</Link>
              <Link href="/whitepaper" className="btn-secondary border-white text-white hover:bg-white hover:text-secondary">Read Documentation</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
