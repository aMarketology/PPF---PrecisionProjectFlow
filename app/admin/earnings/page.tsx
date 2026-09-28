'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Loader2, DollarSign, Clock, Coins } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, type AdminContext } from '@/lib/admin/context'

interface CompletedOrder {
  id: string
  total_amount: number | null
  created_at: string
  counterparty: string | null
  service_title: string | null
}

export default function EarningsPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null)
  const [completed, setCompleted] = useState<CompletedOrder[]>([])
  const [pendingAmount, setPendingAmount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const context = await loadAdminContext(supabase)
      setCtx(context)
      if (!context) { setLoading(false); return }

      const { data } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, service:services!orders_service_id_fkey(title), client:profiles!orders_client_id_fkey(full_name, email)')
        .eq('engineer_id', context.userId)
        .order('created_at', { ascending: false })
        .limit(200)

      const rows = (data ?? []) as any[]
      setCompleted(rows.filter(r => r.status === 'completed').map(r => ({
        id: r.id,
        total_amount: r.total_amount,
        created_at: r.created_at,
        counterparty: r.client?.full_name || r.client?.email || null,
        service_title: r.service?.title || null,
      })))
      const active = rows.filter(r => r.status === 'pending' || r.status === 'in_progress')
      setActiveCount(active.length)
      setPendingAmount(active.reduce((s, r) => s + (r.total_amount || 0), 0))
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
  if (!ctx) return null

  const totalEarned = completed.reduce((s, o) => s + (o.total_amount || 0), 0)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Earnings</h1>
        <p className="text-sm text-gray-500 mt-1">Revenue from your completed orders.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="rounded-2xl border border-[#002960] bg-[#003D82] p-5">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-extrabold text-white">${totalEarned.toLocaleString()}</p>
          <p className="text-xs font-semibold text-blue-200 mt-0.5">Total Earned</p>
          <p className="text-xs text-blue-200 mt-2">{completed.length} completed orders</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-[#003D82]" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">${pendingAmount.toLocaleString()}</p>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">Pending Revenue</p>
          <p className="text-xs text-gray-400 mt-2">{activeCount} active orders</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Coins className="w-5 h-5 text-[#003D82]" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{ctx.profile?.token_balance ?? 0}</p>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">Token Balance</p>
          <p className="text-xs text-gray-400 mt-2">For outreach messages</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Completed Orders</h2>
        </div>
        {completed.length === 0 ? (
          <div className="p-16 text-center">
            <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-semibold">No completed orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Service', 'Client', 'Date', 'Amount'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completed.map(o => (
                  <tr key={o.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{o.service_title || '-'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{o.counterparty || '-'}</td>
                    <td className="px-5 py-3.5 text-gray-400">{format(new Date(o.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">+${(o.total_amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
