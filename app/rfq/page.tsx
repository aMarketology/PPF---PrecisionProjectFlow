'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import {
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  Search,
  MessageSquare,
  Handshake,
  ChevronRight,
  Zap,
  Shield,
  Users,
} from 'lucide-react'

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: FileText,
    title: 'Submit Your RFQ',
    desc: 'Describe your project — scope, timeline, budget, and any technical requirements.',
  },
  {
    step: '02',
    icon: Search,
    title: 'Engineers Review',
    desc: 'Verified engineering companies on PPF review your request and prepare tailored proposals.',
  },
  {
    step: '03',
    icon: MessageSquare,
    title: 'Compare & Discuss',
    desc: 'Receive quotes, ask follow-up questions directly in Messages, and compare options.',
  },
  {
    step: '04',
    icon: Handshake,
    title: 'Hire with Confidence',
    desc: 'Select the best fit and kick off your project with a vetted, verified engineering partner.',
  },
]

const BENEFITS = [
  { icon: Zap,          title: 'Fast Responses',       desc: 'Most RFQs receive quotes within 24–48 hours.' },
  { icon: Shield,       title: 'Verified Engineers',   desc: 'Every engineer on PPF is identity-verified.' },
  { icon: Users,        title: 'Multiple Quotes',      desc: 'Get competing proposals and choose the best value.' },
  { icon: CheckCircle2, title: 'No Obligation',        desc: 'Receiving quotes is free — only pay when you hire.' },
]

const CATEGORIES = [
  'Structural Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Software Engineering',
  'Consulting Services',
  'Design Services',
  'Analysis & Testing',
  'Project Management',
]

export default function RFQPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm font-semibold text-blue-100 mb-5">
              <FileText className="w-4 h-4" />Request for Quote
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-tight">
              Get Quotes from
              <span className="block text-[#FF6B35]">Verified Engineers</span>
            </h1>
            <p className="text-lg text-blue-200 max-w-2xl mx-auto mb-8">
              Describe your engineering project and receive competitive proposals from vetted professionals on the PPF marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/rfq/create"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl text-base transition-all shadow-lg hover:shadow-xl"
              >
                Submit Your RFQ <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/profiles"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl text-base transition-all"
              >
                Browse Engineers <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">How It Works</h2>
          <p className="text-gray-500 max-w-xl mx-auto">From idea to hired engineer in four simple steps.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative"
              >
                <span className="absolute top-5 right-5 text-4xl font-extrabold text-gray-100 select-none">{step.step}</span>
                <div className="w-12 h-12 bg-[#003D82]/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#003D82]" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Why Use PPF RFQ?</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center text-center p-6"
                >
                  <div className="w-14 h-14 bg-[#003D82]/10 rounded-2xl flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-[#003D82]" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{b.title}</h3>
                  <p className="text-sm text-gray-500">{b.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Engineering Categories</h2>
          <p className="text-gray-500">We cover the full spectrum of engineering disciplines.</p>
        </motion.div>
        <div className="flex flex-wrap justify-center gap-3">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat}
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/rfq/create?category=${encodeURIComponent(cat)}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-[#003D82] hover:bg-blue-50 hover:text-[#003D82] text-gray-700 font-semibold rounded-xl text-sm transition-all shadow-sm"
              >
                {cat} <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-[#003D82] to-[#005BB5] py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-extrabold text-white mb-3">Ready to get started?</h2>
            <p className="text-blue-200 mb-8">Submit your RFQ in under 5 minutes. It&apos;s free.</p>
            <Link
              href="/rfq/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl text-base transition-all shadow-lg"
            >
              Submit Your RFQ <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
