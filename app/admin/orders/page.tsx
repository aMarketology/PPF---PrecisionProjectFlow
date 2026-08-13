'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Truck } from 'lucide-react'

interface Order {
  id: string
  order_number: string
  product_name: string
  total_amount: number
  platform_fee: number
  status: string
  created_at: string
  shipped_at: string | null
  shipping_carrier: string | null
  shipping_tracking: string | null
  buyer?: { full_name: string; email: string }
  company?: { company_name: string }
}

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  paid: 'bg-blue-100 text-blue-700 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-300',
  shipped: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  delivered: 'bg-orange-100 text-orange-700 border-orange-300',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
  refunded: 'bg-gray-100 text-gray-600 border-gray-300',
  disputed: 'bg-red-200 text-red-800 border-red-400',
}

const ALL_STATUSES = ['all', 'pending_payment', 'paid', 'in_progress', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'disputed']

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?action=data&tab=orders')
      const json = await res.json()
      setOrders(json.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.product_name?.toLowerCase().includes(q) ||
      o.buyer?.full_name?.toLowerCase().includes(q) ||
      o.company?.company_name?.toLowerCase().includes(q)
    )
  })

  const completedTotal = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (Number(o.total_amount) - Number(o.platform_fee || 0)), 0)

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const formatPrice = (n: number) => '$' + n.toLocaleString()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Order Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending_payment').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-blue-600">{orders.filter(o => ['paid', 'in_progress', 'shipped'].includes(o.status)).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{orders.filter(o => o.status === 'completed').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(completedTotal)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30">
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} orders</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Order #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Buyer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Company</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Shipping</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No orders found</td></tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[100px] truncate">{order.order_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{order.product_name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[150px] truncate">
                      {order.buyer?.full_name || '—'}<br />
                      <span className="text-xs text-gray-400">{order.buyer?.email}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{order.company?.company_name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(order.total_amount)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {order.shipping_carrier ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Truck className="w-3 h-3 text-indigo-500" />
                          <span className="text-gray-700">{order.shipping_carrier}</span>
                          {order.shipping_tracking && <span className="text-gray-400 font-mono">{order.shipping_tracking}</span>}
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 hidden md:table-cell">{formatDate(order.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}