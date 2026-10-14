'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Loader2, Building2, Download, ChevronLeft, ChevronRight,
  MapPin, BadgeCheck, Mail, Phone, Globe, ExternalLink, FilterX, StickyNote, Send,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Company {
  id: string
  company_name: string
  slug: string | null
  city: string | null
  state: string | null
  industry: string | null
  is_verified: boolean
  is_claimed: boolean
  owner_id: string | null
  source: string | null
  contact_name: string | null
  contact_title: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  notes: string | null
  outreach_status: string | null
  created_at: string
}

interface Facet { value: string; count: number }

const PAGE_SIZE = 50

const SOURCE_LABELS: Record<string, string> = {
  tsv_import: 'TSV Import',
  outreach_listing: 'Outreach',
  seed: 'Seed',
  none: 'No Source',
}

const OUTREACH_STATUSES: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-gray-100 text-gray-600' },
  contacted: { label: 'Contacted', cls: 'bg-blue-100 text-blue-700' },
  replied: { label: 'Replied', cls: 'bg-amber-100 text-amber-700' },
  meeting: { label: 'Meeting', cls: 'bg-purple-100 text-purple-700' },
  converted: { label: 'Converted', cls: 'bg-emerald-100 text-emerald-700' },
  dead: { label: 'Dead', cls: 'bg-red-100 text-red-700' },
}

