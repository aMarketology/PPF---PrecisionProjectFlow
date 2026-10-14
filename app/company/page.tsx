'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2, Loader2, MapPin, ExternalLink, Users, Shield, CheckCircle2,
  Search, MessageSquare, Package, FileText, ShoppingCart, TrendingUp,
  Crown, Settings, Plus, ArrowRight, Star, BadgeCheck, Hash, Lock,
} from 'lucide-react'
import SuperAdminCompanies from './SuperAdminCompanies'
import { toast } from 'react-hot-toast'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, can, type AdminContext } from '@/lib/admin/context'

interface CompanyStats {
  members: number
  services: number
  products: number
  rfqs: number
  orders: number
  revenue: number
  channels: number
}

interface TeamMember {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  profile: { full_name: string | null; email: string | null; avatar_url?: string | null; job_title?: string | null }
}

export default function CompanyHubPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [showMine, setShowMine] = useState(false)

  const company = ctx?.primaryCompany ?? null
  const canManage = ctx ? can(ctx, 'manage_company') : false

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const context = await loadAdminContext(supabase)
      setCtx(context)
      if (context?.primaryCompany) {
        await Promise.all([
          loadStats(context.primaryCompany.id),
          loadMembers(context.primaryCompany.id),
        ])
      }
      setLoading(false)
    })()
  }, [])

  const loadStats = async (companyId: string) => {
    setStatsLoading(true)
    try {
      const supabase = createClient()

      // Members
      const { count: memberCount } = await supabase
        .from('company_members')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'active')

      // Products owned by this company
      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)

      // Services: resolve provider ids that belong to this company
      const { data: memberRows } = await supabase
        .from('company_members')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('status', 'active')
      const memberIds = (memberRows ?? []).map(m => m.user_id)

      let serviceCount = 0
      let rfqCount = 0
      if (memberIds.length > 0) {
        const { count: sc } = await supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .in('provider_id', memberIds)
        serviceCount = sc ?? 0

        const { count: rc } = await supabase
          .from('rfqs')
          .select('id', { count: 'exact', head: true })
          .in('client_id', memberIds)
        rfqCount = rc ?? 0
      }

      // Orders + revenue (unified ledger, seller_company_id)
      const { data: orderRows } = await supabase
        .from('marketplace_orders')
        .select('total_amount, status')
        .eq('seller_company_id', companyId)
      const orders = orderRows ?? []
      const revenue = orders
        .filter(o => ['paid', 'in_progress', 'shipped', 'delivered', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

      // Channels (company conversations)
      const { count: channelCount } = await supabase
        .from('user_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)

      setStats({
        members: memberCount ?? 0,
        services: serviceCount,
        products: productCount ?? 0,
        rfqs: rfqCount,
        orders: orders.length,
        revenue,
        channels: channelCount ?? 0,
      })
    } catch (e) {
      console.error('loadStats:', e)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadMembers = async (companyId: string) => {
    const supabase = createClient()
    const { data: mems } = await supabase
      .from('company_members')
      .select('id, user_id, role, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (!mems) return
    const withProfiles = await Promise.all(mems.map(async (m) => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, job_title')
        .eq('id', m.user_id)
        .single()
      return { ...m, profile: prof ?? { full_name: null, email: null, job_title: null } } as TeamMember
    }))
    setMembers(withProfiles)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[70vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
        </div>
        <Footer />
      </div>
    )
  }

  // ── Not logged in: prompt ──
  if (!ctx) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="max-w-md mx-auto px-4 pt-40 pb-24">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#003D82]/10 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-8 h-8 text-[#003D82]" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Log in to view your company</h1>
            <p className="text-gray-500 mb-8 text-sm">The Company Hub is only available to signed-in members.</p>
            <div className="flex flex-col gap-3">
              <Link href="/login?redirect=/company"
                className="px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl">Log In</Link>
              <Link href="/signup"
                className="px-6 py-3 border-2 border-[#003D82] text-[#003D82] font-bold rounded-xl">Create Account</Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Super admin: platform-wide company directory (toggle to own company) ──
  if (ctx.isAdmin && !showMine) {
    return <SuperAdminCompanies hasOwn={!!company} onShowMine={() => setShowMine(true)} />
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)' }} />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FF6B35]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {ctx.isAdmin && (
              <button onClick={() => setShowMine(false)}
                className="mb-4 mr-3 inline-flex items-center gap-1.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-xs font-semibold rounded-full px-3 py-1">
                <Shield className="w-3.5 h-3.5" /> Back to all companies
              </button>
            )}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 mb-4">
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-blue-200 text-xs font-semibold tracking-wider uppercase">Company Hub</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
              {company ? company.company_name : 'Your Company'}
            </h1>
            <p className="text-blue-200/90 text-lg max-w-2xl leading-relaxed">
              {company
                ? 'Everything about your company — team, listings, orders, and revenue in one place.'
                : 'Create or claim your company to unlock team channels, listings, and free internal messaging.'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!company ? (
          /* ── Empty state: no company ── */
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 sm:p-14 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#003D82]/10 flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-8 h-8 text-[#003D82]" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You're not part of a company yet</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Join a company to unlock team channels, free internal messaging, shared listings, and a public company page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/companies/create"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all">
                <Plus className="w-4 h-4" /> Create Company
              </Link>
              <Link href="/companies"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-bold rounded-xl transition-all">
                <Search className="w-4 h-4" /> Claim Existing
              </Link>
            </div>
          </motion.div>
        ) : (
          /* ── Company dashboard ── */
          <div className="space-y-6">
            {/* Company card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-[#003D82]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl font-extrabold text-gray-900 truncate">{company.company_name}</h2>
                    {company.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <BadgeCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {!company.is_claimed && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Unclaimed</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 flex-wrap">
                    <MapPin className="w-4 h-4" />
                    {[company.city, company.state].filter(Boolean).join(', ') || '—'}
                    {company.industry && <span className="text-gray-300">·</span>}
                    {company.industry && <span>{company.industry}</span>}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">
                      {company.role === 'owner' ? <Crown className="w-3 h-3 text-amber-500" /> : company.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {company.role}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/companies/${company.slug || company.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition-all">
                    View Public Page <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  {canManage && (
                    <Link href={`/companies/${company.slug || company.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl text-sm transition-all">
                      <Settings className="w-4 h-4" /> Edit
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Team Members', value: stats?.members ?? 0, icon: Users, href: '/admin/company', color: 'text-[#003D82]' },
                { label: 'Services', value: stats?.services ?? 0, icon: FileText, href: '/admin/my-listings', color: 'text-blue-600' },
                { label: 'Products', value: stats?.products ?? 0, icon: Package, href: '/admin/my-listings', color: 'text-purple-600' },
                { label: 'RFQs Posted', value: stats?.rfqs ?? 0, icon: FileText, href: '/admin/my-rfqs', color: 'text-amber-600' },
                { label: 'Orders', value: stats?.orders ?? 0, icon: ShoppingCart, href: '/admin/my-orders', color: 'text-emerald-600' },
                { label: 'Revenue', value: `$${(stats?.revenue ?? 0).toLocaleString()}`, icon: TrendingUp, href: '/admin/earnings', color: 'text-[#FF6B35]' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={s.href}
                    className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-[#003D82]/30 transition-all">
                    <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                    <p className="text-2xl font-extrabold text-gray-900">
                      {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-300" /> : s.value}
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team members */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-[#003D82]" /> Team</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{members.length} active member{members.length !== 1 ? 's' : ''}</p>
                  </div>
                  {canManage && (
                    <Link href="/admin/company"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-xs font-semibold rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Manage Team
                    </Link>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {members.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                      <p className="text-sm">No team members yet</p>
                    </div>
                  ) : members.slice(0, 6).map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {m.profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 text-sm truncate">{m.profile.full_name || 'Unknown'}</p>
                          {m.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                          {m.role === 'admin' && <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{m.profile.job_title || m.profile.email}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        m.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        m.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>{m.role}</span>
                    </div>
                  ))}
                  {members.length > 6 && (
                    <Link href="/admin/company" className="block px-5 py-3 text-center text-xs font-semibold text-[#003D82] hover:bg-blue-50 transition-colors">
                      View all {members.length} members <ArrowRight className="w-3 h-3 inline" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Link href="/admin/company-chat"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-[#003D82]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#003D82]">Company Chat</p>
                        <p className="text-xs text-gray-500">Free team messaging</p>
                      </div>
                    </Link>
                    <Link href="/admin/my-listings"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#003D82]">My Listings</p>
                        <p className="text-xs text-gray-500">Services & products</p>
                      </div>
                    </Link>
                    <Link href="/admin/my-orders"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#003D82]">Orders</p>
                        <p className="text-xs text-gray-500">Track purchases & sales</p>
                      </div>
                    </Link>
                    <Link href="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#003D82]">Full Dashboard</p>
                        <p className="text-xs text-gray-500">All account tools</p>
                      </div>
                    </Link>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#003D82]/5 to-blue-50 border border-[#003D82]/15 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-[#FF6B35]" /> One company per account
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Accounts belong to a single company at a time. To move to a different company,
                    leave your current one, then accept a new invite.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}