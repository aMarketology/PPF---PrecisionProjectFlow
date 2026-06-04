'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Star, Heart, MapPin, Loader, Clock, Award, Wifi, HardHat,
  X, CheckCircle2, ArrowRight, ExternalLink, Building2, Briefcase
} from 'lucide-react'

interface Service {
  _type: 'service'
  id: string
  title: string
  description: string
  price: number
  category: string
  tags: string[] | null
  images: string[] | null
  delivery_time: string | null
  service_area: string | null
  certifications: string[] | null
  active: boolean
  created_at: string
  provider: { id: string; full_name: string; location: string | null; avatar_url: string | null } | null
}

interface DirectoryCard {
  _type: 'directory'
  id: string
  title: string
  description: string | null
  category: string
  company_name: string
  city: string | null
  state: string | null
  website: string | null
  specialties: string[] | null
  is_claimed: boolean
  slug: string | null
}

type Card = Service | DirectoryCard

const categories = [
  'Structural Engineering', 'Mechanical Engineering', 'Electrical Engineering',
  'Civil Engineering', 'Software Engineering', 'Consulting Services',
  'Design Services', 'Analysis & Testing', 'Project Management', 'Other Services',
]

const categoryFallbacks: Record<string, string> = {
  'Structural Engineering': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop',
  'Mechanical Engineering': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop',
  'Electrical Engineering': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
  'Civil Engineering': 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=300&fit=crop',
  'Software Engineering': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop',
  'Consulting Services': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
  'Design Services': 'https://images.unsplash.com/photo-1559028006-448665bd7c7f?w=400&h=300&fit=crop',
  'Analysis & Testing': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop',
  'Project Management': 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=400&h=300&fit=crop',
  'Other Services': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop',
}

const serviceAreaLabel: Record<string, string> = {
  remote: 'Remote', 'on-site': 'On-Site', both: 'Remote & On-Site',
}

// Map company industry → marketplace category
const industryToCategory: Record<string, string> = {
  'Mechanical Engineering': 'Mechanical Engineering',
  'Electrical Engineering': 'Electrical Engineering',
  'Structural Engineering': 'Structural Engineering',
  'Software Engineering': 'Software Engineering',
  'Consulting Services': 'Consulting Services',
  'Analysis & Testing': 'Analysis & Testing',
  'Other Services': 'Other Services',
}

