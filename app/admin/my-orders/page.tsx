'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Loader2, Clock, CheckCircle2, XCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, type AdminContext } from '@/lib/admin/context'

interface Order {
  id: string
  status: string
  total_amount: number | null
  created_at: string
  counterparty: string | null
  service_title: string | null
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 border border-amber-200',       icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border border-blue-200',          icon: <AlertCircle className="w-3 h-3" /> },
  completed:   { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-50 text-red-600 border border-red-200',             icon: <XCircle className="w-3 h-3" /> },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

export default function MyOrdersPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const context = await loadAdminContext(supabase)
      setCtx(context)
      if (!context) { setLoading(false); return }

      const isEngineer = context.profile?.user_type === 'engineer'
      const column = isEngineer ? 'seller_id' : 'buyer_id'
      // Whichever party is NOT the current user is the counterparty.
      const joinKey = isEngineer ? 'buyer' : 'seller'

      const { data } = await supabase
        .from('marketplace_orders')
        .select(`id, order_type, status, total_amount, created_at, buyer:profiles!marketplace_orders_buyer_id_fkey(full_name, email), seller:profiles!marketplace_orders_seller_id_fkey(full_name, email)`)
        .eq(column, context.userId)
        .order('created_at', { ascending: false })
        .limit(100)

      setOrders((data ?? []).map((o: any) => ({
        id: o.id,
        status: o.status,
        total_amount: o.total_amount,
        created_at: o.created_at,
        counterparty: o[joinKey]?.full_name || o[joinKey]?.email || null,
        service_title: o.order_type?.replace(/_/g, ' '),
      })))
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
  if (!ctx) return null

  const isEngineer = ctx.profile?.user_type === 'engineer'
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const total = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total_amount || 0), 0)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEngineer ? 'Orders clients have placed for your services.' : 'Orders you have placed with engineers.'}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: orders.length },
          { label: 'Active', value: orders.filter(o => o.status === 'pending' || o.status === 'in_progress').length },
          { label: 'Completed', value: orders.filter(o => o.status === 'completed').length },
          { label: isEngineer ? 'Total Earned' : 'Total Spent', value: `$${total.toLocaleString()}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
              filter === f ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#003D82]/40 hover:text-[#003D82]'
            }`}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No orders found</p>
            <p className="text-gray-400 text-sm mt-1">
              {isEngineer ? 'Orders appear when clients purchase your services.' : 'Browse the marketplace to place your first order.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Type', isEngineer ? 'Client' : 'Vendor', 'Date', 'Amount', 'Status', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{o.service_title || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{o.counterparty || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400">{format(new Date(o.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">${(o.total_amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/orders/${o.id}`} className="inline-flex text-[#003D82] hover:text-[#002960]"><ExternalLink className="w-4 h-4" /></Link>
                    </td>
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
