'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import {
  Building2, CheckCircle2, AlertCircle, Loader2,
  ArrowLeft, User, Mail, Phone, Briefcase
} from 'lucide-react'

interface Company {
  id: string
  company_name: string
  slug: string | null
  industry: string | null
  city: string | null
  state: string | null
  is_claimed: boolean
}

function ClaimCompanyInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const prefilledId   = searchParams.get('id')
  const prefilledName = searchParams.get('name')

  const [user, setUser]             = useState<any>(null)
  const [company, setCompany]       = useState<Company | null>(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState('')

  const [fullName, setFullName]   = useState('')
  const [title, setTitle]         = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [phone, setPhone]         = useState('')
  const [reason, setReason]       = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push(`/login?redirect=/claim-company?id=${prefilledId}&name=${encodeURIComponent(prefilledName || '')}`)
        return
      }
      setUser(user)
      supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.full_name) setFullName(data.full_name)
          if (data?.email)     setWorkEmail(data.email)
        })
    })

    if (prefilledId) {
      const supabase = createClient()
      supabase.from('company_profiles')
        .select('id, company_name, slug, industry, city, state, is_claimed')
        .eq('id', prefilledId)
        .single()
        .then(({ data }) => {
          if (data) setCompany(data)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !company) return
    if (reason.trim().length < 20) {
      setError('Please explain your connection to this company (min 20 characters).')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: insertError } = await supabase
        .from('company_claims')
        .insert({
          company_id: company.id,
          user_id:    user.id,
          reason:     `Name: ${fullName} | Title: ${title} | Email: ${workEmail} | Phone: ${phone}\n\n${reason}`,
          status:     'pending',
        })
      if (insertError) throw insertError
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
        </div>
        <Footer />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Claim Request Submitted!</h1>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Our team will review your claim for <strong>{company?.company_name}</strong> and get back to you within 1–2 business days.
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left mb-6 space-y-2 text-sm text-gray-600">
              <p className="font-semibold text-gray-800 mb-1">What happens next:</p>
              <p>✅ Admin reviews and verifies your connection to the company</p>
              <p>✅ You receive confirmation once approved</p>
              <p>✅ You can then edit the profile, add photos, update contact info</p>
            </div>
            <Link href={company?.slug ? `/companies/${company.slug}` : '/companies'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl transition-all text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Company Profile
            </Link>
          </motion.div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="text-center max-w-sm">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Company Not Found</h1>
            <p className="text-gray-500 text-sm mb-5">Use the link from a company profile page to claim it.</p>
            <Link href="/companies" className="inline-flex items-center gap-2 text-sm text-[#003D82] font-semibold">
              <ArrowLeft className="w-4 h-4" /> Browse Directory
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (company.is_claimed) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="text-center max-w-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Already Claimed</h1>
            <p className="text-gray-500 text-sm mb-5">{company.company_name} has already been claimed and verified.</p>
            <Link href={company.slug ? `/companies/${company.slug}` : '/companies'}
              className="inline-flex items-center gap-2 text-sm text-[#003D82] font-semibold">
              <ArrowLeft className="w-4 h-4" /> View Profile
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link href={company.slug ? `/companies/${company.slug}` : '/companies'}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Claim This Company</h1>
          <p className="text-blue-200">Verify your connection to <strong className="text-white">{company.company_name}</strong></p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-[#003D82]" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{company.company_name}</p>
            <p className="text-sm text-gray-500">{[company.city, company.state].filter(Boolean).join(', ')}{company.industry ? ` · ${company.industry}` : ''}</p>
          </div>
          <span className="ml-auto text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 shrink-0">
            <Briefcase className="w-3 h-3" /> Unclaimed
          </span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Your Information</h2>
            <p className="text-sm text-gray-500 mt-0.5">Our admin team reviews all claims within 1–2 business days.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Job Title <span className="text-red-500">*</span></label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Inside Sales Manager"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Work Email <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="email" value={workEmail} onChange={e => setWorkEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Your connection to this company <span className="text-red-500">*</span>
            </label>
            <textarea required rows={4} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Briefly describe your relationship — e.g. I'm the inside sales manager and have worked here for 3 years. I'd like to update our company profile and respond to inquiries."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82] resize-none" />
            <p className="text-xs text-gray-400 mt-1">{reason.length} chars · 20 minimum</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Link href={company.slug ? `/companies/${company.slug}` : '/companies'}
              className="flex-1 text-center py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancel
            </Link>
            <button type="submit" disabled={submitting || reason.length < 20}
              className="flex-1 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Claim Request'}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  )
}

export default function ClaimCompanyPage() {
  return (
    <Suspense fallback={null}>
      <ClaimCompanyInner />
    </Suspense>
  )
}
