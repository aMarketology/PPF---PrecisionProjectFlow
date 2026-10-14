'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import {
  Search,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  FileText,
  Shield,
  Star,
  Clock,
  DollarSign,
  ChevronRight,
  Building2,
} from 'lucide-react'

const BENEFITS = [
  {
    icon: Search,
    title: 'Find Verified Suppliers',
    desc: 'Search a directory of engineering firms, service providers, and materials suppliers - all vetted and verified.',
  },
  {
    icon: FileText,
    title: 'Post RFQs & Get Quotes',
    desc: 'Describe your project once and receive competitive quotes from multiple qualified suppliers.',
  },
  {
    icon: MessageSquare,
    title: 'Message Suppliers Directly',
    desc: 'Talk to suppliers before you commit. Ask questions, share specs, and compare answers side by side.',
  },
  {
    icon: Shield,
    title: 'Trust & Credibility',
    desc: 'Every supplier has a verified profile, certifications, portfolio, and reviews so you can hire with confidence.',
  },
  {
    icon: Clock,
    title: 'Save Time Sourcing',
    desc: 'Stop cold-calling and trade-show hopping. Get pre-qualified suppliers responding to you in one place.',
  },
  {
    icon: DollarSign,
    title: 'Transparent Pricing',
    desc: 'Compare hourly rates, project quotes, and delivery timelines before you commit a single dollar.',
  },
]

const STEPS = [
  { n: '01', title: 'Create Your Buyer Account', desc: 'Sign up as a Buyer in under 2 minutes - no cost, no obligation.' },
  { n: '02', title: 'Tell Us What You Need',   desc: 'Post an RFQ with your project scope, budget, and timeline.' },
  { n: '03', title: 'Review Qualified Quotes', desc: 'Receive responses from suppliers who match your requirements.' },
  { n: '04', title: 'Connect & Hire',          desc: 'Message your shortlist, compare, and choose the right supplier.' },
]

const TESTIMONIALS = [
  {
    quote: 'We posted one RFQ for a CNC machining job and had three serious quotes within a day. The suppliers actually understood our drawings.',
    name: 'Rachel M.',
    role: 'Procurement Manager, Industrial Equipment',
  },
  {
    quote: 'Finding a structural engineering firm used to take weeks. On PPF we shortlisted two firms in an afternoon and hired one by Friday.',
    name: 'Tom B.',
    role: 'Operations Director, Construction',
  },
]

const CATEGORIES = [
  'CNC Machining',
  'Structural Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Sheet Metal & Fabrication',
  '3D Printing / Additive',
  'Injection Molding',
  'Welding & Assembly',
  'Quality & Inspection',
  'Controls & Automation',
  'HVAC & MEP',
  'Civil Engineering',
]

export default function BuyerPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-28 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)',
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm font-semibold text-blue-100 mb-6">
              <Search className="w-4 h-4" />
              For Buyers Sourcing Engineering Services
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Find the Right Supplier
              <span className="block text-[#FF6B35]">for Every Project</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-10">
              Post RFQs, compare qualified suppliers, and hire engineering and manufacturing experts - all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup?type=client"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl text-base transition-all shadow-lg hover:shadow-xl"
              >
                Create Buyer Account <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl text-base transition-all"
              >
                Browse the Marketplace <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 flex flex-wrap justify-center gap-8">
              {[['3,900+', 'Verified Companies'], ['8+', 'Open RFQs'], ['$0', 'To Post an RFQ']].map(([val, label]) => (
                <div key={label} className="text-center">
                  <p className="text-3xl font-extrabold text-white">{val}</p>
                  <p className="text-blue-300 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">What You Can Source</h2>
          <p className="text-gray-500">From precision parts to full engineering services, PPF covers every category.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CATEGORIES.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-[#FF6B35] flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700">{item}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Why Buyers Choose PPF</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100"
                >
                  <div className="w-12 h-12 bg-[#003D82]/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#003D82]" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Start Sourcing in 4 Steps</h2>
        </motion.div>
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-5 items-start bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#003D82] text-white font-extrabold text-sm flex items-center justify-center">
                {step.n}
              </span>
              <div>
                <p className="font-bold text-gray-900">{step.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-gradient-to-br from-[#001f4d] to-[#003D82] py-16">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-2">What Buyers Are Saying</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/10 border border-white/15 rounded-2xl p-6"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-[#FF6B35] fill-[#FF6B35]" />
                  ))}
                </div>
                <p className="text-blue-100 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-bold text-white text-sm">{t.name}</p>
                  <p className="text-blue-300 text-xs">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Ready to find your next supplier?
          </h2>
          <p className="text-gray-500 mb-8">Free to sign up. Free to post RFQs. No obligation until you hire.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup?type=client"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl text-base transition-all shadow-lg"
            >
              Create Buyer Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/get-started/supplier"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-200 hover:border-[#003D82] text-gray-700 hover:text-[#003D82] font-semibold rounded-xl text-base transition-all"
            >
              <Building2 className="w-4 h-4" /> I&apos;m a Supplier
            </Link>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
