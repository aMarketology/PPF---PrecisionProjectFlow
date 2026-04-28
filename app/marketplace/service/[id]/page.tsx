'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, Shield, Award, MessageCircle, Heart, ArrowLeft,
  ChevronRight, DollarSign, Tag, Clock, Wifi, HardHat, ChevronLeft,
  MapPin, Loader2, Star, BadgeCheck, ExternalLink, Share2,
} from 'lucide-react'

interface Service {
  id: string
  title: string
  description: string
  category: string
  price: number
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
    email: string
    location: string | null
    avatar_url: string | null
    bio: string | null
  } | null
}

const categoryFallbacks: Record<string, string> = {
  'Structural Engineering':  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&h=600&fit=crop',
  'Mechanical Engineering':  'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=900&h=600&fit=crop',
  'Electrical Engineering':  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=900&h=600&fit=crop',
  'Civil Engineering':       'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&h=600&fit=crop',
  'Software Engineering':    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&h=600&fit=crop',
  'Consulting Services':     'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&h=600&fit=crop',
  'Design Services':         'https://images.unsplash.com/photo-1559028006-448665bd7c7f?w=900&h=600&fit=crop',
  'Analysis & Testing':      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&h=600&fit=crop',
  'Project Management':      'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=900&h=600&fit=crop',
  'Other Services':          'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=900&h=600&fit=crop',
}

function getServiceImage(service: Service): string {
  if (service.images && service.images.length > 0) return service.images[0]
  return categoryFallbacks[service.category] || categoryFallbacks['Other Services']
}

function isRemote(area: string | null): boolean {
  if (!area) return false
  return area.toLowerCase().includes('remote') || area.toLowerCase().includes('nationwide')
}

function isOnSite(area: string | null): boolean {
  if (!area) return false
  return area.toLowerCase().includes('on-site') || area.toLowerCase().includes('onsite')
}

