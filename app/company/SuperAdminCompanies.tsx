'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2, Loader2, Shield, Search, Users, MapPin, BadgeCheck, ExternalLink,
  CheckCircle2, Moon, Snowflake, ChevronLeft, ChevronRight, Mail,
} from 'lucide-react'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'

type Status = 'active' | 'inactive' | 'cold'
type Filter = 'all' | Status

interface Row {
  id: string
  company_name: string | null
  name: string | null
  slug: string | null
  industry: string | null
  city: string | null
  state: string | null
  is_verified: boolean | null
  is_claimed: boolean | null
  outreach_status: string | null
  contact_email: string | null
  status: Status
  members: number
  last_login: string | null
}

interface Counts { total: number; active: number; inactive: number; cold: number }

const STATUS_STYLE: Record<Status, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function SuperAdminCompanies({ hasOwn, onShowMine }: { hasOwn: boolean; onShowMine: () => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 25

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/companies?status=${filter}&q=${encodeURIComponent(query)}&page=${page}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.companies)
      setCounts(json.counts)
      setTotal(json.total)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filter, query, page])

  useEffect(() => { load() }, [load])

  const pages = Math.max(1, Math.ceil(total / pageSize))

  const cards: { key: Filter; label: string; value: number; icon: any; color: string; hint: string }[] = [
    { key: 'all', label: 'All Companies', value: counts?.total ?? 0, icon: Building2, color: 'text-[#003D82]', hint: 'Every company on the site' },
    { key: 'active', label: 'Active', value: counts?.active ?? 0, icon: CheckCircle2, color: 'text-emerald-600', hint: 'Member logged in within 45 days' },
    { key: 'inactive', label: 'Inactive', value: counts?.inactive ?? 0, icon: Moon, color: 'text-amber-600', hint: 'No login in 45+ days' },
    { key: 'cold', label: 'Cold', value: counts?.cold ?? 0, icon: Snowflake, color: 'text-blue-600', hint: 'No one signed up or joined' },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)' }} />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FF6B35]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-[#FF6B35] rounded-full px-3 py-1 mb-4">
              <Shield className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-semibold tracking-wider uppercase">Super Admin · Company Hub</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">All Companies</h1>
            <p className="text-blue-200/90 text-lg max-w-2xl leading-relaxed">
              Every company on the platform, by activity: active, inactive (no login in 45 days), and cold (no members).
            </p>
            {hasOwn && (
              <button onClick={onShowMine}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm transition-all">
                <Building2 className="w-4 h-4" /> View my company
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stat / filter cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <motion.button key={c.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => { setFilter(c.key); setPage(1) }}
              className={`text-left bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all ${filter === c.key ? 'border-[#003D82] ring-2 ring-[#003D82]/20' : 'border-gray-100'}`}>
              <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
              <p className="text-2xl font-extrabold text-gray-900">{c.value.toLocaleString()}</p>
              <p className="text-xs text-gray-700 font-semibold mt-0.5">{c.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{c.hint}</p>
            </motion.button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-[#003D82]" /> Companies</h3>
              <p className="text-xs text-gray-500 mt-0.5">{total.toLocaleString()} result{total !== 1 ? 's' : ''}</p>
            </div>
            <form onSubmit={e => { e.preventDefault(); setQuery(q); setPage(1) }} className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, city, state…"
                className="pl-9 pr-3 py-2 w-64 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003D82]/30" />
            </form>
          </div>

          {error ? (
            <div className="p-10 text-center text-sm text-red-600">{error}</div>
          ) : loading ? (
            <div className="p-14 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#003D82]" /></div>
          ) : rows.length === 0 ? (
            <div className="p-14 text-center text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No companies match</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rows.map(c => {
                const name = c.company_name || c.name || 'Unnamed company'
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-[#003D82]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                        {c.is_verified && <BadgeCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" />
                        {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                        {c.industry && <><span className="text-gray-300">·</span>{c.industry}</>}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 w-24">
                      <Users className="w-3.5 h-3.5" /> {c.members} member{c.members !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-500 w-28">
                      {c.last_login ? `Seen ${new Date(c.last_login).toLocaleDateString()}` : 'Never logged in'}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                    <div className="flex gap-1.5">
                      {c.contact_email && (
                        <a href={`mailto:${c.contact_email}`} title="Email contact"
                          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#003D82] hover:border-[#003D82]/40">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      <Link href={`/companies/${c.slug || c.id}`} title="View public page"
                        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#003D82] hover:border-[#003D82]/40">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
