'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  MapPin,
  Building2,
  CheckCircle2,
  ChevronRight,
  Package,
  Loader,
  Tag,
  Filter,
  X,
} from 'lucide-react'

interface Company {
  id: string
  full_name: string
  company_name: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  created_at: string
  service_count?: number
  categories?: string[]
}

export default function ProfilesPage() {
  const [companies, setCompanies]           = useState<Company[]>([])
  const [filtered, setFiltered]             = useState<Company[]>([])
  const [loading, setLoading]               = useState(true)
  const [searchQuery, setSearchQuery]       = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [locations, setLocations]           = useState<string[]>([])
  const [allCategories, setAllCategories]   = useState<string[]>([])

  useEffect(() => { loadCompanies() }, [])

  useEffect(() => {
    let result = [...companies]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        (c.company_name ?? c.full_name).toLowerCase().includes(q) ||
        (c.bio ?? '').toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q) ||
        (c.categories ?? []).some(cat => cat.toLowerCase().includes(q))
      )
    }

    if (locationFilter !== 'all') {
      result = result.filter(c => c.location === locationFilter)
    }

    if (categoryFilter !== 'all') {
      result = result.filter(c => (c.categories ?? []).includes(categoryFilter))
    }

    setFiltered(result)
  }, [searchQuery, locationFilter, categoryFilter, companies])

  async function loadCompanies() {
    const supabase = createClient()

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, company_name, bio, location, avatar_url, created_at')
      .eq('user_type', 'engineer')
      .order('created_at', { ascending: false })

    if (error || !profiles) { setLoading(false); return }

    const { data: services } = await supabase
      .from('services')
      .select('provider_id, category')
      .eq('active', true)

    const serviceMap = new Map<string, { count: number; categories: Set<string> }>()
    for (const svc of services ?? []) {
      const entry = serviceMap.get(svc.provider_id) ?? { count: 0, categories: new Set() }
      entry.count++
      entry.categories.add(svc.category)
      serviceMap.set(svc.provider_id, entry)
    }

    const enriched: Company[] = profiles.map(p => ({
      ...p,
      service_count: serviceMap.get(p.id)?.count ?? 0,
      categories: Array.from(serviceMap.get(p.id)?.categories ?? []),
    }))

    setLocations(
      (Array.from(new Set(enriched.map(c => c.location).filter(Boolean))) as string[]).sort()
    )
    setAllCategories(
      Array.from(new Set(enriched.flatMap(c => c.categories ?? []))).sort()
    )
    setCompanies(enriched)
    setFiltered(enriched)
    setLoading(false)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setLocationFilter('all')
    setCategoryFilter('all')
  }

  const hasActiveFilters = searchQuery || locationFilter !== 'all' || categoryFilter !== 'all'

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm font-semibold text-blue-100 mb-5">
              <Building2 className="w-4 h-4" />Engineering Companies
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight">
              Find Verified
              <span className="block text-[#FF6B35]">Engineering Partners</span>
            </h1>
            <p className="text-lg text-blue-200 max-w-2xl mx-auto">
              Browse and connect with vetted engineering companies and professional service providers on PPF.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 mb-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies, specialties…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] transition"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] transition appearance-none"
              >
                <option value="all">All Locations</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] transition appearance-none"
              >
                <option value="all">All Specialties</option>
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
              <span className="text-xs text-gray-400 flex items-center gap-1"><Filter className="w-3 h-3" />Active:</span>
              {searchQuery && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {locationFilter !== 'all' && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium">
                  {locationFilter}
                  <button onClick={() => setLocationFilter('all')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {categoryFilter !== 'all' && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium">
                  {categoryFilter}
                  <button onClick={() => setCategoryFilter('all')}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={clearFilters} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition">Clear all</button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader className="w-8 h-8 animate-spin text-[#003D82]" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500 font-medium">
                {filtered.length} {filtered.length === 1 ? 'company' : 'companies'} found
              </p>
            </div>
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                  <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700 mb-1">No companies match your search</p>
                  <p className="text-sm text-gray-400">Try adjusting your filters</p>
                  <button onClick={clearFilters}
                    className="mt-4 px-5 py-2 bg-[#003D82] text-white font-semibold rounded-xl text-sm hover:bg-[#002960] transition">
                    Clear Filters
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={searchQuery + locationFilter + categoryFilter}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {filtered.map((company, i) => (
                    <CompanyCard key={company.id} company={company} index={i} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-[#003D82] to-[#005BB5] py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">Is your company listed?</h2>
          <p className="text-blue-200 mb-6">Join PPF and connect with clients seeking engineering services</p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 px-7 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl text-sm transition-all shadow-lg">
            Register Your Company <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}

function CompanyCard({ company, index }: { company: Company; index: number }) {
  const displayName = company.company_name ?? company.full_name
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link href={`/profiles/${company.id}`} className="block group h-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#003D82]/30 transition-all h-full flex flex-col overflow-hidden">
          <div className="bg-gradient-to-br from-[#001f4d] to-[#003D82] p-5 flex items-start gap-4">
            {company.avatar_url ? (
              <img src={company.avatar_url} alt={displayName}
                className="w-14 h-14 rounded-xl object-cover border-2 border-white/20 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-extrabold">{initial}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <h3 className="font-bold text-white text-sm leading-snug truncate">{displayName}</h3>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              </div>
              {company.location && (
                <span className="flex items-center gap-1 text-blue-200 text-xs">
                  <MapPin className="w-3 h-3" />{company.location}
                </span>
              )}
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            {company.bio ? (
              <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4">{company.bio}</p>
            ) : (
              <p className="text-gray-300 text-xs italic mb-4">No description provided.</p>
            )}
            {(company.categories ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(company.categories ?? []).slice(0, 3).map((cat, j) => (
                  <span key={j} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[11px] font-semibold">
                    {cat}
                  </span>
                ))}
                {(company.categories ?? []).length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[11px] font-semibold">
                    +{(company.categories ?? []).length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Package className="w-3.5 h-3.5 text-[#003D82]" />
                {company.service_count ?? 0} service{(company.service_count ?? 0) !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#003D82] group-hover:gap-2 transition-all">
                View Profile <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
