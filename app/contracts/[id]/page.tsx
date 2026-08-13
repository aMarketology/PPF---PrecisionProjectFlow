'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft, Loader2, DollarSign, Calendar, User, Building2,
  CheckCircle, Clock, AlertCircle, Shield, Truck, Package, MessageSquare,
} from 'lucide-react'

interface Contract {
  id: string
  title: string
  description: string | null
  total_amount: number
  platform_fee: number
  status: string
  created_at: string
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  buyer_id: string
  vendor_id: string
  buyer?: { id: string; full_name: string; avatar_url?: string; company_name?: string }
  vendor?: { id: string; full_name: string; avatar_url?: string; company_name?: string }
  milestones?: {
    id: string; title: string; description: string | null; amount: number
    status: string; due_date: string | null; completed_at: string | null
    released_at: string | null
  }[]
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Draft' },
  pending_payment: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending Payment' },
  active: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Active' },
  in_progress: { color: 'text-purple-700', bg: 'bg-purple-100', label: 'In Progress' },
  completed: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Completed' },
  cancelled: { color: 'text-red-700', bg: 'bg-red-100', label: 'Cancelled' },
  disputed: { color: 'text-orange-700', bg: 'bg-orange-100', label: 'Disputed' },
}

const MILESTONE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Pending' },
  in_progress: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'In Progress' },
  delivered: { color: 'text-orange-700', bg: 'bg-orange-100', label: 'Delivered' },
  released: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Released' },
  disputed: { color: 'text-red-700', bg: 'bg-red-100', label: 'Disputed' },
}

export default function ContractDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contractId = params?.id as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  useEffect(() => {
    if (!contractId) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
    loadContract()
  }, [contractId])

  const loadContract = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}`)
      if (!res.ok) { router.push('/contracts'); return }
      const json = await res.json()
      setContract(json.contract)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const milestoneAction = async (milestoneId: string, action: 'deliver' | 'release') => {
    setActioning(milestoneId)
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, milestoneId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      toast.success(action === 'deliver' ? 'Milestone marked delivered' : 'Milestone released')
      await loadContract()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActioning(null)
    }
  }

  const formatPrice = (n: number) => '$' + n.toLocaleString()
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex justify-center py-40"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
        <Footer />
      </div>
    )
  }

  if (!contract) return null

  const status = STATUS_STYLES[contract.status] || STATUS_STYLES.draft
  const isBuyer = contract.buyer_id === currentUserId
  const isVendor = contract.vendor_id === currentUserId
  const otherParty = isBuyer ? contract.vendor : contract.buyer
  const releasedAmount = contract.milestones?.filter(m => m.status === 'released').reduce((s, m) => s + Number(m.amount), 0) ?? 0
  const totalMilestoneAmount = contract.milestones?.reduce((s, m) => s + Number(m.amount), 0) ?? 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
          <Link href="/contracts" className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Contracts
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-white">{contract.title}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Contract Summary</h2>
              {contract.description && (
                <p className="text-gray-600 mb-4 whitespace-pre-wrap">{contract.description}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">{formatPrice(contract.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Platform Fee</p>
                  <p className="text-xl font-bold text-gray-900">{formatPrice(contract.platform_fee)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Released</p>
                  <p className="text-xl font-bold text-emerald-600">{formatPrice(releasedAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Remaining</p>
                  <p className="text-xl font-bold text-orange-600">{formatPrice(totalMilestoneAmount - releasedAmount)}</p>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Milestones</h2>
              {!contract.milestones?.length ? (
                <p className="text-sm text-gray-400">No milestones defined for this contract.</p>
              ) : (
                <div className="space-y-3">
                  {contract.milestones.map((m, i) => {
                    const mStatus = MILESTONE_STYLES[m.status] || MILESTONE_STYLES.pending
                    return (
                      <div key={m.id} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#003D82] text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                            <p className="font-semibold text-gray-900">{m.title}</p>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${mStatus.bg} ${mStatus.color}`}>{mStatus.label}</span>
                          </div>
                          {m.description && <p className="text-sm text-gray-500 mt-1">{m.description}</p>}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatPrice(m.amount)}</span>
                            {m.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Due {formatDate(m.due_date)}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          {isVendor && m.status === 'in_progress' && (
                            <button onClick={() => milestoneAction(m.id, 'deliver')} disabled={actioning === m.id}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#003D82] text-white rounded-lg hover:bg-[#002960] disabled:opacity-50 flex items-center gap-1">
                              {actioning === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
                              Mark Delivered
                            </button>
                          )}
                          {isBuyer && m.status === 'delivered' && (
                            <button onClick={() => milestoneAction(m.id, 'release')} disabled={actioning === m.id}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A2B] disabled:opacity-50 flex items-center gap-1">
                              {actioning === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                              Release Funds
                            </button>
                          )}
                          {m.status === 'released' && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Released</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Parties */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Parties</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold">
                    {contract.buyer?.full_name?.charAt(0) || 'B'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{contract.buyer?.full_name || 'Buyer'}</p>
                    <p className="text-xs text-gray-400">Buyer{contract.buyer?.company_name ? ` · ${contract.buyer.company_name}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A2B] flex items-center justify-center text-white font-bold">
                    {contract.vendor?.full_name?.charAt(0) || 'V'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{contract.vendor?.full_name || 'Vendor'}</p>
                    <p className="text-xs text-gray-400">Vendor{contract.vendor?.company_name ? ` · ${contract.vendor.company_name}` : ''}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push(`/messages?with=${otherParty?.id}`)}
                className="w-full mt-4 px-4 py-2.5 bg-[#003D82] text-white rounded-xl font-semibold text-sm hover:bg-[#002960] flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Message
              </button>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-700">{formatDate(contract.created_at)}</span>
                </div>
                {contract.accepted_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Accepted</span>
                    <span className="text-gray-700">{formatDate(contract.accepted_at)}</span>
                  </div>
                )}
                {contract.started_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Started</span>
                    <span className="text-gray-700">{formatDate(contract.started_at)}</span>
                  </div>
                )}
                {contract.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Completed</span>
                    <span className="text-gray-700">{formatDate(contract.completed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}