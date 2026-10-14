'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  Building2, CreditCard, FileText, Landmark, CheckCircle2, Check, Loader2,
  AlertCircle, ExternalLink, ArrowRight, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Company {
  id: string
  company_name: string | null
  name: string | null
  city: string | null
  state: string | null
  industry: string | null
}

interface StripeAccount {
  id: string
  stripe_account_id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
}

interface Requirements {
  currentlyDue: string[]
  eventuallyDue: string[]
  pendingVerification: string[] | null
  disabledReason: string | null
}

type StepId = 'company' | 'connect' | 'details' | 'payouts' | 'done'

const STEPS: { id: StepId; label: string; icon: any }[] = [
  { id: 'company',  label: 'Company Profile', icon: Building2 },
  { id: 'connect',  label: 'Connect Stripe',  icon: CreditCard },
  { id: 'details',  label: 'Business Details', icon: FileText },
  { id: 'payouts',  label: 'Bank & Payouts',  icon: Landmark },
  { id: 'done',     label: 'Ready to Sell',   icon: CheckCircle2 },
]

export default function StripeOnboardingSteps() {
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<Company | null>(null)
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null)
  const [requirements, setRequirements] = useState<Requirements | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: company } = await supabase
        .from('company_profiles')
        .select('id, company_name, name, city, state, industry')
        .eq('owner_id', user.id)
        .maybeSingle()
      setCompany(company ?? null)

      if (company) {
        const res = await fetch(`/api/stripe/connect?companyId=${company.id}`)
        const data = await res.json()
        if (data.connected && data.account) {
          setStripeAccount(data.account)
          await loadRequirements(company.id)
        } else {
          setStripeAccount(null)
          setRequirements(null)
        }
      }
    } catch (e) {
      console.error('Stripe onboarding load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadRequirements = async (companyId: string) => {
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, action: 'requirements' }),
      })
      const data = await res.json()
      if (data.success) setRequirements(data.requirements)
    } catch (e) {
      console.error('Requirements load error:', e)
    }
  }

  useEffect(() => { load() }, [])

  const companyComplete = !!company && !!(company.company_name || company.name) && !!company.city && !!company.state

  // Determine current step index
  const currentIndex = !companyComplete
    ? 0
    : !stripeAccount
      ? 1
      : !stripeAccount.details_submitted
        ? 2
        : !stripeAccount.payouts_enabled
          ? 3
          : stripeAccount.charges_enabled && stripeAccount.payouts_enabled
            ? 4
            : 3

  const stepStatus = (i: number): 'complete' | 'current' | 'upcoming' => {
    if (i < currentIndex) return 'complete'
    if (i === currentIndex) return 'current'
    return 'upcoming'
  }

  const handleConnect = async () => {
    if (!company) return
    setBusy('connect')
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id, action: 'create_link' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create onboarding link')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to connect Stripe')
      setBusy(null)
    }
  }

  const handleRefresh = async () => {
    if (!company) return
    setBusy('refresh')
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id, action: 'refresh_status' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Status refreshed')
        await load()
      } else {
        throw new Error(data.error || 'Failed to refresh')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to refresh status')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
      </div>
    )
  }

  const dueCount = requirements?.currentlyDue?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Payout Setup</h2>
          <span className="text-sm font-semibold text-gray-500">
            Step {Math.min(currentIndex + 1, 5)} of 5
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-start">
          {STEPS.map((step, i) => {
            const status = stepStatus(i)
            const Icon = step.icon
            return (
              <div key={step.id} className="flex-1 flex flex-col items-center relative">
                {/* connector line */}
                {i > 0 && (
                  <div className={`absolute top-5 -left-1/2 w-full h-0.5 ${i <= currentIndex ? 'bg-[#003D82]' : 'bg-gray-200'}`} />
                )}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  status === 'complete'
                    ? 'bg-[#003D82] border-[#003D82] text-white'
                    : status === 'current'
                      ? 'bg-white border-[#FF6B35] text-[#FF6B35] ring-4 ring-[#FF6B35]/15'
                      : 'bg-white border-gray-200 text-gray-300'
                }`}>
                  {status === 'complete' ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <p className={`mt-2 text-xs font-semibold text-center leading-tight ${
                  status === 'current' ? 'text-[#FF6B35]' : status === 'complete' ? 'text-[#003D82]' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current step panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"
        >
          {currentIndex === 0 && (
            <StepPanel
              icon={<Building2 className="w-6 h-6 text-[#003D82]" />}
              title="Complete your company profile"
              body="Stripe needs your company's legal name and location to verify your business and set up payouts."
            >
              <div className="space-y-2 mb-6">
                <ChecklistItem done={!!(company?.company_name || company?.name)} label="Company name" />
                <ChecklistItem done={!!company?.city} label="City" />
                <ChecklistItem done={!!company?.state} label="State" />
                <ChecklistItem done={!!company?.industry} label="Industry" />
              </div>
              <a href="/settings/company"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all">
                Complete company profile <ArrowRight className="w-4 h-4" />
              </a>
            </StepPanel>
          )}

          {currentIndex === 1 && (
            <StepPanel
              icon={<CreditCard className="w-6 h-6 text-[#003D82]" />}
              title="Connect your Stripe account"
              body="Create a Stripe Connect account for your company. You'll be redirected to Stripe's secure onboarding flow."
            >
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-gray-700">
                Takes about 2 minutes. You'll need your business details and a bank account for payouts.
              </div>
              <button onClick={handleConnect} disabled={busy === 'connect'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                {busy === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Connect with Stripe
              </button>
            </StepPanel>
          )}

          {currentIndex === 2 && (
            <StepPanel
              icon={<FileText className="w-6 h-6 text-[#003D82]" />}
              title="Finish your business details"
              body="Stripe needs a few more details to verify your business. Complete the remaining requirements to continue."
            >
              {dueCount > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
                  <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {dueCount} requirement{dueCount !== 1 ? 's' : ''} outstanding
                  </p>
                  <ul className="space-y-1">
                    {requirements?.currentlyDue.slice(0, 8).map(r => (
                      <li key={r} className="text-xs text-amber-700 font-mono">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button onClick={handleConnect} disabled={busy === 'connect'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                  {busy === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Continue onboarding
                </button>
                <button onClick={handleRefresh} disabled={busy === 'refresh'}
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                  {busy === 'refresh' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  I've finished — check status
                </button>
              </div>
            </StepPanel>
          )}

          {currentIndex === 3 && (
            <StepPanel
              icon={<Landmark className="w-6 h-6 text-[#003D82]" />}
              title="Add your bank account for payouts"
              body="Connect a bank account so Stripe can pay out your earnings. This is the final step before you can accept payments."
            >
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-gray-700">
                Your bank details are handled securely by Stripe and never stored on our servers.
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleConnect} disabled={busy === 'connect'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                  {busy === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Add bank account
                </button>
                <button onClick={handleRefresh} disabled={busy === 'refresh'}
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                  {busy === 'refresh' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Check status
                </button>
              </div>
            </StepPanel>
          )}

          {currentIndex === 4 && (
            <StepPanel
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              title="You're ready to accept payments!"
              body="Your Stripe Connect account is fully set up. You can now list services and products and receive payouts."
            >
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6 text-sm text-emerald-800">
                Charges and payouts are both enabled. Funds will be paid out to your bank account on Stripe's schedule.
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="/admin/my-listings"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all">
                  Create a listing <ArrowRight className="w-4 h-4" />
                </a>
                <button onClick={handleRefresh} disabled={busy === 'refresh'}
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                  {busy === 'refresh' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Refresh status
                </button>
              </div>
            </StepPanel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function StepPanel({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm mt-1 max-w-xl">{body}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        : <AlertCircle className="w-4 h-4 text-amber-500" />}
      <span className={done ? 'text-gray-700' : 'text-gray-500'}>{label}</span>
    </div>
  )
}