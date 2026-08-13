'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText, Loader2, DollarSign, Calendar, User, Building2,
  CheckCircle, Clock, AlertCircle, ChevronRight, Shield,
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
  completed_at: string | null
  buyer?: { id: string; full_name: string; avatar_url?: string; company_name?: string }
  vendor?: { id: string; full_name: string; avatar_url?: string; company_name?: string }
  milestones?: { id: string; title: string; amount: number; status: string; due_date: string | null }[]
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

export default function ContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [role, setRole] = useState<'all' | 'buyer' | 'vendor'>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
    loadContracts()
  }, [role])

  const loadContracts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts?role=${role}`)
      const json = await res.json()
      setContracts(json.contracts || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const formatPrice = (n: number) => '$' + n.toLocaleString()
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const getMilestoneProgress = (c: Contract) => {
    if (!c.milestones?.length) return { done: 0, total: 0 }
    const released = c.milestones.filter(m => m.status === 'released').length
    return { done: released, total: c.milestones.length }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Contracts</h1>
          <p className="text-blue-200 text-sm mt-1">Manage your active contracts and milestones</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Role filter */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'buyer', 'vendor'] as const).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                role === r ? 'bg-[#003D82] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}>
              {r === 'all' ? 'All' : r === 'buyer' ? 'As Buyer' : 'As Vendor'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-700 mb-1">No contracts yet</p>
            <p className="text-sm text-gray-400">Contracts are created when an RFQ offer is accepted.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map(contract => {
              const status = STATUS_STYLES[contract.status] || STATUS_STYLES.draft
              const progress = getMilestoneProgress(contract)
              const isBuyer = contract.buyer?.id === currentUserId
              const otherParty = isBuyer ? contract.vendor : contract.buyer

              return (
                <motion.div key={contract.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {progress.total > 0 && (
                          <span className="text-xs text-gray-500">
                            {progress.done}/{progress.total} milestones
                          </span>
                        )}
                      </div>
                      <Link href={`/contracts/${contract.id}`}>
                        <h3 className="font-bold text-gray-900 hover:text-[#003D82] transition-colors">{contract.title}</h3>
                      </Link>
                      {contract.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{contract.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatPrice(contract.total_amount)}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(contract.created_at)}</span>
                        {otherParty && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {otherParty.full_name || otherParty.company_name || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/contracts/${contract.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#003D82] border border-gray-200 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0">
                      View <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}