function MarketplaceInner() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState([0, 50000])
  const [sortBy, setSortBy] = useState('newest')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const supabase = createClient()

      // Fetch real services
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, title, description, price, category, tags, images, delivery_time, service_area, certifications, active, created_at, provider_id')
        .eq('active', true)
        .order('created_at', { ascending: false })

      let serviceCards: Service[] = []
      if (servicesData && servicesData.length > 0) {
        const providerIds = Array.from(new Set(servicesData.map((s: any) => s.provider_id).filter(Boolean)))
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, location, avatar_url')
          .in('id', providerIds)
        const profileMap: Record<string, any> = {}
        for (const p of (profilesData || [])) profileMap[p.id] = p
        serviceCards = servicesData.map((s: any) => ({
          _type: 'service' as const,
          ...s,
          provider: profileMap[s.provider_id] || null,
        }))
      }

      // Fetch company directory entries (limit 300)
      const { data: companies, error: compError } = await supabase
        .from('company_profiles')
        .select('id, company_name, description, industry, city, state, website, specialties, is_claimed, slug')
        .order('company_name', { ascending: true })
        .limit(300)

      if (compError) console.error('company_profiles error:', compError)
      console.log('directory companies fetched:', companies?.length ?? 0)

      // Debug info for diagnosing production issues
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'
      setDebugInfo(`URL: ${supabaseUrl.slice(0, 40)}… | services: ${serviceCards.length} | companies: ${companies?.length ?? 0} | compError: ${compError ? compError.message : 'none'}`)

      const directoryCards: DirectoryCard[] = (companies || []).map((c: any) => ({
        _type: 'directory' as const,
        id: c.id,
        title: c.company_name,
        description: c.description,
        category: industryToCategory[c.industry] || 'Other Services',
        company_name: c.company_name,
        city: c.city,
        state: c.state,
        website: c.website,
        specialties: c.specialties,
        is_claimed: c.is_claimed,
        slug: c.slug,
      }))

      // Real services first, then directory
      setCards([...serviceCards, ...directoryCards])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = cards.filter(c => {
      const q = searchQuery.toLowerCase()
      const tags = c._type === 'service' ? (c.tags || []) : (c.specialties || [])
      const name = c._type === 'service' ? (c.provider?.full_name || '') : c.company_name
      const matchesSearch = !q ||
        c.title.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        tags.some((t: string) => t.toLowerCase().includes(q))
      const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory
      const price = c._type === 'service' ? c.price : null
      const matchesPrice = price === null || (price >= priceRange[0] && price <= priceRange[1])
      return matchesSearch && matchesCategory && matchesPrice
    })
    if (sortBy === 'price-low') result.sort((a, b) => (a._type === 'service' ? a.price : 0) - (b._type === 'service' ? b.price : 0))
    if (sortBy === 'price-high') result.sort((a, b) => (b._type === 'service' ? b.price : 0) - (a._type === 'service' ? a.price : 0))
    if (sortBy === 'name') result.sort((a, b) => a.title.localeCompare(b.title))
    return result
  }, [cards, searchQuery, selectedCategory, priceRange, sortBy])

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const serviceCount = cards.filter(c => c._type === 'service').length
  const dirCount = cards.filter(c => c._type === 'directory').length

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14"
          style={{ backgroundImage: undefined }}>
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)' }} />
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-blue-300 text-sm font-semibold tracking-widest uppercase mb-3">Engineering Marketplace</p>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
                Find the Right Expert,<br className="hidden sm:block" /> Right Now
              </h1>
              <p className="text-blue-200 text-lg max-w-2xl">
                {loading ? 'Loading...' : `${serviceCount} listed services · ${dirCount.toLocaleString()} directory companies`}
              </p>
            </motion.div>
            <motion.div className="mt-8 max-w-3xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search services, companies, or keywords..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-36 py-4 bg-white rounded-xl text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-xl"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#003D82] hover:bg-[#002960] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                  Search
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 py-3">
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                <span>Price:</span>
                <input type="number" placeholder="Min" value={priceRange[0] || ''}
                  onChange={e => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                  className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-gray-400">—</span>
                <input type="number" placeholder="Max" value={priceRange[1] === 50000 ? '' : priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], Number(e.target.value) || 50000])}
                  className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="ml-auto text-sm text-gray-500 font-medium">
                {loading ? '' : `${filtered.length.toLocaleString()} result${filtered.length !== 1 ? 's' : ''}`}
              </div>
              {(searchQuery || selectedCategory !== 'all' || priceRange[0] > 0 || priceRange[1] < 50000) && (
                <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setPriceRange([0, 50000]) }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader className="h-10 w-10 animate-spin text-[#003D82]" />
              <p className="text-gray-500 font-medium">Loading marketplace...</p>
            </div>
          ) : filtered.length === 0 ? (
            <motion.div className="text-center py-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Search className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No matching results</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">Try broadening your search or clearing filters.</p>
              {debugInfo && (
                <p className="text-[11px] text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4 max-w-lg mx-auto break-all">{debugInfo}</p>
              )}
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setPriceRange([0, 50000]) }}
                className="bg-[#003D82] text-white px-6 py-3 rounded-xl hover:bg-[#002960] transition-all font-semibold text-sm">
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filtered.map((card, index) =>
                card._type === 'service' ? (
                  // ── Real service card ──────────────────────────────────────
                  <Link key={card.id} href={`/marketplace/service/${card.id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.4) }}
                      className="group bg-white border border-gray-100 hover:border-[#003D82]/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col"
                      whileHover={{ y: -4 }}
                    >
                      <div className="relative h-44 overflow-hidden bg-gray-100 flex-shrink-0">
                        <img src={card.images?.[0] || categoryFallbacks[card.category] || categoryFallbacks['Other Services']}
                          alt={card.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={e => { (e.target as HTMLImageElement).src = categoryFallbacks['Other Services'] }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <motion.button onClick={e => toggleFavorite(card.id, e)}
                          className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white"
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                          <Heart className={`h-3.5 w-3.5 ${favorites.has(card.id) ? 'text-red-500 fill-current' : 'text-gray-500'}`} />
                        </motion.button>
                        <div className="absolute top-3 left-3">
                          <span className="text-[10px] font-semibold text-white bg-[#003D82]/80 px-2 py-0.5 rounded-full">
                            {card.category.replace(' Engineering', ' Eng.')}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <span className="text-base font-extrabold text-white drop-shadow-md">${Number(card.price).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-3 line-clamp-2 group-hover:text-[#003D82] transition-colors">{card.title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          {card.provider?.avatar_url ? (
                            <img src={card.provider.avatar_url} alt={card.provider.full_name} className="w-6 h-6 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-200" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#003D82] to-[#0066C0] flex items-center justify-center flex-shrink-0 ring-1 ring-gray-200">
                              <span className="text-white text-[9px] font-bold">{(card.provider?.full_name || 'V').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <span className="text-xs text-gray-600 font-medium truncate flex-1">{card.provider?.full_name || 'Vendor'}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                          {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= 4 ? 'text-amber-400 fill-amber-400' : 'text-amber-300 fill-amber-200'}`} />)}
                          <span className="text-[11px] text-gray-500 font-medium ml-0.5">4.9</span>
                          <span className="text-[11px] text-gray-400 ml-0.5">(12)</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-auto mb-3">
                          {card.delivery_time && <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{card.delivery_time}</span>}
                          {card.service_area && <span className="text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">{card.service_area === 'remote' ? <Wifi className="w-2.5 h-2.5" /> : <HardHat className="w-2.5 h-2.5" />}{serviceAreaLabel[card.service_area] || card.service_area}</span>}
                          {card.certifications && card.certifications.length > 0 && <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-1"><Award className="w-2.5 h-2.5" />{card.certifications[0]}</span>}
                          {card.provider?.location && <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{card.provider.location}</span>}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs font-bold text-[#003D82]">${Number(card.price).toLocaleString()}</span>
                          <span className="text-xs font-semibold text-[#003D82] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">View Service <ArrowRight className="w-3 h-3" /></span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ) : (
                  // ── Directory company card ─────────────────────────────────
                  <motion.div key={card.id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.4) }}
                    className="group bg-white border border-gray-100 hover:border-[#FF6B35]/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col"
                    whileHover={{ y: -4 }}
                  >
                    {/* Image — clickable to company page */}
                    <Link href={card.slug ? `/companies/${card.slug}` : `/companies?q=${encodeURIComponent(card.company_name)}`} className="block">
                    <div className="relative h-44 overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={categoryFallbacks[card.category] || categoryFallbacks['Other Services']}
                        alt={card.company_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      {/* Category pill */}
                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-semibold text-white bg-black/50 px-2 py-0.5 rounded-full">
                          {card.category.replace(' Engineering', ' Eng.')}
                        </span>
                      </div>
                      {/* "Directory" badge */}
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-semibold text-white bg-[#FF6B35]/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" /> Directory
                        </span>
                      </div>
                      {/* Location bottom left */}
                      {(card.city || card.state) && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-white/80" />
                          <span className="text-xs text-white/90 font-medium">{[card.city, card.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    </Link>

                    <div className="p-4 flex flex-col flex-1">
                      {/* Company name */}
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#003D82] transition-colors">
                        {card.company_name}
                      </h3>

                      {/* Description */}
                      {card.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{card.description}</p>
                      )}

                      {/* Specialties */}
                      {card.specialties && card.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {card.specialties.slice(0, 2).map(s => (
                            <span key={s} className="text-[11px] bg-gray-50 border border-gray-100 text-gray-600 rounded-full px-2 py-0.5">{s}</span>
                          ))}
                        </div>
                      )}

                      {/* Claim status */}
                      <div className="flex items-center gap-1 mt-auto mb-3">
                        {card.is_claimed ? (
                          <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified Company
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Briefcase className="w-2.5 h-2.5" /> Unclaimed
                          </span>
                        )}
                      </div>

                      {/* CTAs */}
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <Link href={card.slug ? `/companies/${card.slug}` : `/companies?q=${encodeURIComponent(card.company_name)}`}
                          className="flex-1 text-center text-xs font-semibold bg-[#003D82] hover:bg-[#002960] text-white rounded-xl py-2 transition-colors flex items-center justify-center gap-1">
                          View Profile <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceInner />
    </Suspense>
  )
}