export default function AdminDirectoryPage() {
  const router = useRouter()

  // ── Filters ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [industry, setIndustry] = useState('all')
  const [state, setState] = useState('all')
  const [source, setSource] = useState('all')
  const [claimed, setClaimed] = useState('all')
  const [verified, setVerified] = useState('all')
  const [hasContact, setHasContact] = useState('all')
  const [outreachStatus, setOutreachStatus] = useState('all')
  const [sort, setSort] = useState('newest')

  // ── Data ─────────────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([])
  const [facets, setFacets] = useState<{ industries: Facet[]; states: Facet[]; sources: Facet[] }>({ industries: [], states: [], sources: [] })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Load filter facets once
  useEffect(() => {
    fetch('/api/admin?action=directory-facets')
      .then(r => r.json())
      .then(d => setFacets(d))
      .catch(() => {})
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [debouncedSearch, industry, state, source, claimed, verified, hasContact, outreachStatus, sort])

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        action: 'data',
        tab: 'directory',
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (industry !== 'all') params.set('industry', industry)
      if (state !== 'all') params.set('state', state)
      if (source !== 'all') params.set('source', source)
      if (claimed !== 'all') params.set('claimed', claimed)
      if (verified !== 'all') params.set('verified', verified)
      if (hasContact !== 'all') params.set('hasContact', hasContact)
      if (outreachStatus !== 'all') params.set('outreachStatus', outreachStatus)

      const res = await fetch(`/api/admin?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setCompanies(json.data || [])
      setTotal(json.total || 0)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, industry, state, source, claimed, verified, hasContact, outreachStatus, sort])

  useEffect(() => { loadCompanies() }, [loadCompanies])

  const activeFilterCount = useMemo(() =>
    [debouncedSearch, industry !== 'all', state !== 'all', source !== 'all', claimed !== 'all', verified !== 'all', hasContact !== 'all', outreachStatus !== 'all']
      .filter(Boolean).length,
  [debouncedSearch, industry, state, source, claimed, verified, hasContact, outreachStatus])

  const clearFilters = () => {
    setSearch(''); setIndustry('all'); setState('all'); setSource('all')
    setClaimed('all'); setVerified('all'); setHasContact('all'); setOutreachStatus('all'); setSort('newest')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      // Pull up to 2000 rows (server caps pageSize at 200) and build CSV.
      const params = new URLSearchParams({ action: 'data', tab: 'directory', page: '1', pageSize: '200', sort })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (industry !== 'all') params.set('industry', industry)
      if (state !== 'all') params.set('state', state)
      if (source !== 'all') params.set('source', source)
      if (claimed !== 'all') params.set('claimed', claimed)
      if (verified !== 'all') params.set('verified', verified)
      if (hasContact !== 'all') params.set('hasContact', hasContact)
      if (outreachStatus !== 'all') params.set('outreachStatus', outreachStatus)

      const pages = Math.ceil(total / 200)
      const all: any[] = []
      for (let p = 1; p <= Math.min(pages, 10); p++) {
        const res = await fetch(`/api/admin?${params}&page=${p}`)
        const json = await res.json()
        all.push(...(json.data || []))
      }

      const headers = ['company_name', 'industry', 'city', 'state', 'is_claimed', 'is_verified', 'source', 'contact_name', 'contact_title', 'contact_email', 'contact_phone', 'website', 'outreach_status', 'notes', 'created_at']
      const esc = (v: any) => {
        const s = v == null ? '' : String(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      const csv = [headers.join(','), ...all.map(r => headers.map(h => esc(r[h])).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ppf-directory-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${all.length} companies`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setExporting(false)
    }
  }

  const selectCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#003D82]/30 outline-none'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#003D82]" /> Company Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">Every company on the platform — filter, sort, and export.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500 font-mono">{total.toLocaleString()} companies</span>
          <button onClick={handleExport} disabled={exporting || total === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#003D82] hover:bg-[#002960] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, city, state, industry, contact..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none" />
          </div>

          <select value={industry} onChange={e => setIndustry(e.target.value)} className={selectCls}>
            <option value="all">All Industries</option>
            {facets.industries.map(f => (
              <option key={f.value} value={f.value}>{f.value} ({f.count.toLocaleString()})</option>
            ))}
          </select>

          <select value={state} onChange={e => setState(e.target.value)} className={selectCls}>
            <option value="all">All States</option>
            {facets.states.map(f => (
              <option key={f.value} value={f.value}>{f.value} ({f.count.toLocaleString()})</option>
            ))}
          </select>

          <select value={source} onChange={e => setSource(e.target.value)} className={selectCls}>
            <option value="all">All Sources</option>
            {facets.sources.map(f => (
              <option key={f.value} value={f.value}>{SOURCE_LABELS[f.value] || f.value} ({f.count.toLocaleString()})</option>
            ))}
          </select>

          <select value={claimed} onChange={e => setClaimed(e.target.value)} className={selectCls}>
            <option value="all">Claimed: Any</option>
            <option value="claimed">Claimed</option>
            <option value="unclaimed">Unclaimed</option>
          </select>

          <select value={verified} onChange={e => setVerified(e.target.value)} className={selectCls}>
            <option value="all">Verified: Any</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>

          <select value={hasContact} onChange={e => setHasContact(e.target.value)} className={selectCls}>
            <option value="all">Contact: Any</option>
            <option value="true">Has Contact Email</option>
            <option value="false">No Contact Email</option>
          </select>

          <select value={outreachStatus} onChange={e => setOutreachStatus(e.target.value)} className={selectCls}>
            <option value="all">Outreach: Any</option>
            {Object.entries(OUTREACH_STATUSES).map(([value, s]) => (
              <option key={value} value={value}>{s.label}</option>
            ))}
          </select>

          <select value={sort} onChange={e => setSort(e.target.value)} className={selectCls}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A–Z</option>
          </select>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#003D82] hover:bg-blue-50 rounded-lg transition-colors">
              <FilterX className="w-4 h-4" /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
        ) : companies.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No companies match your filters</p>
            <button onClick={clearFilters} className="mt-3 text-sm font-semibold text-[#003D82] hover:underline">Clear all filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Company</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Industry</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden xl:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Outreach</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/directory/${c.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4.5 h-4.5 text-[#003D82]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate max-w-[220px] flex items-center gap-1.5">
                            {c.company_name}
                            {c.notes && <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[220px]">
                            {c.contact_name || '—'}{c.contact_title ? ` · ${c.contact_title}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{c.industry || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {c.contact_email ? (
                        <div className="flex flex-col gap-0.5">
                          <a href={`mailto:${c.contact_email}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-[#003D82] hover:underline">
                            <Mail className="w-3.5 h-3.5" /> {c.contact_email}
                          </a>
                          {c.contact_phone && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" /> {c.contact_phone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            <BadgeCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {c.is_claimed ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            Claimed
                          </span>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); router.push(`/admin/outreach?company=${c.id}`) }}
                            title="Send cold outreach email"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 hover:bg-[#FF6B35] hover:text-white transition-colors"
                          >
                            Unclaimed <Send className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {c.outreach_status && OUTREACH_STATUSES[c.outreach_status] ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${OUTREACH_STATUSES[c.outreach_status].cls}`}>
                          {OUTREACH_STATUSES[c.outreach_status].label}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          {SOURCE_LABELS[c.source || 'none'] || c.source || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.slug && (
                          <Link href={`/companies/${c.slug}`} onClick={e => e.stopPropagation()} title="View public page"
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-[#003D82]">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        {c.website && (
                          <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Website"
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-[#003D82]">
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total.toLocaleString()} results
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}