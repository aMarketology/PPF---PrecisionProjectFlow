'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { createClient } from '@/lib/supabase/client'
import { Search, Filter, Star, Heart, MapPin, DollarSign, ChevronDown, SlidersHorizontal, Loader, Clock, Award, Wifi, HardHat, X, CheckCircle2 } from 'lucide-react'

interface Service {
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
  provider: {
    id: string
    full_name: string
    location: string | null
    avatar_url: string | null
  } | null
}

const categories = [
  'Structural Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Software Engineering',
  'Consulting Services',
  'Design Services',
  'Analysis & Testing',
  'Project Management',
  'Other Services',
]

// Category-specific fallback images (used only when vendor hasn't uploaded photos)
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

function getServiceImage(service: Service): string {
  if (service.images && service.images.length > 0) return service.images[0]
  return categoryFallbacks[service.category] || categoryFallbacks['Other Services']
}

const serviceAreaLabel: Record<string, string> = {
  remote: 'Remote',
  'on-site': 'On-Site',
  both: 'Remote & On-Site',
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceRange, setPriceRange] = useState([0, 50000])
  const [sortBy, setSortBy] = useState('newest')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('services')
        .select(`
          id, title, description, price, category, tags, images, delivery_time, service_area, certifications, active, created_at,
          provider:profiles(id, full_name, location, avatar_url)
        `)
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (error) { console.error('Error fetching services:', error); return }
      setServices((data as any) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = useMemo(() => {
    let filtered = services.filter(s => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.provider?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory
      const matchesPrice = s.price >= priceRange[0] && s.price <= priceRange[1]

      return matchesSearch && matchesCategory && matchesPrice
    })

    switch (sortBy) {
      case 'price-low': filtered.sort((a, b) => a.price - b.price); break
      case 'price-high': filtered.sort((a, b) => b.price - a.price); break
      case 'name': filtered.sort((a, b) => a.title.localeCompare(b.title)); break
    }

    return filtered
  }, [services, searchQuery, selectedCategory, priceRange, sortBy])

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">

        {/* ── Page Header ── */}
        <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-blue-300 text-sm font-semibold tracking-widest uppercase mb-3">Engineering Marketplace</p>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
                Find the Right Expert,<br className="hidden sm:block" /> Right Now
              </h1>
              <p className="text-blue-200 text-lg max-w-2xl">
                {loading ? 'Loading services...' : `${services.length} professional engineering services from verified vendors`}
              </p>
            </motion.div>

            {/* ── Search Bar in Header ── */}
            <motion.div
              className="mt-8 max-w-3xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search services, vendors, or keywords..."
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

        {/* ── Filter Bar ── */}
        <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 py-3">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>

              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                <span>Price:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0] || ''}
                  onChange={e => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                  className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1] === 50000 ? '' : priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], Number(e.target.value) || 50000])}
                  className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="ml-auto text-sm text-gray-500 font-medium">
                {loading ? '' : `${filteredServices.length} result${filteredServices.length !== 1 ? 's' : ''}`}
              </div>

              {(searchQuery || selectedCategory !== 'all' || priceRange[0] > 0 || priceRange[1] < 50000) && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setPriceRange([0, 50000]) }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader className="h-10 w-10 animate-spin text-[#003D82]" />
              <p className="text-gray-500 font-medium">Loading services...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <motion.div className="text-center py-24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Search className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {services.length === 0 ? 'No services listed yet' : 'No matching services'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
                {services.length === 0
                  ? 'Vendors can list their first service from their dashboard.'
                  : 'Try broadening your search or clearing filters.'}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setPriceRange([0, 50000]) }}
                className="bg-[#003D82] text-white px-6 py-3 rounded-xl hover:bg-[#002960] transition-all font-semibold text-sm"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredServices.map((service, index) => (
                <Link key={service.id} href={`/marketplace/service/${service.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.3 }}
                    className="group bg-white border border-gray-100 hover:border-[#003D82]/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col"
                    whileHover={{ y: -4 }}
                  >
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={getServiceImage(service)}
                        alt={service.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={e => { (e.target as HTMLImageElement).src = categoryFallbacks['Other Services'] }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

                      {/* Multi-image dots */}
                      {service.images && service.images.length > 1 && (
                        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
                          {service.images.slice(0, 4).map((_, i) => (
                            <div key={i} className={`rounded-full transition-all ${i === 0 ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
                          ))}
                        </div>
                      )}

                      {/* Favorite */}
                      <motion.button
                        onClick={e => toggleFavorite(service.id, e)}
                        className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Heart className={`h-3.5 w-3.5 transition-colors ${favorites.has(service.id) ? 'text-red-500 fill-current' : 'text-gray-500'}`} />
                      </motion.button>

                      {/* Price Badge */}
                      <div className="absolute bottom-3 left-3">
                        <span className="text-sm font-bold text-white drop-shadow-md">
                          ${Number(service.price).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1">
                      {/* Category pill */}
                      <span className="inline-block text-[11px] font-semibold text-[#003D82] bg-blue-50 px-2 py-0.5 rounded-md mb-2 self-start">
                        {service.category.replace(' Engineering', ' Eng.')}
                      </span>

                      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#003D82] transition-colors">
                        {service.title}
                      </h3>

                      {/* Provider */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#003D82] to-[#0066C0] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[9px] font-bold">
                            {(service.provider?.full_name || 'V').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium truncate">{service.provider?.full_name || 'Vendor'}</span>
                        <CheckCircle2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      </div>

                      {/* Meta badges */}
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {service.delivery_time && (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {service.delivery_time}
                          </span>
                        )}
                        {service.service_area && (
                          <span className="text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                            {service.service_area === 'remote' ? <Wifi className="w-2.5 h-2.5" /> : <HardHat className="w-2.5 h-2.5" />}
                            {serviceAreaLabel[service.service_area] || service.service_area}
                          </span>
                        )}
                        {service.certifications && service.certifications.length > 0 && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                            <Award className="w-2.5 h-2.5" />
                            {service.certifications[0]}
                            {service.certifications.length > 1 && ` +${service.certifications.length - 1}`}
                          </span>
                        )}
                        {service.provider?.location && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {service.provider.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
