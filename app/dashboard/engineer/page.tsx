'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import BadgeList from '@/app/components/BadgeList'
import StripeConnectBanner from '@/app/components/StripeConnectBanner'
import { computeBadges } from '@/lib/badges'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import {
  Package, Wrench, TrendingUp, Plus, ExternalLink,
  DollarSign, Clock, CheckCircle2, XCircle, Building2,
  Coins, MessageSquare, Settings, Eye, EyeOff, BarChart3,
  ChevronRight, AlertCircle, FileText, Pencil,
} from 'lucide-react'

interface Profile { id: string; full_name: string; company_name: string | null; email: string; user_type: string; token_balance: number; avatar_url: string | null; location: string | null; bio: string | null; created_at: string; is_admin: boolean | null }
interface Order { id: string; status: string; total_amount: number; created_at: string; client: any; service: any }
interface Service { id: string; title: string; description: string; price: number; category: string; active: boolean; created_at: string }
interface RFQ { id: string; title: string; category: string; description: string; budget: string | null; timeline: string | null; location: string | null; status: string; created_at: string; client: { id: string; full_name: string; company_name: string | null } }

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 border border-amber-200',   icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border border-blue-200',      icon: <AlertCircle className="w-3 h-3" /> },
  completed:   { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-50 text-red-600 border border-red-200',         icon: <XCircle className="w-3 h-3" /> },
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
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${accent ? 'bg-[#003D82] border-[#002960] text-white' : 'bg-white border-gray-100 shadow-sm'}`}>
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

export default function EngineerDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'services' | 'earnings' | 'rfqs'>('overview')
  const [stripeConnected, setStripeConnected] = useState(false)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profileData || profileData.user_type !== 'engineer') { router.push('/dashboard/client'); return }
    setProfile(profileData)

    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at, client:profiles!orders_client_id_fkey(full_name, email), service:services!orders_service_id_fkey(title)')
      .eq('engineer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setOrders((ordersData as any) || [])

    const { data: servicesData } = await supabase.from('services').select('*').eq('provider_id', user.id).order('created_at', { ascending: false })
    setServices(servicesData || [])

    const { data: rfqsData } = await supabase
      .from('rfqs')
      .select('id, title, category, description, budget, timeline, location, status, created_at, client:profiles!rfqs_client_id_fkey(id, full_name, company_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20)
    setRfqs((rfqsData as any) || [])

    // Stripe Connect status — drives the "Payouts Ready" badge
    const { data: company } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (company) {
      const { data: stripe } = await supabase
        .from('stripe_connect_accounts')
        .select('charges_enabled, payouts_enabled')
        .eq('company_id', company.id)
        .maybeSingle()
      setStripeConnected(!!(stripe?.charges_enabled && stripe?.payouts_enabled))
    }

    setLoading(false)
  }

  async function toggleService(id: string, current: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from('services').update({ active: !current }).eq('id', id)
    if (!error) setServices(prev => prev.map(s => s.id === id ? { ...s, active: !current } : s))
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#003D82]/20 border-t-[#003D82] rounded-full animate-spin" />
    </div>
  )

  const completedOrders = orders.filter(o => o.status === 'completed')
  const activeOrders    = orders.filter(o => o.status === 'in_progress' || o.status === 'pending')
  const totalEarnings   = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const pendingAmount   = activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const displayName     = profile?.company_name ?? profile?.full_name ?? ''

  const badges = computeBadges({
    profile: profile,
    emailVerified: !!profile?.email,
    serviceCount: services.length,
    completedOrderCount: completedOrders.length,
    stripeConnected,
  })

  const TABS = [
    { key: 'overview',  label: 'Overview',  icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'orders',    label: `Orders (${orders.length})`, icon: <Package className="w-4 h-4" /> },
    { key: 'services',  label: `Services (${services.length})`, icon: <Wrench className="w-4 h-4" /> },
    { key: 'rfqs',      label: `Open RFQs (${rfqs.length})`, icon: <FileText className="w-4 h-4" /> },
    { key: 'earnings',  label: 'Earnings',  icon: <TrendingUp className="w-4 h-4" /> },
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
              <img src={profile.avatar_url} alt={displayName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <p className="text-blue-200 text-sm font-medium mb-0.5">Engineer Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{displayName}</h1>
              {profile?.location && <p className="text-blue-300 text-sm mt-0.5">{profile.location}</p>}
              {badges.length > 0 && <BadgeList badges={badges} size="sm" className="mt-2" />}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
              <Coins className="w-4 h-4 text-amber-300" />
              <span className="font-bold text-white">{profile?.token_balance ?? 0}</span>
              <span className="text-blue-200 text-sm">tokens</span>
            </div>
            <Link href={`/profiles/${profile?.id}`}
              className="flex items-center gap-2 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
              <Eye className="w-4 h-4" />View Profile
            </Link>
            <Link href="/services/create"
              className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg">
              <Plus className="w-4 h-4" />Add Service
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tab bar (overlaps hero) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 mb-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-[#003D82] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
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

        {/* ── OVERVIEW ── */}
        <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            {/* Stripe Connect onboarding banner — auto-hides when fully connected */}
            <StripeConnectBanner userId={profile?.id} />

            {/* Stat grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Earned" value={`$${totalEarnings.toLocaleString()}`} sub={`${completedOrders.length} completed orders`} accent />
              <StatCard icon={<Clock className="w-5 h-5" />} label="Pending Revenue" value={`$${pendingAmount.toLocaleString()}`} sub={`${activeOrders.length} active orders`} />
              <StatCard icon={<Wrench className="w-5 h-5" />} label="Active Services" value={String(services.filter(s => s.active).length)} sub={`${services.length} total listed`} />
              <StatCard icon={<Coins className="w-5 h-5" />} label="Token Balance" value={String(profile?.token_balance ?? 0)} sub="For outreach messages" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent orders */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">Recent Orders</h2>
                  <button onClick={() => setActiveTab('orders')} className="text-xs font-semibold text-[#003D82] hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {orders.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-semibold">No orders yet</p>
                    <p className="text-gray-400 text-xs mt-1">Orders appear when clients purchase your services</p>
                  </div>
                ) : orders.slice(0, 5).map(o => (
                  <div key={o.id} className="px-6 py-4 border-b border-gray-50 last:border-0 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{o.service?.title || 'Order'}</p>
                      <p className="text-xs text-gray-400">{o.client?.full_name || 'Client'} · {format(new Date(o.created_at), 'MMM d')}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-gray-900 text-sm">${o.total_amount?.toLocaleString()}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Services */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">My Services</h2>
                  <Link href="/services/create" className="text-xs font-semibold text-[#FF6B35] hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />Add new
                  </Link>
                </div>
                {services.length === 0 ? (
                  <div className="p-12 text-center">
                    <Wrench className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-semibold mb-3">No services listed yet</p>
                    <Link href="/services/create" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003D82] text-white font-semibold rounded-xl text-xs hover:bg-[#002960] transition-all">
                      <Plus className="w-3.5 h-3.5" />Add your first service
                    </Link>
                  </div>
                ) : services.slice(0, 5).map(s => (
                  <div key={s.id} className="px-6 py-4 border-b border-gray-50 last:border-0 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                      <p className="text-xs text-gray-400">{s.category}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-gray-900 text-sm">${s.price.toLocaleString()}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                        {s.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {s.active ? 'Active' : 'Off'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Messages', icon: <MessageSquare className="w-5 h-5" />, href: '/messages', color: 'text-[#003D82] bg-blue-50' },
                { label: 'View Profile', icon: <Eye className="w-5 h-5" />, href: `/profiles/${profile?.id}`, color: 'text-emerald-700 bg-emerald-50' },
                { label: 'Add Service', icon: <Plus className="w-5 h-5" />, href: '/services/create', color: 'text-[#FF6B35] bg-orange-50' },
                { label: 'Settings', icon: <Settings className="w-5 h-5" />, href: '/settings', color: 'text-gray-600 bg-gray-100' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-2 hover:shadow-md hover:border-gray-200 transition-all group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>{item.icon}</div>
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
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="font-semibold text-gray-500">No orders yet</p>
                  <p className="text-gray-400 text-sm mt-1">Orders appear when clients purchase your services</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Service', 'Client', 'Date', 'Amount', 'Status'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900 text-sm">{o.service?.title || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{o.client?.full_name || '—'}</td>
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

        {/* ── SERVICES ── */}
        {activeTab === 'services' && (
          <motion.div key="services" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">My Services <span className="text-gray-400 font-normal text-sm">({services.length})</span></h2>
              <Link href="/services/create" className="flex items-center gap-2 bg-[#003D82] hover:bg-[#002960] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
                <Plus className="w-4 h-4" />Add Service
              </Link>
            </div>
            {services.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-20 text-center">
                <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-500 mb-4">No services listed yet</p>
                <Link href="/services/create" className="inline-flex items-center gap-2 bg-[#003D82] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#002960] transition-all">
                  <Plus className="w-4 h-4" />Add Your First Service
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {services.map((s, i) => (
                  <motion.div key={s.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${s.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{s.title}</h3>
                        <span className="inline-block text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold mt-1">{s.category}</span>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                        {s.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{s.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-extrabold text-gray-900">${s.price.toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <Link href={`/marketplace/service/${s.id}`}
                          className="p-2 border border-gray-200 rounded-xl hover:border-[#003D82] hover:text-[#003D82] text-gray-400 transition-all" title="View public listing">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link href={`/services/edit/${s.id}`}
                          className="p-2 border border-gray-200 rounded-xl hover:border-[#003D82] hover:text-[#003D82] text-gray-400 transition-all" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => toggleService(s.id, s.active)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                            s.active
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}>
                          {s.active ? <><EyeOff className="w-3.5 h-3.5" />Deactivate</> : <><Eye className="w-3.5 h-3.5" />Activate</>}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── EARNINGS ── */}
        {activeTab === 'earnings' && (
          <motion.div key="earnings" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Earned" value={`$${totalEarnings.toLocaleString()}`} sub={`${completedOrders.length} completed orders`} accent />
              <StatCard icon={<Clock className="w-5 h-5" />} label="Pending Revenue" value={`$${pendingAmount.toLocaleString()}`} sub={`${activeOrders.length} active orders`} />
              <StatCard icon={<Coins className="w-5 h-5" />} label="Token Balance" value={String(profile?.token_balance ?? 0)} sub="For outreach messages" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Completed Orders</h2>
              </div>
              {completedOrders.length === 0 ? (
                <div className="p-16 text-center">
                  <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-semibold">No completed orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Service', 'Client', 'Date', 'Amount'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {completedOrders.map(o => (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{o.service?.title || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{o.client?.full_name || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{format(new Date(o.created_at), 'MMM d, yyyy')}</td>
                          <td className="px-6 py-4 text-sm font-bold text-emerald-600">+${o.total_amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Open RFQs Tab ── */}
        {activeTab === 'rfqs' && (
          <motion.div key="rfqs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Open RFQs</h2>
                <p className="text-sm text-gray-500">Client requests actively looking for engineering vendors</p>
              </div>
            </div>
            {rfqs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-semibold">No open RFQs right now</p>
                <p className="text-gray-400 text-xs mt-1">Check back soon — new requests are posted regularly</p>
              </div>
            ) : (
              rfqs.map(rfq => (
                <div key={rfq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#003D82] border border-blue-100">
                          {rfq.category}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Open
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base mt-1 mb-1">{rfq.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{rfq.description}</p>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                        {rfq.budget   && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{rfq.budget}</span>}
                        {rfq.timeline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rfq.timeline}</span>}
                        {rfq.location && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{rfq.location}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(rfq.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Posted by <span className="font-semibold text-gray-600">{rfq.client?.company_name || rfq.client?.full_name || 'Client'}</span>
                      </p>
                    </div>
                    <Link
                      href={`/messages?with=${rfq.client?.id}`}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-[#003D82] hover:bg-[#002960] text-white text-sm font-semibold rounded-xl transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Respond
                    </Link>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}