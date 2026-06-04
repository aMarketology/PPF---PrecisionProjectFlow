'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import {
  CheckCircle2, XCircle, Clock, Building2,
  User, Mail, Calendar, Loader2, ArrowLeft, Eye
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Claim {
  id: string
  company_id: string
  user_id: string
  reason: string
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  company: { company_name: string; city: string | null; state: string | null; slug: string | null } | null
  claimant: { full_name: string | null; email: string | null } | null
}

export default function AdminClaimsPage() {
  const [claims, setClaims]         = useState<Claim[]>([])
  const [loading, setLoading]       = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [filter, setFilter]         = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  useEffect(() => { checkAndLoad() }, [])

  async function checkAndLoad() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) { setIsAdmin(false); setLoading(false); return }
    setIsAdmin(true)
    await loadClaims()
  }

  async function loadClaims() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('company_claims')
      .select(`
        id, company_id, user_id, reason, status, reviewed_by, reviewed_at, created_at,
        company:company_profiles(company_name, city, state, slug),
        claimant:profiles!company_claims_user_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); toast.error('Failed to load claims') }
    else setClaims((data as any) || [])
    setLoading(false)
  }

  async function handleDecision(claim: Claim, decision: 'approved' | 'rejected') {
    setProcessing(claim.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Update claim record
      const { error: claimErr } = await supabase
        .from('company_claims')
        .update({ status: decision, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', claim.id)
      if (claimErr) throw claimErr

      if (decision === 'approved') {
        // Set company as claimed and assign owner
        const { error: compErr } = await supabase
          .from('company_profiles')
          .update({
            is_claimed:  true,
            claimed_by:  claim.user_id,
            claimed_at:  new Date().toISOString(),
            owner_id:    claim.user_id,
          })
          .eq('id', claim.company_id)
        if (compErr) throw compErr
        toast.success(`✅ Approved! ${claim.company?.company_name} is now owned by ${claim.claimant?.full_name || 'user'}.`)
      } else {
        toast.success(`Claim rejected.`)
      }

      await loadClaims()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update claim')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = claims.filter(c => filter === 'all' ? true : c.status === filter)

  const statusBadge = (status: string) => {
    if (status === 'pending')  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><Clock className="w-3 h-3" /> Pending</span>
    if (status === 'approved') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Approved</span>
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full"><XCircle className="w-3 h-3" /> Rejected</span>
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-500 text-sm">Admin access required.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const pendingCount = claims.filter(c => c.status === 'pending').length

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-1">Company Claim Requests</h1>
          <p className="text-blue-200">{pendingCount} pending review</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'all', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${filter === f ? 'bg-[#003D82] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f} {f !== 'all' && `(${claims.filter(c => c.status === f).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No {filter} claims</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(claim => (
              <motion.div key={claim.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-wrap items-start gap-4">

                  {/* Company info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-[#003D82]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{claim.company?.company_name || 'Unknown Company'}</p>
                      <p className="text-xs text-gray-500">{[claim.company?.city, claim.company?.state].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>

                  {/* Claimant info */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-800">{claim.claimant?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{claim.claimant?.email || claim.user_id.slice(0, 8)}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(claim.created_at).toLocaleDateString()}
                  </div>

                  {/* Status */}
                  {statusBadge(claim.status)}

                  {/* View company */}
                  {claim.company?.slug && (
                    <Link href={`/companies/${claim.company.slug}`} target="_blank"
                      className="flex items-center gap-1.5 text-xs text-[#003D82] font-semibold hover:underline">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                  )}
                </div>

                {/* Reason */}
                <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm text-gray-600 whitespace-pre-line border border-gray-100">
                  {claim.reason}
                </div>

                {/* Action buttons */}
                {claim.status === 'pending' && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleDecision(claim, 'approved')}
                      disabled={processing === claim.id}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                      {processing === claim.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve & Grant Access
                    </button>
                    <button
                      onClick={() => handleDecision(claim, 'rejected')}
                      disabled={processing === claim.id}
                      className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-red-200">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}

                {claim.status === 'approved' && (
                  <p className="mt-3 text-xs text-emerald-600 font-medium">
                    ✅ Approved {claim.reviewed_at ? `on ${new Date(claim.reviewed_at).toLocaleDateString()}` : ''}
                    — {claim.company?.company_name} is now owned by this user.
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