export default function ServiceDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const serviceId = params.id as string

  const [service, setService]             = useState<Service | null>(null)
  const [currentUser, setCurrentUser]     = useState<any>(null)
  const [isLoading, setIsLoading]         = useState(true)
  const [isFavorite, setIsFavorite]       = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [copied, setCopied]               = useState(false)

  useEffect(() => {
    loadService()
    checkUser()
  }, [serviceId])

  async function checkUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  async function loadService() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('services')
        .select(`
          id, title, description, category, price, tags, images,
          delivery_time, service_area, certifications, active, created_at,
          provider:profiles!services_provider_id_fkey(id, full_name, email, location, avatar_url, bio)
        `)
        .eq('id', serviceId)
        .eq('active', true)
        .single()

      if (error) console.error('Error loading service:', error)
      else setService(data as any)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleOrderNow() {
    if (!currentUser) { router.push(`/login?redirect=/marketplace/service/${serviceId}`); return }
    router.push(`/checkout/service/${serviceId}`)
  }

  function handleContactProvider() {
    if (!currentUser) { router.push(`/login?redirect=/marketplace/service/${serviceId}`); return }
    if (service?.provider?.id) router.push(`/messages?with=${service.provider.id}`)
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#003D82] mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading service…</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!service) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-sm mx-auto px-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeft className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Service Not Found</h1>
            <p className="text-gray-500 text-sm mb-6">This listing may have been removed or deactivated.</p>
            <Link href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all">
              <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const isOwnService  = currentUser?.id === service.provider?.id
  const galleryImages = (service.images && service.images.length > 0)
    ? service.images
    : [getServiceImage(service)]

  const providerInitial = service.provider?.full_name?.charAt(0).toUpperCase() ?? 'V'

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-blue-200 mb-4">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/marketplace" className="hover:text-white transition">Marketplace</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-medium truncate max-w-xs">{service.title}</span>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-block px-3 py-1 bg-[#FF6B35] text-white text-xs font-bold rounded-full uppercase tracking-wide mb-3">
                {service.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight max-w-3xl">
                {service.title}
              </h1>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {service.delivery_time && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-100 font-medium">
                    <Clock className="w-3.5 h-3.5" /> {service.delivery_time}
                  </span>
                )}
                {service.service_area && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-100 font-medium">
                    {isRemote(service.service_area) ? <Wifi className="w-3.5 h-3.5" /> : <HardHat className="w-3.5 h-3.5" />}
                    {service.service_area}
                  </span>
                )}
                {service.provider?.location && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-100 font-medium">
                    <MapPin className="w-3.5 h-3.5" /> {service.provider.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFavorite(f => !f)}
                className={`p-2.5 rounded-xl border-2 transition-all ${isFavorite ? 'bg-red-50 border-red-300 text-red-500' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button onClick={handleShare}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 transition-all text-xs font-semibold">
                <Share2 className="w-4 h-4" />
                {copied ? 'Copied!' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── LEFT — Main content ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Image Gallery */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="relative h-80 sm:h-96 bg-gray-900">
                <img
                  src={galleryImages[currentImageIndex]}
                  alt={service.title}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = categoryFallbacks['Other Services'] }}
                />
                {galleryImages.length > 1 && (
                  <>
                    <button onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                      disabled={currentImageIndex === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setCurrentImageIndex(i => Math.min(galleryImages.length - 1, i + 1))}
                      disabled={currentImageIndex === galleryImages.length - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {galleryImages.map((_, i) => (
                        <button key={i} onClick={() => setCurrentImageIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              {galleryImages.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {galleryImages.map((img, idx) => (
                    <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-[#003D82]' : 'border-gray-200 hover:border-gray-400'}`}>
                      <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* About This Service */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-extrabold text-gray-900 mb-4">About This Service</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{service.description}</p>

              {/* Certifications */}
              {service.certifications && service.certifications.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Certifications & Credentials</h3>
                  <div className="flex flex-wrap gap-2">
                    {service.certifications.map(cert => (
                      <span key={cert}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-full">
                        <Award className="w-3.5 h-3.5" /> {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Expertise Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map(tag => (
                      <span key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F8FAFC] border border-gray-200 text-gray-600 text-xs font-semibold rounded-full">
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* What's Included */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-extrabold text-gray-900 mb-4">What's Included</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Professional PE/specialist execution',
                  'Detailed deliverable documentation',
                  'Code & standards compliance',
                  service.delivery_time ? `Delivery within ${service.delivery_time}` : 'Clear project timeline',
                  'Direct vendor communication',
                  'Revision support after delivery',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Provider Card */}
            {service.provider && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-xl font-extrabold text-gray-900 mb-4">About the Vendor</h2>
                <div className="flex items-start gap-4">
                  {service.provider.avatar_url ? (
                    <img src={service.provider.avatar_url} alt={service.provider.full_name}
                      className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border-2 border-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0">
                      {providerInitial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-gray-900 text-lg">{service.provider.full_name}</h3>
                      <BadgeCheck className="w-5 h-5 text-[#003D82] flex-shrink-0" />
                    </div>
                    {service.provider.location && (
                      <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3" /> {service.provider.location}
                      </p>
                    )}
                    {service.provider.bio && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-3">{service.provider.bio}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= 5 ? 'text-amber-400 fill-current' : 'text-gray-200'}`} />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">5.0</span>
                      </div>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">Verified Vendor</span>
                    </div>
                  </div>
                </div>
                {!isOwnService && (
                  <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100">
                    <Link href={`/profiles/${service.provider.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 hover:border-[#003D82] text-gray-700 font-semibold rounded-xl transition-all text-sm">
                      <ExternalLink className="w-4 h-4" /> View Profile
                    </Link>
                    <button onClick={handleContactProvider}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all text-sm">
                      <MessageCircle className="w-4 h-4" /> Message Vendor
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* ── RIGHT — Purchase sticky card ─────────────────────────────── */}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Price header */}
              <div className="bg-gradient-to-r from-[#001f4d] to-[#003D82] px-6 py-5">
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">Service Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">
                    ${Number(service.price).toLocaleString()}
                  </span>
                  <span className="text-blue-300 text-sm">USD</span>
                </div>
                {service.delivery_time && (
                  <p className="text-blue-200 text-xs mt-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Delivered in {service.delivery_time}
                  </p>
                )}
              </div>

              <div className="p-6">
                {/* Included items */}
                <div className="space-y-2.5 mb-6">
                  {[
                    'Professional engineering execution',
                    service.delivery_time ? `Delivery: ${service.delivery_time}` : 'Defined delivery timeline',
                    'Secure payment via Stripe',
                    'Direct vendor messaging',
                    ...(service.certifications?.slice(0, 1).map(c => `Credential: ${c}`) ?? []),
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                {isOwnService ? (
                  <Link href="/dashboard/engineer"
                    className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-all text-sm">
                    Manage in Dashboard
                  </Link>
                ) : (
                  <div className="space-y-3">
                    <motion.button onClick={handleOrderNow} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="w-full bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                      {currentUser ? 'Order Now' : 'Sign In to Order'}
                    </motion.button>
                    <motion.button onClick={handleContactProvider} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="w-full bg-white border-2 border-[#003D82] hover:bg-blue-50 text-[#003D82] font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4" /> Message Vendor
                    </motion.button>
                  </div>
                )}

                {/* Trust signals */}
                <div className="mt-5 pt-5 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Shield className="w-4 h-4 text-[#003D82] flex-shrink-0" />
                    <span className="text-xs">Secure payments via Stripe</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <BadgeCheck className="w-4 h-4 text-[#003D82] flex-shrink-0" />
                    <span className="text-xs">Verified professional vendor</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#003D82] flex-shrink-0" />
                    <span className="text-xs">PPF Buyer Protection applies</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Related info card */}
            {service.service_area && (
              <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Service Area</h3>
                <div className="flex items-start gap-2.5">
                  {isRemote(service.service_area)
                    ? <Wifi className="w-4 h-4 text-[#003D82] flex-shrink-0 mt-0.5" />
                    : <HardHat className="w-4 h-4 text-[#003D82] flex-shrink-0 mt-0.5" />}
                  <p className="text-sm text-gray-600">{service.service_area}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link href="/marketplace"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#003D82] font-semibold transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
