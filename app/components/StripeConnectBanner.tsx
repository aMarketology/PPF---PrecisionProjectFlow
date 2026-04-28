'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, ArrowRight, X, Building2, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ConnectState =
  | { kind: 'loading' }
  | { kind: 'no_company' }       // No company_profiles row yet
  | { kind: 'not_connected' }    // Has company, no Stripe account
  | { kind: 'incomplete' }       // Has Stripe account but onboarding not finished
  | { kind: 'connected' }        // charges_enabled = true
  | { kind: 'dismissed' }

const DISMISS_KEY = 'ppf_connect_banner_dismissed_until'
const DISMISS_HOURS = 24 // re-show after a day

export default function StripeConnectBanner({ userId }: { userId: string | null | undefined }) {
  const [state, setState] = useState<ConnectState>({ kind: 'loading' })

  useEffect(() => {
    if (!userId) return

    // Honor a recent dismiss
    const dismissedUntil = typeof window !== 'undefined' ? Number(localStorage.getItem(DISMISS_KEY) || 0) : 0
    if (dismissedUntil && Date.now() < dismissedUntil) {
      setState({ kind: 'dismissed' })
      return
    }

    ;(async () => {
      const supabase = createClient()

      // 1. Does the engineer have a company_profiles row?
      const { data: company } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle()

      if (!company) {
        setState({ kind: 'no_company' })
        return
      }

      // 2. Stripe Connect account?
      const { data: stripe } = await supabase
        .from('stripe_connect_accounts')
        .select('charges_enabled, payouts_enabled, details_submitted')
        .eq('company_id', company.id)
        .maybeSingle()

      if (!stripe) {
        setState({ kind: 'not_connected' })
        return
      }

      if (stripe.charges_enabled && stripe.payouts_enabled) {
        setState({ kind: 'connected' })
        return
      }

      setState({ kind: 'incomplete' })
    })()
  }, [userId])

  function dismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_HOURS * 60 * 60 * 1000))
    }
    setState({ kind: 'dismissed' })
  }

  // Don't render anything if loading, dismissed, or fully connected
  if (state.kind === 'loading' || state.kind === 'dismissed' || state.kind === 'connected') return null

  // Variant config
  const variants: Record<
    Exclude<ConnectState['kind'], 'loading' | 'dismissed' | 'connected'>,
    { icon: React.ReactNode; title: string; body: string; href: string; cta: string }
  > = {
    no_company: {
      icon: <Building2 className="w-5 h-5" />,
      title: 'Finish your company profile to accept payments',
      body: 'Add your company details so we can wire up your Stripe payouts.',
      href: '/settings/company',
      cta: 'Set up company',
    },
    not_connected: {
      icon: <CreditCard className="w-5 h-5" />,
      title: 'Connect Stripe to start receiving payouts',
      body: 'Clients can\'t check out for your services until your payout account is connected. Takes 2 minutes.',
      href: '/settings/payments',
      cta: 'Connect Stripe',
    },
    incomplete: {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: 'Stripe onboarding incomplete',
      body: 'A few details are still required by Stripe before you can accept payments.',
      href: '/settings/payments',
      cta: 'Finish onboarding',
    },
  }

  const v = variants[state.kind]

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] text-white rounded-2xl shadow-lg p-5 sm:p-6 mb-6 overflow-hidden"
    >
      {/* subtle pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,255,255,.4) 12px,rgba(255,255,255,.4) 13px)',
        }}
      />

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 pr-8">
        <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
          {v.icon}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg leading-snug">{v.title}</h3>
          <p className="text-sm text-white/90 mt-0.5">{v.body}</p>
        </div>

        <Link
          href={v.href}
          className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-[#E55A2B] hover:bg-gray-50 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md"
        >
          {v.cta}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  )
}

/**
 * Compact "all-good" pill — drop next to badges/title to confirm connection.
 * Renders nothing while loading or if not yet connected.
 */
export function StripeConnectedPill({ userId }: { userId: string | null | undefined }) {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const supabase = createClient()
      const { data: company } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle()
      if (!company) { setConnected(false); return }

      const { data: stripe } = await supabase
        .from('stripe_connect_accounts')
        .select('charges_enabled, payouts_enabled')
        .eq('company_id', company.id)
        .maybeSingle()

      setConnected(!!(stripe?.charges_enabled && stripe?.payouts_enabled))
    })()
  }, [userId])

  if (!connected) return null
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
      <CheckCircle2 className="w-3 h-3" />Payouts Ready
    </span>
  )
}
