'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Coins, CheckCircle2, Zap, Briefcase, Building2,
  ArrowRight, Loader2, Lock, ChevronLeft, Star
} from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 100,
    price: 10,
    unlocks: 1,
    icon: <Zap className="w-6 h-6" />,
    color: 'border-blue-200 hover:border-[#003D82]',
    badge: null,
    perks: ['1 conversation unlock', 'Send unlimited messages in that thread', 'Never expires'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tokens: 500,
    price: 45,
    unlocks: 5,
    icon: <Briefcase className="w-6 h-6" />,
    color: 'border-[#003D82] ring-2 ring-[#003D82]/20',
    badge: 'Most Popular',
    perks: ['5 conversation unlocks', 'Save 10% vs Starter', 'Never expires'],
  },
  {
    id: 'business',
    name: 'Business',
    tokens: 1200,
    price: 99,
    unlocks: 12,
    icon: <Building2 className="w-6 h-6" />,
    color: 'border-orange-200 hover:border-[#FF6B35]',
    badge: 'Best Value',
    perks: ['12 conversation unlocks', 'Save 17% vs Starter', 'Never expires'],
  },
]

// ── Inner checkout form ────────────────────────────────────────────────────
function CheckoutForm({
  selectedPack,
  clientSecret,
  onSuccess,
  onCancel,
}: {
  selectedPack: typeof PACKS[0]
  clientSecret: string
  onSuccess: (newBalance: number) => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setPaying(true)
    try {
      const card = elements.getElement(CardElement)
      if (!card) throw new Error('Card element not found')

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      })

      if (error) {
        toast.error(error.message || 'Payment failed')
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        // Credit tokens server-side (webhook is backup)
        const res = await fetch('/api/messages/credit-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        })
        const data = await res.json()
        if (data.ok || data.alreadyCredited) {
          onSuccess(data.newBalance ?? data.balance ?? 0)
        } else {
          toast.error('Payment succeeded but token credit failed — contact support')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Order summary */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">{selectedPack.name} Pack</p>
            <p className="text-sm text-gray-500">{selectedPack.tokens} tokens · {selectedPack.unlocks} conversation unlock{selectedPack.unlocks > 1 ? 's' : ''}</p>
          </div>
          <p className="text-2xl font-extrabold text-[#003D82]">${selectedPack.price}</p>
        </div>
      </div>

      {/* Card input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Card details</label>
        <div className="border border-gray-300 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-[#003D82] focus-within:border-[#003D82] transition-all">
          <CardElement options={{
            style: {
              base: {
                fontSize: '15px',
                color: '#111827',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                '::placeholder': { color: '#9CA3AF' },
              },
              invalid: { color: '#EF4444' },
            },
          }} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Secured by Stripe · Test card: 4242 4242 4242 4242
        </p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
          Back
        </button>
        <button type="submit" disabled={paying || !stripe}
          className="flex-1 py-3 bg-[#003D82] hover:bg-[#002960] disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
          {paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <>Pay ${selectedPack.price} <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </form>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function TokensPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tokenBalance, setTokenBalance] = useState(0)
  const [selectedPack, setSelectedPack] = useState<typeof PACKS[0] | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loadingSecret, setLoadingSecret] = useState(false)
  const [success, setSuccess] = useState<{ tokens: number; newBalance: number } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login?redirect=/tokens'); return }
      setUser(user)
      supabase.from('profiles').select('token_balance').eq('id', user.id).single()
        .then(({ data }) => setTokenBalance(data?.token_balance ?? 0))
    })
  }, [])

  async function handleSelectPack(pack: typeof PACKS[0]) {
    setSelectedPack(pack)
    setLoadingSecret(true)
    try {
      const res = await fetch('/api/stripe/buy-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      })
      const data = await res.json()
      if (data.clientSecret) {
        setClientSecret(data.clientSecret)
      } else {
        toast.error(data.error || 'Failed to start checkout')
        setSelectedPack(null)
      }
    } catch {
      toast.error('Network error — try again')
      setSelectedPack(null)
    } finally {
      setLoadingSecret(false)
    }
  }

  function handleSuccess(newBalance: number) {
    setSuccess({ tokens: selectedPack!.tokens, newBalance })
    setTokenBalance(newBalance)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)' }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Coins className="w-3.5 h-3.5 text-yellow-300" /> $ProjectFlow Tokens
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Buy Tokens, Start Conversations</h1>
          <p className="text-blue-200 text-lg mb-6">Each token pack unlocks direct messaging with engineers and vendors. Tokens never expire.</p>
          {user && (
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white px-4 py-2 rounded-full text-sm font-semibold">
              <Coins className="w-4 h-4 text-yellow-300" />
              Current balance: <span className="text-yellow-300 font-extrabold">{tokenBalance}</span> tokens
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

        <AnimatePresence mode="wait">

          {/* ── Success screen ── */}
          {success && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Tokens Added! 🎉</h2>
              <p className="text-gray-500 mb-2">
                <span className="font-bold text-[#003D82]">{success.tokens} tokens</span> have been added to your wallet.
              </p>
              <p className="text-gray-500 mb-8">
                New balance: <span className="font-extrabold text-gray-900">{success.newBalance} tokens</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/messages"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl transition-all">
                  Start Messaging <ArrowRight className="w-4 h-4" />
                </Link>
                <button onClick={() => { setSuccess(null); setSelectedPack(null); setClientSecret(null) }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all">
                  Buy More Tokens
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Checkout screen ── */}
          {!success && selectedPack && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="max-w-md mx-auto">
              <button onClick={() => { setSelectedPack(null); setClientSecret(null) }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back to packs
              </button>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-extrabold text-gray-900 mb-6">Complete Purchase</h2>
                {loadingSecret || !clientSecret ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-7 h-7 animate-spin text-[#003D82]" />
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm
                      selectedPack={selectedPack}
                      clientSecret={clientSecret}
                      onSuccess={handleSuccess}
                      onCancel={() => { setSelectedPack(null); setClientSecret(null) }}
                    />
                  </Elements>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Pack selection ── */}
          {!success && !selectedPack && (
            <motion.div key="packs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

              {/* How it works */}
              <div className="text-center mb-10">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2">How tokens work</h2>
                <p className="text-gray-500 max-w-xl mx-auto text-sm">
                  100 tokens = 1 conversation unlock. Once unlocked, send unlimited messages in that thread. Perfect for RFQs, quotes, and project discussions.
                </p>
              </div>

              {/* Pack cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {PACKS.map((pack) => (
                  <motion.div key={pack.id} whileHover={{ y: -4 }}
                    className={`relative bg-white rounded-2xl border-2 ${pack.color} shadow-sm p-6 flex flex-col cursor-pointer transition-all`}
                    onClick={() => handleSelectPack(pack)}>

                    {pack.badge && (
                      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white ${pack.id === 'pro' ? 'bg-[#003D82]' : 'bg-[#FF6B35]'}`}>
                        {pack.badge}
                      </div>
                    )}

                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${pack.id === 'pro' ? 'bg-[#003D82] text-white' : pack.id === 'business' ? 'bg-orange-100 text-[#FF6B35]' : 'bg-blue-50 text-[#003D82]'}`}>
                      {pack.icon}
                    </div>

                    <h3 className="text-lg font-extrabold text-gray-900 mb-1">{pack.name}</h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-extrabold text-gray-900">${pack.price}</span>
                      <span className="text-gray-400 text-sm">/ one-time</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-5">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold text-gray-700">{pack.tokens.toLocaleString()} tokens</span>
                      <span className="text-gray-400 text-xs">({pack.unlocks} unlock{pack.unlocks > 1 ? 's' : ''})</span>
                    </div>

                    <ul className="space-y-2 mb-6 flex-1">
                      {pack.perks.map(p => (
                        <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>

                    <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${pack.id === 'pro' ? 'bg-[#003D82] hover:bg-[#002960] text-white' : 'border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white'}`}>
                      Get {pack.name} <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Trust strip */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-500" /> 256-bit SSL encryption</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Secured by Stripe</div>
                <div className="flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-500" /> Tokens never expire</div>
                <div className="flex items-center gap-2"><Star className="w-4 h-4 text-blue-500" /> Instant wallet credit</div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <Footer />
    </div>
  )
}
