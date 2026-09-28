'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2, TrendingUp, TrendingDown, DollarSign, Users, CheckCircle2,
  BarChart3, Flag, Package, Wrench, FileText, Gavel, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Metrics {
  revenue: number
  platformFees: number
  revenueGrowth: number
  newUsers: number
  userGrowth: number
  completionRate: number
  totalOrders: number
}
interface CategoryRow { name: string; revenue: number; percentage: number }
interface VendorRow { id: string; name: string; revenue: number; orders: number }
interface ReportRow {
  id: string
  target_type: string
  reason: string
  description: string | null
  status: string
  created_at: string
  reporter: { id: string; full_name: string | null; email: string | null } | null
}
interface ReportCounts { pending: number; investigating: number; resolved: number; dismissed: number }
interface Inventory {
  services: number; activeServices: number; products: number; activeProducts: number
  rfqs: number; openRfqs: number; offers: number; users: number
}
interface ReportsPayload {
  metrics: Metrics
  topCategories: CategoryRow[]
  topVendors: VendorRow[]
  reportQueue: ReportRow[]
  reportCounts: ReportCounts
  inventory: Inventory
}

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
]

const REASON_STYLES: Record<string, string> = {
  spam: 'bg-amber-100 text-amber-700 border-amber-200',
  fraud: 'bg-red-100 text-red-700 border-red-200',
  quality: 'bg-blue-100 text-blue-700 border-blue-200',
  abuse: 'bg-rose-100 text-rose-700 border-rose-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
}
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  investigating: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-gray-100 text-gray-500',
}

export default function AdminReportsPage() {
  const [range, setRange] = useState('30d')
  const [data, setData] = useState<ReportsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async (r: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?action=reports&range=${r}`)
      if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error || 'Failed to load reports'); return }
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(range) }, [range, load])

  const setReportStatus = async (id: string, status: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin?action=report-status&id=${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { toast.error('Update failed'); return }
      toast.success(`Marked ${status}`)
      setData(prev => prev ? {
        ...prev,
        reportQueue: prev.reportQueue.map(r => r.id === id ? { ...r, status } : r),
      } : prev)
    } catch { toast.error('Update failed') }
    finally { setBusyId(null) }
  }

  const m = data?.metrics
  const growthTone = (v: number) => v >= 0 ? 'text-emerald-600' : 'text-red-500'
  const GrowthIcon = ({ v }: { v: number }) => v >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />

  const metricCards = m ? [
    { label: 'Total Revenue', value: `$${m.revenue.toLocaleString()}`, sub: `${m.revenueGrowth >= 0 ? '+' : ''}${m.revenueGrowth}% vs previous period`, growth: m.revenueGrowth, icon: DollarSign, tone: 'text-[#003D82] bg-blue-50' },
    { label: 'Platform Fees', value: `$${m.platformFees.toLocaleString()}`, sub: 'From product orders', growth: null, icon: BarChart3, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'New Users', value: m.newUsers.toLocaleString(), sub: `${m.userGrowth >= 0 ? '+' : ''}${m.userGrowth}% vs previous period`, growth: m.userGrowth, icon: Users, tone: 'text-purple-600 bg-purple-50' },
    { label: 'Order Completion', value: `${m.completionRate}%`, sub: `${m.totalOrders} total orders`, growth: null, icon: CheckCircle2, tone: 'text-amber-600 bg-amber-50' },
  ] : []

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Live platform metrics, top performers, and the user report queue.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {RANGES.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r.value ? 'bg-white text-[#003D82] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => load(range)} disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-[#003D82] hover:border-[#003D82]/40 disabled:opacity-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
      ) : !data ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">Could not load reports</p>
          <p className="text-sm text-gray-400 mt-1">Check that the content_reports migration has been applied.</p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metricCards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.tone}`}>
                    <c.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{c.value}</p>
                <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${c.growth === null ? 'text-gray-400' : growthTone(c.growth)}`}>
                  {c.growth !== null && <GrowthIcon v={c.growth} />}{c.sub}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Inventory strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Services', value: data.inventory.services, active: data.inventory.activeServices, icon: Wrench },
              { label: 'Products', value: data.inventory.products, active: data.inventory.activeProducts, icon: Package },
              { label: 'RFQs', value: data.inventory.rfqs, active: data.inventory.openRfqs, icon: FileText },
              { label: 'Offers', value: data.inventory.offers, active: null, icon: Gavel },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#003D82]/8 text-[#003D82] flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-gray-900 leading-tight">{item.value}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {item.label}{item.active !== null ? ` · ${item.active} active` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top categories */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Top Categories by Revenue</h2>
              </div>
              <div className="p-6 space-y-4">
                {data.topCategories.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No revenue recorded yet.</p>
                ) : data.topCategories.map(c => (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-700 font-medium truncate">{c.name}</span>
                      <span className="text-gray-900 font-bold flex-shrink-0 ml-2">${c.revenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-[#003D82] h-2 rounded-full transition-all" style={{ width: `${Math.max(c.percentage, 2)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Top vendors */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Top Vendors by Revenue</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {data.topVendors.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">No vendor revenue yet.</p>
                ) : data.topVendors.map((v, i) => (
                  <div key={v.id} className="px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#003D82] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{v.name}</p>
                        <p className="text-xs text-gray-400">{v.orders} order{v.orders !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600 text-sm flex-shrink-0 ml-2">${v.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Report queue */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#FF6B35]" />
                <h2 className="font-bold text-gray-900">User Reports</h2>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{data.reportCounts.pending} pending</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{data.reportCounts.investigating} investigating</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{data.reportCounts.resolved} resolved</span>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {data.reportQueue.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700 text-sm">No reports filed</p>
                  <p className="text-xs text-gray-400 mt-1">User-submitted reports will appear here for review.</p>
                </div>
              ) : data.reportQueue.map(r => (
                <div key={r.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${REASON_STYLES[r.reason] || REASON_STYLES.other}`}>{r.reason}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">{r.target_type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>{r.status}</span>
                    </div>
                    <p className="text-sm text-gray-800">{r.description || 'No description provided'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      by {r.reporter?.full_name || r.reporter?.email || 'Unknown'} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {r.status !== 'investigating' && (
                      <button onClick={() => setReportStatus(r.id, 'investigating')} disabled={busyId === r.id}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                        Investigate
                      </button>
                    )}
                    {r.status !== 'resolved' && (
                      <button onClick={() => setReportStatus(r.id, 'resolved')} disabled={busyId === r.id}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                        Resolve
                      </button>
                    )}
                    {r.status !== 'dismissed' && (
                      <button onClick={() => setReportStatus(r.id, 'dismissed')} disabled={busyId === r.id}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
