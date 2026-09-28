'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Send, Loader2, ExternalLink, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, type AdminContext } from '@/lib/admin/context'

interface Rfq { id: string; title: string; category: string | null; budget: string | null; status: string | null; slug: string | null; created_at: string }
interface Offer { id: string; rfq_id: string; amount: number | null; status: string | null; created_at: string; rfq: { title: string; slug: string | null } | null }

const statusColor = (s: string | null) => {
  switch (s) {
    case 'open': return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'awarded': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'closed': return 'bg-gray-100 text-gray-500'
    case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'accepted': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'rejected': return 'bg-red-50 text-red-700 border border-red-200'
    default: return 'bg-gray-100 text-gray-500'
  }
}

export default function MyRfqsPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null)
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'posted' | 'offers'>('posted')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const context = await loadAdminContext(supabase)
      setCtx(context)
      if (!context) { setLoading(false); return }

      const [rfqRes, offerRes] = await Promise.all([
        supabase.from('rfqs').select('id, title, category, budget, status, slug, created_at').eq('client_id', context.userId).order('created_at', { ascending: false }),
        supabase.from('rfq_offers').select('id, rfq_id, amount, status, created_at, rfq:rfqs(title, slug)').eq('vendor_id', context.userId).order('created_at', { ascending: false }),
      ])
      setRfqs(rfqRes.data ?? [])
      setOffers((offerRes.data as any) ?? [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
  if (!ctx) return null

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My RFQs</h1>
          <p className="text-sm text-gray-500 mt-1">Requests you posted and offers you submitted.</p>
        </div>
        <Link href="/rfq/create"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition-all">
          <Plus className="w-4 h-4" /> Post RFQ
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('posted')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'posted' ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#003D82]/40 hover:text-[#003D82]'}`}>
          <FileText className="w-4 h-4" /> Posted ({rfqs.length})
        </button>
        <button onClick={() => setTab('offers')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'offers' ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#003D82]/40 hover:text-[#003D82]'}`}>
          <Send className="w-4 h-4" /> Offers Sent ({offers.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {tab === 'posted' ? (
          rfqs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">You have not posted any RFQs yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5 font-bold text-gray-700">Title</th>
                  <th className="text-left px-5 py-3.5 font-bold text-gray-700 hidden md:table-cell">Category</th>
                  <th className="text-left px-5 py-3.5 font-bold text-gray-700">Budget</th>
                  <th className="text-left px-5 py-3.5 font-bold text-gray-700">Status</th>
                  <th className="text-right px-5 py-3.5 font-bold text-gray-700">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rfqs.map(r => (
                  <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 max-w-[260px] truncate">{r.title}</td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{r.category || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 font-medium">{r.budget || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(r.status)}`}>{r.status || 'open'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/rfq/${r.slug || r.id}`} className="inline-flex text-[#003D82] hover:text-[#002960]"><ExternalLink className="w-4 h-4" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          offers.length === 0 ? (
            <div className="p-12 text-center">
              <Send className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">You have not submitted any offers yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5 font-bold text-gray-700">RFQ</th>
                  <th className="text-left px-5 py-3.5 font-bold text-gray-700">Amount</th>
                  <th className="text-left px-5 py-3.5 font-bold text-gray-700">Status</th>
                  <th className="text-right px-5 py-3.5 font-bold text-gray-700">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {offers.map(o => (
                  <tr key={o.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 max-w-[260px] truncate">{o.rfq?.title || 'RFQ'}</td>
                    <td className="px-5 py-3.5 text-gray-600 font-medium">{o.amount != null ? `$${Number(o.amount).toLocaleString()}` : '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(o.status)}`}>{o.status || 'pending'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/rfq/${o.rfq?.slug || o.rfq_id}`} className="inline-flex text-[#003D82] hover:text-[#002960]"><ExternalLink className="w-4 h-4" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
