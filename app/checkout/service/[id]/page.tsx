'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { createClient } from '@/lib/supabase/client'
import { Loader, ArrowLeft, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
// Reuse the same CheckoutForm from /checkout/[id]/
import CheckoutForm from '@/app/checkout/[id]/CheckoutForm'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Service {
  id: string
  title: string
  description: string
  price: number
  category: string
  provider: { full_name: string } | null
}

export default function ServiceCheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string

  const [service, setService] = useState<Service | null>(null)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeCheckout()
  }, [serviceId])

  async function initializeCheckout() {
    try {
      setLoading(true)

      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error('Please log in to continue')
        router.push(`/login?redirect=/checkout/service/${serviceId}`)
        return
      }

      // Fetch service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select(`
          id, title, description, price, category,
          provider:profiles(full_name)
        `)
        .eq('id', serviceId)
        .eq('active', true)
        .single()

      if (serviceError || !serviceData) {
        toast.error('Service not found')
        router.push('/marketplace')
        return
      }

      setService(serviceData as any)

      // Create payment intent — reuse the same API endpoint
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: serviceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      setClientSecret(data.clientSecret)
    } catch (error: any) {
      console.error('Checkout error:', error)
      toast.error(error.message || 'Failed to initialize checkout')
      router.push(`/marketplace/service/${serviceId}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-slate-400">Preparing checkout...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!service || !clientSecret) return null

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#1e293b',
        colorText: '#f1f5f9',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <Link href={`/marketplace/service/${serviceId}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Service
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 sticky top-4"
            >
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

              <div className="mb-6 pb-6 border-b border-slate-700">
                <div className="w-full h-24 bg-slate-700 rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheck className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="font-semibold text-white mb-1">{service.title}</h3>
                <p className="text-sm text-slate-400">{service.provider?.full_name || 'Vendor'}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  {service.category}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-300">
                  <span>Service Price</span>
                  <span>${Number(service.price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Processing Fee</span>
                  <span className="text-slate-500">Included</span>
                </div>
                <div className="border-t border-slate-700 pt-3 flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span>${Number(service.price).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-700/50 rounded-lg p-3">
                <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </motion.div>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Payment Details</h2>
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm
                  productId={serviceId}
                  amount={Number(service.price)}
                  currency="usd"
                />
              </Elements>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
