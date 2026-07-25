'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import {
  Building2, Users, TrendingUp, Shield, Zap, Clock,
  DollarSign, Award, ArrowRight, Search, MessageSquare,
  FileText, Star, Target, Briefcase, BarChart, Globe,
  Phone, Mail, CheckCircle2, Hash, MessageCircle, Send,
  Layers, Package, ShoppingCart, LogIn, ExternalLink, BookOpen,
} from 'lucide-react';

const REAL_STATS = [
  { icon: Building2, value: '3,968+', label: 'Companies', desc: 'Engineering firms in our directory' },
  { icon: FileText, value: '8', label: 'Open RFQs', desc: 'Active part requests & repairs' },
  { icon: Hash, value: '3,980+', label: 'Activities Logged', desc: 'Platform actions in the blockchain ledger' },
  { icon: Users, value: '8', label: 'Verified Users', desc: 'Engineers and suppliers onboarded' },
];

const FEATURES = [
  {
    title: 'Free Internal Team Messaging',
    desc: 'Every company gets a free "General" channel. Team members chat freely — no token costs, no limits. Create additional channels for projects, departments, or topics.',
    icon: Hash,
    href: '/features#messaging',
  },
  {
    title: 'Token-Gated Cross-Company DMs',
    desc: 'Message any user on the platform. Direct messages to people at other companies cost 100 tokens (~$10) one-time — then free forever. Same-company DMs are always free.',
    icon: MessageSquare,
    href: '/features#tokens-payments',
  },
  {
    title: 'RFQ Marketplace',
    desc: 'Post part requests and repair needs. Vendors browse open RFQs, view details, and apply via direct message. Real-time feed with category filters, budget sorting, and search.',
    icon: FileText,
    href: '/rfq',
  },
  {
    title: 'Activity Feed',
    desc: 'A real-time, searchable ledger of everything happening on the platform. New RFQs, awarded projects, companies joining, team additions, orders, and community posts in one unified stream.',
    icon: TrendingUp,
    href: '/feed',
  },
  {
    title: 'Company Teams & Channels',
    desc: 'Create your company page, invite teammates as owners/admins/members, and get an auto-created General channel. Manage your team from the company dashboard.',
    icon: Building2,
    href: '/features#companies-teams',
  },
  {
    title: 'Verified Company Directory',
    desc: 'Browse 3,900+ engineering companies across the US. Search by name, city, specialty, or industry. Claim or create your company listing.',
    icon: Globe,
    href: '/companies',
  },
  {
    title: 'Service Listings & Marketplace',
    desc: 'Engineers list services with pricing and delivery times. Clients browse, compare, and connect directly. Full marketplace for engineering services.',
    icon: Briefcase,
    href: '/marketplace',
  },
  {
    title: 'Blockchain Activity Ledger',
    desc: 'Every action is cryptographically hashed (SHA256) and chained to the previous one — creating an immutable, verifiable history. Searchable, filterable, and real-time.',
    icon: Shield,
    href: '/features#activity-feed',
  },
  {
    title: 'User Profiles & Portfolios',
    desc: 'Rich profiles with bio, company affiliation, avatar, and user type. Engineers can showcase their work; clients can build trust through verified profiles.',
    icon: Users,
    href: '/profiles',
  },
];

export default function GetStartedPage() {
  const router = useRouter();

  const handleGetStarted = (type: 'client' | 'provider') => {
    router.push(`/signup?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 rounded-full px-5 py-1.5 text-sm font-medium mb-6">
              <Award className="w-4 h-4 text-[#FF6B35]" /> Engineering Marketplace Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-5 leading-tight">
              The B2B Marketplace for<br />
              <span className="text-[#FF6B35]">Precision Engineering</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-200 max-w-3xl mx-auto mb-8 leading-relaxed">
              Connect with verified engineering companies. Post RFQs, message vendors directly, 
              manage your team with free internal channels, and track every transaction on our 
              blockchain-verified activity ledger.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <motion.button onClick={() => handleGetStarted('client')}
                className="px-8 py-3.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all text-base flex items-center gap-2"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                I Need Engineering Services <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button onClick={() => handleGetStarted('provider')}
                className="px-8 py-3.5 bg-white/10 border-2 border-white/30 hover:bg-white/20 text-white font-bold rounded-xl transition-all text-base flex items-center gap-2"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                I Offer Engineering Services <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Real Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {REAL_STATS.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                    <Icon className="w-5 h-5 text-[#FF6B35] mx-auto mb-1.5" />
                    <p className="text-xl md:text-2xl font-extrabold text-white">{stat.value}</p>
                    <p className="text-xs text-blue-200 font-semibold">{stat.label}</p>
                    <p className="text-[10px] text-blue-300/70 mt-0.5">{stat.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">What You Get</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Everything your team needs to find, connect, and transact.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-gray-200 transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#003D82]/10 flex items-center justify-center mb-4">
                  <Icon className="w-5.5 h-5.5 text-[#003D82]" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                {feature.href && (
                  <Link href={feature.href} className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-[#003D82] hover:underline">
                    Learn more <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500 max-w-lg mx-auto">From signup to your first transaction in minutes.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', icon: LogIn, title: 'Sign Up Free', desc: 'Create your account as a vendor or supplier. Set up your profile and company in under 2 minutes.' },
              { step: '02', icon: Building2, title: 'Join or Create a Company', desc: 'Create your company page or claim an existing one. Invite teammates and get a free internal team channel.' },
              { step: '03', icon: FileText, title: 'Post or Browse RFQs', desc: 'Need parts or repairs? Post an RFQ. Want work? Browse the marketplace and apply via DM.' },
              { step: '04', icon: MessageCircle, title: 'Connect & Transact', desc: 'Message vendors or clients directly. Same-company is free; cross-company uses tokens. Track everything on the ledger.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="text-center p-6">
                  <span className="text-5xl font-extrabold text-gray-100 block mb-4">{item.step}</span>
                  <div className="w-12 h-12 bg-[#003D82]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-[#003D82]" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] rounded-2xl p-10 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Ready to Get Started?</h2>
          <p className="text-blue-200 mb-6 max-w-md mx-auto">Join 3,900+ engineering companies already on the platform.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg">
              <LogIn className="w-4 h-4" /> Sign Up Free
            </Link>
            <Link href="/features"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-xl transition-all">
              <BookOpen className="w-4 h-4" /> Read the Guide
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
