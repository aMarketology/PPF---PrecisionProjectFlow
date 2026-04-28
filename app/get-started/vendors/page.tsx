'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Package,
  DollarSign,
  Globe,
  Star,
  Award,
  BarChart3,
  ChevronRight,
} from 'lucide-react'

const BENEFITS = [
  {
    icon: Globe,
    title: 'National Reach',
    desc: 'Get discovered by engineering firms, construction companies, and procurement teams across the country — without a sales team.',
  },
  {
    icon: Package,
    title: 'List Your Services',
    desc: 'Create a detailed service listing with pricing, certifications, delivery time, and service area in minutes.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Client Messaging',
    desc: 'Communicate directly with qualified buyers through our token-gated messaging system — no spam, only serious leads.',
  },
  {
    icon: DollarSign,
    title: 'Transparent Pricing',
    desc: 'No commissions on deals. Flat listing fees only. Keep every dollar you earn from your clients.',
  },
  {
    icon: Award,
    title: 'Verified Badge',
    desc: 'Get a Verified Engineer badge on your profile — signal credibility and win trust before the first conversation.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Analytics',
    desc: 'Track profile views, active services, and order history from your engineer dashboard.',
  },
]

const STEPS = [
  { n: '01', title: 'Create Your Account',  desc: 'Sign up as an Engineer/Vendor in under 2 minutes.' },
  { n: '02', title: 'Build Your Profile',   desc: 'Add your company name, bio, location, certifications, and avatar.' },
  { n: '03', title: 'List Your Services',   desc: 'Create one or more service listings with pricing and scope.' },
  { n: '04', title: 'Receive RFQs & DMs',  desc: 'Clients find you, send RFQs, and message you directly.' },
  { n: '05', title: 'Win Projects',         desc: 'Quote, negotiate, and close deals — all on PPF.' },
]

const TESTIMONIALS = [
  {
    quote: 'Within two weeks of listing on PPF, we had three serious inquiries from companies we never would have reached through our existing network.',
    name: 'Marcus T.',
    role: 'Principal, Structural Engineering Firm',
  },
  {
    quote: 'The RFQ system is a game-changer. We get pre-qualified project briefs delivered to us instead of chasing cold leads.',
    name: 'Priya S.',
    role: 'VP Sales, Mechanical Services',
  },
]

const WHO = [
  'Structural & Civil Engineering Firms',
  'Mechanical & Electrical Contractors',
  'Design & Drafting Studios',
  'Testing & Inspection Laboratories',
  'Project Management Consultants',
  'Industrial Equipment Suppliers',
  'Specialty Trade Contractors',
  'Environmental & Geotechnical Firms',
]

export default function VendorsPage() {
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
              <Building2 className="w-4 h-4" />
              For Vendors &amp; Engineering Firms
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Grow Your Engineering
              <span className="block text-[#FF6B35]">Business on PPF</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-10">
              List your services, get discovered by qualified clients, and receive inbound RFQs — without a sales team or cold outreach.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup?type=engineer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl text-base transition-all shadow-lg hover:shadow-xl"
              >
                List Your Services Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/profiles"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl text-base transition-all"
              >
                See How Others List <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Social proof strip */}
            <div className="mt-12 flex flex-wrap justify-center gap-8">
              {[['500+', 'Active Vendors'], ['2,400+', 'Client Searches/mo'], ['$0', 'Commission on Deals']].map(([val, label]) => (
                <div key={label} className="text-center">
                  <p className="text-3xl font-extrabold text-white">{val}</p>
                  <p className="text-blue-300 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Who it's for */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Built for Engineering Service Providers</h2>
          <p className="text-gray-500">If you offer any of the following, PPF is your marketplace.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WHO.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700">{item}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Everything You Need to Win More Business</h2>
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
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Get Listed in 5 Steps</h2>
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
            <h2 className="text-3xl font-extrabold text-white mb-2">What Vendors Are Saying</h2>
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
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Ready to grow your business?</h2>
          <p className="text-gray-500 mb-8">Join hundreds of engineering vendors already on PPF. Free to list — no commissions.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup?type=engineer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl text-base transition-all shadow-lg"
            >
              Create Vendor Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/get-started/suppliers"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-200 hover:border-[#003D82] text-gray-700 hover:text-[#003D82] font-semibold rounded-xl text-base transition-all"
            >
              I&apos;m a Supplier <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
