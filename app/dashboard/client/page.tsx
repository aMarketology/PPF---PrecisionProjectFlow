'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import BadgeList from '@/app/components/BadgeList'
import { computeBadges } from '@/lib/badges'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import {
  Package, MessageSquare, ShoppingBag, DollarSign,
  Clock, CheckCircle2, XCircle, AlertCircle, Coins,
  Search, FileText, ChevronRight, BarChart3, Settings,
  User,
} from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  email: string
  user_type: string
  token_balance: number
  avatar_url: string | null
  location: string | null
  bio: string | null
  created_at: string
  is_admin: boolean | null
}

interface Order {
  id: string
  status: string
  total_amount: number
  created_at: string
  engineer: { full_name: string; email: string } | null
  service: { title: string } | null
}

interface RFQ {
  id: string
  title: string
  category: string
  description: string
  budget: string | null
  timeline: string | null
  location: string | null
  status: string
  created_at: string
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 border border-amber-200',       icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border border-blue-200',          icon: <AlertCircle className="w-3 h-3" /> },
  completed:   { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-50 text-red-600 border border-red-200',             icon: <XCircle className="w-3 h-3" /> },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

function StatCard({ icon, label, value, sub, accent = false }: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${accent ? 'bg-[#003D82] border-[#002960]' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-white/15' : 'bg-blue-50'}`}>
        <span className={accent ? 'text-white' : 'text-[#003D82]'}>{icon}</span>
      </div>
      <div>
        <p className={`text-2xl font-extrabold ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        <p className={`text-xs font-semibold mt-0.5 ${accent ? 'text-blue-200' : 'text-gray-500'}`}>{label}</p>
      </div>
      <p className={`text-xs ${accent ? 'text-blue-200' : 'text-gray-400'}`}>{sub}</p>
    </div>
  )
}

export default function ClientDashboard() {
  const router = useRouter()
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [orders, setOrders]           = useState<Order[]>([])
  const [rfqs, setRfqs]               = useState<RFQ[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState<'overview' | 'orders' | 'rfqs'>('overview')

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    if (!profileData) { router.push('/login'); return }
    if (profileData.user_type === 'engineer') { router.push('/dashboard/engineer'); return }
    setProfile(profileData)

    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at, engineer:profiles!orders_engineer_id_fkey(full_name, email), service:services!orders_service_id_fkey(title)')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setOrders((ordersData as any) || [])

    try {
      const { data } = await supabase.rpc('get_unread_message_count', { p_user_id: user.id })
      setUnreadCount(data || 0)
    } catch { /* optional */ }

    const { data: rfqsData } = await supabase
      .from('rfqs')
      .select('id, title, category, description, budget, timeline, location, status, created_at')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
    setRfqs(rfqsData || [])

    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#003D82]/20 border-t-[#003D82] rounded-full animate-spin" />
    </div>
  )

  const activeOrders    = orders.filter(o => o.status === 'pending' || o.status === 'in_progress')
  const completedOrders = orders.filter(o => o.status === 'completed')
  const totalSpent      = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  const TABS = [
    { key: 'overview', label: 'Overview',                  icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'orders',   label: `Orders (${orders.length})`, icon: <Package className="w-4 h-4" /> },
    { key: 'rfqs',     label: `My RFQs (${rfqs.length})`,  icon: <FileText className="w-4 h-4" /> },
  ] as const

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <p className="text-blue-200 text-sm font-medium mb-0.5">Client Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{profile?.full_name || 'Welcome back!'}</h1>
              {profile?.location && <p className="text-blue-300 text-sm mt-0.5">{profile.location}</p>}
              <BadgeList
                badges={computeBadges({
                  profile,
                  emailVerified: !!profile?.email,
                  placedOrderCount: orders.length,
                  rfqCount: rfqs.length,
                })}
                size="sm"
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
              <Coins className="w-4 h-4 text-amber-300" />
              <span className="font-bold text-white">{profile?.token_balance ?? 0}</span>
              <span className="text-blue-200 text-sm">tokens</span>
            </div>
            {unreadCount > 0 && (
              <Link href="/messages"
                className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
                <MessageSquare className="w-4 h-4" />
                Messages <span className="bg-white text-[#FF6B35] text-xs font-bold rounded-full px-1.5 py-0.5">{unreadCount}</span>
              </Link>
            )}
            <Link href="/marketplace"
              className="flex items-center gap-2 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
              <Search className="w-4 h-4" />Browse Services
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 mb-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key ? 'bg-[#003D82] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
          <Link href="/settings"
            className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all whitespace-nowrap">
            <Settings className="w-4 h-4" />Settings
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Spent"  value={`$${totalSpent.toLocaleString()}`} sub={`${completedOrders.length} completed`} accent />
                <StatCard icon={<Clock className="w-5 h-5" />}       label="Active Orders" value={String(activeOrders.length)}     sub="In progress or pending" />
                <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Completed"  value={String(completedOrders.length)}   sub="Successfully delivered" />
                <StatCard icon={<Coins className="w-5 h-5" />}        label="Tokens"      value={String(profile?.token_balance ?? 0)} sub="For outreach messages" />
              </div>

              {/* Recent orders */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">Recent Orders</h2>
                  <button onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-[#003D82] hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {orders.length === 0 ? (
                  <div className="p-16 text-center">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="font-semibold text-gray-500 mb-1">No orders yet</p>
                    <p className="text-gray-400 text-sm mb-4">Browse the marketplace to find engineering services</p>
                    <Link href="/marketplace"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003D82] text-white font-semibold rounded-xl text-sm hover:bg-[#002960] transition-all">
                      <Search className="w-4 h-4" />Browse Marketplace
                    </Link>
                  </div>
                ) : orders.slice(0, 5).map(o => (
                  <div key={o.id} className="px-6 py-4 border-b border-gray-50 last:border-0 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{o.service?.title || 'Order'}</p>
                      <p className="text-xs text-gray-400">{o.engineer?.full_name || 'Vendor'} · {format(new Date(o.created_at), 'MMM d')}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-gray-900 text-sm">${o.total_amount?.toLocaleString()}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Marketplace',   icon: <Search className="w-5 h-5" />,        href: '/marketplace', color: 'text-[#003D82] bg-blue-50',    badge: 0 },
                  { label: 'Messages',      icon: <MessageSquare className="w-5 h-5" />,  href: '/messages',    color: 'text-emerald-700 bg-emerald-50', badge: unreadCount },
                  { label: 'Request Quote', icon: <FileText className="w-5 h-5" />,       href: '/rfq',         color: 'text-[#FF6B35] bg-orange-50',   badge: 0 },
                  { label: 'Settings',      icon: <Settings className="w-5 h-5" />,       href: '/settings',    color: 'text-gray-600 bg-gray-100',     badge: 0 },
                ].map(item => (
                  <Link key={item.label} href={item.href}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-2 hover:shadow-md hover:border-gray-200 transition-all group relative">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>{item.icon}</div>
                    {item.badge > 0 && (
                      <span className="absolute top-3 right-3 w-5 h-5 bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{item.badge}</span>
                    )}
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{item.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ORDERS ── */}
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">All Orders <span className="text-gray-400 font-normal text-sm">({orders.length})</span></h2>
                </div>
                {orders.length === 0 ? (
                  <div className="p-20 text-center">
                    <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="font-semibold text-gray-500 mb-5">No orders yet</p>
                    <Link href="/marketplace"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003D82] text-white font-semibold rounded-xl text-sm hover:bg-[#002960] transition-all">
                      Browse Marketplace
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {['Service', 'Vendor', 'Date', 'Amount', 'Status'].map(h => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orders.map(o => (
                          <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-900 text-sm">{o.service?.title || '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{o.engineer?.full_name || '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">{format(new Date(o.created_at), 'MMM d, yyyy')}</td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">${o.total_amount?.toLocaleString()}</td>
                            <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── MY RFQs ── */}
          {activeTab === 'rfqs' && (
            <motion.div key="rfqs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">My RFQs</h2>
                  <p className="text-sm text-gray-500">Requests for quote you have submitted</p>
                </div>
                <Link href="/rfq/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#003D82] hover:bg-[#002960] text-white text-sm font-semibold rounded-xl transition-all">
                  <FileText className="w-4 h-4" /> New RFQ
                </Link>
              </div>

              {rfqs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                  <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="font-semibold text-gray-500 mb-5">No RFQs submitted yet</p>
                  <Link href="/rfq/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl text-sm transition-all">
                    Submit Your First RFQ
                  </Link>
                </div>
              ) : (
                rfqs.map(rfq => {
                  const statusCfg: Record<string, { cls: string; label: string }> = {
                    open:      { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100', label: 'Open' },
                    in_review: { cls: 'bg-blue-50 text-blue-700 border border-blue-100',          label: 'In Review' },
                    awarded:   { cls: 'bg-purple-50 text-purple-700 border border-purple-100',    label: 'Awarded' },
                    closed:    { cls: 'bg-gray-100 text-gray-500 border border-gray-200',         label: 'Closed' },
                  }
                  const sc = statusCfg[rfq.status] ?? statusCfg.open
                  return (
                    <div key={rfq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#003D82] border border-blue-100">{rfq.category}</span>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.cls}`}>{sc.label}</span>
                          </div>
                          <h3 className="font-bold text-gray-900 mt-1 mb-1">{rfq.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{rfq.description}</p>
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                            {rfq.budget   && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{rfq.budget}</span>}
                            {rfq.timeline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rfq.timeline}</span>}
                            <span>{format(new Date(rfq.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        <Link href="/messages"
                          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:border-[#003D82] text-gray-600 hover:text-[#003D82] text-sm font-semibold rounded-xl transition-all">
                          <MessageSquare className="w-4 h-4" /> Replies
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
