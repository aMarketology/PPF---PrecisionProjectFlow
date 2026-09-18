'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  Package,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from 'lucide-react'

type TestStage = {
  number: number
  title: string
  icon: typeof ClipboardCheck
  href: string
  checks: string[]
  complete?: number
}

const TEST_STAGES: TestStage[] = [
  { number: 1, title: 'Authentication and Sessions', icon: LockKeyhole, href: '/login', complete: 2, checks: ['Create a client account', 'Create an engineer or vendor account', 'Log in and log out', 'Use forgot password and reset password', 'Refresh to confirm the session persists', 'Confirm protected pages redirect signed-out users', 'Check keyboard, validation, and Supabase Auth errors on a phone'] },
  { number: 2, title: 'Profiles', icon: UserRound, href: '/profiles', checks: ['View a public profile', 'Edit profile details', 'Upload an avatar', 'Update bio, location, skills, and certifications', 'View a portfolio', 'Search the engineer directory', 'Start a message from a profile'] },
  { number: 3, title: 'Companies and Teams', icon: Building2, href: '/companies', checks: ['Browse and view companies', 'Create, edit, and claim a company', 'Invite a team member', 'Accept or decline an invite', 'Manage roles and channel membership', 'Remove a member or leave a company', 'Use the company dashboard'] },
  { number: 4, title: 'Marketplace Listings', icon: ShoppingBag, href: '/marketplace', checks: ['Browse, search, and filter services and products', 'View service and product details', 'Create and edit a service', 'Create and edit a product', 'View personal listings'] },
  { number: 5, title: 'RFQ Creation and Discovery', icon: FileText, href: '/rfq', checks: ['Create an RFQ with multiple line items', 'Test required-field validation', 'Test ASAP and Next Day Air independently', 'Confirm a new RFQ immediately appears in the feed', 'Search and filter the RFQ feed', 'View RFQ details and line items', 'Confirm owners and same-company members cannot bid'] },
  { number: 6, title: 'RFQ Proposal Submission', icon: ClipboardCheck, href: '/rfq', checks: ['Submit amount, delivery estimate, and notes', 'Submit optional contact and company details', 'Add per-part pricing', 'Confirm exactly 50 tokens are deducted', 'Test insufficient tokens', 'View and withdraw a proposal'] },
  { number: 7, title: 'Proposal Messages and Unlocking', icon: MessageSquare, href: '/messages', checks: ['Open the correct proposal conversation', 'Confirm bidder avatar and name', 'Confirm bidder sees Application sent with no unlock button', 'Confirm only the RFQ owner sees Unlock Application', 'Unlock for exactly 50 tokens', 'Review the full proposal', 'Switch accounts and confirm permissions remain correct'] },
  { number: 8, title: 'Meetings and Contracts', icon: Landmark, href: '/messages', checks: ['Both RFQ parties schedule a meeting for 50 tokens', 'Test meeting date, time, duration, and agenda', 'Confirm only the RFQ owner can send a contract', 'Confirm the contract action costs 50 tokens', 'Check vendor Stripe Connect readiness', 'Complete contract checkout', 'Ensure duplicate or failed actions do not double-charge'] },
  { number: 9, title: 'Messaging, Channels, and Realtime', icon: MessageSquare, href: '/messages', checks: ['Send and receive direct messages', 'Test unread counts, receipts, and typing indicators', 'Upload images, PDFs, and files', 'Add thumbs-up reactions', 'Switch conversations quickly', 'Use mobile list and thread navigation', 'Create and manage channels and groups', 'Test mentions, roles, and team membership'] },
  { number: 10, title: 'Tokens and Payments', icon: CreditCard, href: '/tokens', checks: ['View balance and transaction history', 'Buy each token pack', 'Confirm Stripe payment and immediate balance update', 'Confirm Supabase ledger credits and debits', 'Test insufficient balance and refunds', 'Confirm webhook retries do not double-credit'] },
  { number: 11, title: 'Orders and Fulfillment', icon: Package, href: '/orders', checks: ['Purchase a service and product', 'Complete checkout', 'View client orders and vendor sales', 'Update order status', 'Test shipping and tracking', 'Complete or cancel an order', 'Confirm related emails and conversation unlocks'] },
  { number: 12, title: 'Contracts and Milestones', icon: Landmark, href: '/orders', checks: ['View contract details and milestones', 'Mark work delivered as a vendor', 'Release a milestone as buyer', 'Complete the final milestone', 'Confirm Stripe and Supabase contract states agree'] },
  { number: 13, title: 'Dashboards and Notifications', icon: LayoutDashboard, href: '/dashboard/engineer', checks: ['Test client, engineer, and company dashboards', 'Check counts, balances, tabs, and empty states', 'Check notification badge and inbox', 'Open message and RFQ notification deep links'] },
  { number: 14, title: 'Settings and Admin', icon: Settings2, href: '/settings', checks: ['Test account and company settings', 'Test Stripe Connect onboarding and status refresh', 'Test admin statistics and management pages', 'Grant tokens as an administrator', 'Confirm non-admin users are rejected'] },
  { number: 15, title: 'Public Site and Release Checks', icon: Search, href: '/', checks: ['Check homepage, navigation, and footer', 'Check Features, Get Started, blog, and contact', 'Check privacy policy and terms', 'Test phone and tablet layouts', 'Confirm no horizontal overflow or clipped controls', 'Check robots, sitemap, metadata, and JSON-LD', 'Run the production build'] },
]

