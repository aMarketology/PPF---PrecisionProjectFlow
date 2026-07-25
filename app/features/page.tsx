'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import {
  Building2, Users, TrendingUp, Shield, Zap, Clock,
  DollarSign, Award, ArrowRight, Search, MessageSquare,
  FileText, Briefcase, ShoppingCart, Package, UserPlus,
  Hash, CheckCircle2, BookOpen, ChevronRight, ExternalLink,
  Layers, Globe, Mail, Bell, Settings2, LogIn,
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: LogIn,
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    items: [
      { title: 'Create an Account', href: '/signup', desc: 'Sign up as a Vendor (engineer) or Supplier (client). Vendors land on the Activity Feed; Suppliers land on their Dashboard.' },
      { title: 'Set Up Your Profile', href: '/profile', desc: 'Add your photo, bio, company name, and specialties. A complete profile builds trust and gets you hired.' },
      { title: 'Create or Join a Company', href: '/companies/create', desc: 'Start your business page — invite teammates, and a free internal "General" chat channel is auto-created for your team.' },
      { title: 'Understand Your Dashboard', href: '/dashboard/engineer', desc: 'Suppliers see orders, services, open RFQs, and earnings. Vendors use the Activity Feed as their home base.' },
    ],
  },
  {
    id: 'activity-feed',
    title: 'Activity Feed',
    icon: TrendingUp,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    href: '/feed',
    items: [
      { title: 'What Is the Feed?', desc: 'The feed (/feed) is a real-time, searchable ledger of everything happening on the platform — new RFQs, awarded projects, companies joining, team additions, orders, and community posts.' },
      { title: 'Filter by Activity Type', desc: 'Use the pill buttons to filter: All Activity, RFQs Posted, RFQs Awarded, Community Posts, Orders, New Companies, or Team Joins.' },
      { title: 'Search All Activity', desc: 'Click the search icon to search across all summaries. Find specific RFQs, companies, or keywords.' },
      { title: 'Post an Update', desc: 'Click "Post Update" to share a project showcase, milestone, job post, or parts request. It appears instantly on the feed.' },
      { title: 'Blockchain Ledger', desc: 'Every action is cryptographically hashed (SHA256) and chained to the previous one — creating an immutable, verifiable history of all platform activity.' },
    ],
  },
  {
    id: 'messaging',
    title: 'Messaging & Communication',
    icon: MessageSquare,
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    href: '/messages',
    items: [
      { title: 'Direct Messages (DMs)', desc: 'Click the + icon to start a DM with any user. Cross-company DMs require a token unlock (100 tokens ≈ $10). Same-company DMs are always free.' },
      { title: 'Team Channels', desc: 'Every company gets a "General" channel automatically. Team members can chat freely here — no token cost.' },
      { title: 'Create Custom Channels', desc: 'Click the # icon to create topic-based channels or private groups. Add members by searching names.' },
      { title: 'Company Sidebar', desc: 'The right sidebar shows your company info, team members, and a shortcut to manage your company settings.' },
      { title: 'File Sharing', desc: 'Attach images, PDFs, DXF/DWG files, and more directly in your messages.' },
      { title: 'Unlock a Conversation', desc: 'If a DM is locked, click "Unlock" to spend 100 tokens for unlimited free messaging with that person.' },
    ],
  },
  {
    id: 'rfq-marketplace',
    title: 'RFQ Marketplace',
    icon: FileText,
    color: 'from-rose-500 to-rose-600',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    href: '/rfq/feed',
    items: [
      { title: 'Browse Open RFQs', href: '/rfq/feed', desc: 'View all open Requests for Quote — part requests, repairs, engineering services. Filter by category, status, and sort by newest or budget.' },
      { title: 'Post an RFQ', href: '/rfq/create', desc: 'Need a part or service? Submit an RFQ with title, category, description, budget, timeline, location, and attachments. It appears instantly in the feed.' },
      { title: 'View RFQ Details', desc: 'Click any RFQ card to see the full description, client info, attachments, and a "Message Client" button to ask questions or submit a quote.' },
      { title: 'Message the Client', desc: 'Interested in an RFQ? Click "Message Client" to start a direct conversation — free if same company, or use tokens to unlock cross-company.' },
    ],
  },
  {
    id: 'companies-teams',
    title: 'Companies & Teams',
    icon: Building2,
    color: 'from-cyan-500 to-cyan-600',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    href: '/companies',
    items: [
      { title: 'Company Directory', href: '/companies', desc: 'Browse 3,900+ engineering companies. Search by name, city, or specialty.' },
      { title: 'Create Your Company', href: '/companies/create', desc: 'Set up your business page with name, industry, description, website, and specialties. You become the owner.' },
      { title: 'Claim an Existing Company', href: '/claim-company', desc: 'Found your company in the directory? Submit a claim request to verify ownership.' },
      { title: 'Manage Your Team', href: '/dashboard/company/[id]', desc: 'Invite teammates by searching their name. Assign roles: Owner, Admin (can invite/remove), or Member.' },
      { title: 'Company Dashboard', href: '/dashboard/company/[id]', desc: 'View company details, manage team members, access the General channel, and see your public profile.' },
    ],
  },
  {
    id: 'tokens-payments',
    title: 'Tokens & Payments',
    icon: DollarSign,
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    href: '/tokens',
    items: [
      { title: 'Token Economy', href: '/tokens', desc: 'Tokens unlock cross-company DMs. 100 tokens = $10 (unlocks 1 conversation). Buy in packs: Starter (100), Pro (500), Business (1,200).' },
      { title: 'Buy Tokens', href: '/tokens', desc: 'Purchase token packs via Stripe. Your balance updates instantly and is shown in the Messages header.' },
      { title: 'Unlock Conversations', desc: 'Click "Unlock" on a locked DM to spend 100 tokens. Unlocked conversations are free forever for both parties.' },
      { title: 'Free Internal Messaging', desc: 'All messages within your company (same company_id) are free. Same-company DMs, channels, and groups cost nothing.' },
    ],
  },
  {
    id: 'marketplace-services',
    title: 'Marketplace & Services',
    icon: Briefcase,
    color: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    href: '/marketplace',
    items: [
      { title: 'Browse Services', href: '/marketplace', desc: 'Engineers list their services with pricing. Browse by category — Structural, Mechanical, Electrical, and more.' },
      { title: 'List Your Services', href: '/services/create', desc: 'Engineers can create service listings with title, description, price, category, delivery time, and images.' },
      { title: 'Order Products', href: '/marketplace/products', desc: 'Browse and purchase engineering products from verified companies across all disciplines.' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboards & Analytics',
    icon: Layers,
    color: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    items: [
      { title: 'Engineer Dashboard', href: '/dashboard/engineer', desc: 'Overview of orders, services listed, open RFQs, and earnings. Manage your portfolio and respond to inquiries.' },
      { title: 'Client Dashboard', href: '/dashboard/client', desc: 'Track your orders, manage RFQs you\'ve posted, view order status, and review project history.' },
      { title: 'Company Dashboard', href: '/dashboard/company/[id]', desc: 'Company overview and team management. View members, invite new ones, and manage roles.' },
      { title: 'Order Tracking', href: '/orders', desc: 'Track all your orders — active, completed, and pending. See order status, deadlines, and sales.' },
    ],
  },
  {
    id: 'account-settings',
    title: 'Account & Settings',
    icon: Settings2,
    color: 'from-slate-500 to-slate-600',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    href: '/settings',
    items: [
      { title: 'Profile Settings', href: '/profile', desc: 'Update your name, photo, bio, and contact information. Your profile is visible to other users.' },
      { title: 'Account Settings', href: '/settings', desc: 'Manage your account preferences, notifications, and linked accounts.' },
      { title: 'Company Settings', href: '/settings/company', desc: 'Edit your company profile, update info, and manage team members.' },
      { title: 'Payment Settings', href: '/settings/payments', desc: 'Configure your Stripe Connect account for receiving payments.' },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
              <BookOpen className="w-4 h-4" /> Platform Guide
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              How to Use<br />
              <span className="text-[#FF6B35]">Precision Project Flow</span>
            </h1>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              Your complete guide to the platform — from account setup to messaging, RFQs, teams, tokens, and more.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 relative z-20 mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <a key={section.id} href={`#${section.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:shadow-md hover:border-gray-200 transition-all">
                <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${section.text}`} />
                </div>
                <span className="text-xs font-semibold text-gray-700">{section.title}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 space-y-16">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.section key={section.id} id={section.id}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}>
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">{section.title}</h2>
                  {section.href && (
                    <Link href={section.href} className="text-sm text-[#003D82] hover:underline flex items-center gap-1">
                      Go to {section.title} <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.items.map((item, j) => (
                  <div key={j} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all ${item.href ? 'hover:border-[#003D82]' : ''}`}>
                    {item.href ? (
                      <Link href={item.href} className="block">
                        <h3 className="font-bold text-gray-900 text-sm mb-1.5 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          {item.title}
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
                        </h3>
                      </Link>
                    ) : (
                      <h3 className="font-bold text-gray-900 text-sm mb-1.5 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {item.title}
                      </h3>
                    )}
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          );
        })}

        {/* Bottom CTA */}
        <div className="text-center bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] rounded-2xl p-10 shadow-xl">
          <h2 className="text-2xl font-extrabold text-white mb-3">Ready to get started?</h2>
          <p className="text-blue-200 mb-6 max-w-md mx-auto">Create your account and join the marketplace — it&apos;s free to browse.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg">
              <LogIn className="w-4 h-4" /> Sign Up Free
            </Link>
            <Link href="/feed"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/20">
              <TrendingUp className="w-4 h-4" /> View Activity Feed
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}