export default function FeaturesPage() {
  const totalChecks = TEST_STAGES.reduce((sum, stage) => sum + stage.checks.length, 0)
  const completedChecks = TEST_STAGES.reduce((sum, stage) => sum + (stage.complete ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      <header className="relative overflow-hidden bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
              <ClipboardCheck className="h-4 w-4" /> Local validation in progress
            </div>
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl">Platform Test Guide</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-blue-100">The complete desktop and mobile validation plan for Precision Project Flow. Test each workflow, its loading and error states, and the underlying records before moving on.</p>
          </div>
        </motion.div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-10 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="border-l-4 border-[#FF6B35] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#003D82]">Current focus</p>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-900">Step 1: Authentication and Sessions</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Forgot Password and Reset Password have passed mobile validation. Continue with login, logout, session persistence, protected redirects, and mobile form behavior.</p>
            <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#003D82] hover:text-[#002960]">
              Start authentication testing <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-gray-200 bg-gray-200">
            <div className="bg-white p-5"><p className="text-3xl font-extrabold text-[#003D82]">15</p><p className="mt-1 text-sm font-semibold text-gray-600">Test stages</p></div>
            <div className="bg-white p-5"><p className="text-3xl font-extrabold text-[#003D82]">{totalChecks}</p><p className="mt-1 text-sm font-semibold text-gray-600">Workflow checks</p></div>
            <div className="bg-white p-5"><p className="text-3xl font-extrabold text-emerald-600">{completedChecks}</p><p className="mt-1 text-sm font-semibold text-gray-600">Checks passed</p></div>
            <div className="bg-white p-5"><p className="text-3xl font-extrabold text-[#FF6B35]">Local</p><p className="mt-1 text-sm font-semibold text-gray-600">Test environment</p></div>
          </div>
        </section>

        <section className="mb-10 border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div><h2 className="font-bold text-amber-950">Release gate</h2><p className="mt-1 text-sm leading-relaxed text-amber-900">Supabase permission hardening and Stripe production testing remain deferred until feature and design validation is complete. Record failures before continuing to the next stage.</p></div>
          </div>
        </section>

        <section aria-label="Platform testing stages" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {TEST_STAGES.map((stage, index) => {
            const Icon = stage.icon
            return (
              <motion.article key={stage.number} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index * 0.03, 0.2) }} className="flex flex-col border border-gray-200 bg-white shadow-sm">
                <div className="flex items-start gap-4 border-b border-gray-100 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#003D82]"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Stage {stage.number}</p><h2 className="mt-1 text-lg font-extrabold leading-tight text-gray-900">{stage.title}</h2></div>
                </div>
                <ul className="flex-1 space-y-2 p-5">
                  {stage.checks.map((check) => <li key={check} className="flex gap-2 text-sm leading-snug text-gray-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" /><span>{check}</span></li>)}
                </ul>
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
                  <span className="text-xs font-semibold text-gray-500">{stage.complete ? `${stage.complete}/${stage.checks.length} passed` : `${stage.checks.length} checks`}</span>
                  <Link href={stage.href} className="inline-flex items-center gap-1 text-sm font-bold text-[#003D82] hover:text-[#002960]">Open flow <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </motion.article>
            )
          })}
        </section>

        <section className="mt-10 border border-[#003D82]/15 bg-[#003D82] p-6 text-white sm:flex sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-extrabold">Test in both desktop and phone viewports</h2><p className="mt-1 text-sm text-blue-100">For each stage, verify success, loading, empty, validation, and error states before marking it complete.</p></div>
          <Link href="/rfq" className="mt-4 inline-flex items-center gap-2 bg-[#FF6B35] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#E55A2B] sm:mt-0">Continue to RFQs <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}
