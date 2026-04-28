'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Shield, Award, MessageCircle, Heart, Share2, ArrowLeft, ChevronRight, DollarSign, Tag, Clock, Wifi, HardHat, ChevronLeft } from 'lucide-react'

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
  'Structural Engineering': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop',
  'Mechanical Engineering': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=600&fit=crop',
  'Electrical Engineering': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
  'Civil Engineering': 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop',
  'Software Engineering': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop',
  'Consulting Services': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
  'Design Services': 'https://images.unsplash.com/photo-1559028006-448665bd7c7f?w=800&h=600&fit=crop',
  'Analysis & Testing': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  'Project Management': 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=600&fit=crop',
  'Other Services': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=600&fit=crop',
}

const serviceAreaLabel: Record<string, { label: string; icon: 'wifi' | 'hardhat' }> = {
  remote: { label: 'Remote', icon: 'wifi' },
  'on-site': { label: 'On-Site', icon: 'hardhat' },
  both: { label: 'Remote & On-Site', icon: 'wifi' },
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string

  const [service, setService] = useState<Service | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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
          id, title, description, category, price, tags, images, delivery_time, service_area, certifications, active, created_at,
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
    if (!currentUser) {
      router.push(`/login?redirect=/marketplace/service/${serviceId}`)
      return
    }
    router.push(`/checkout/service/${serviceId}`)
  }

  function handleContactProvider() {
    if (!currentUser) {
      router.push(`/login?redirect=/marketplace/service/${serviceId}`)
      return
    }
    if (service?.provider?.id) {
      router.push(`/messages?with=${service.provider.id}`)
    }
  }

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading service...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!service) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 pt-24 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Not Found</h1>
            <p className="text-gray-600 mb-6">This service may no longer be active.</p>
            <Link href="/marketplace" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
              <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const isOwnService = currentUser?.id === service.provider?.id

  return (
    <>
      <Navigation />
      <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 min-h-screen pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumb */}
          <motion.div className="flex items-center gap-2 text-sm text-gray-600 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/marketplace" className="hover:text-blue-600 transition">Marketplace</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium truncate max-w-xs">{service.title}</span>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT — Images + Details */}
            <div className="lg:col-span-2 space-y-6">

              {/* Image gallery */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="relative h-96 bg-gray-900">
                  {(() => {
                    const galleryImages = (service.images && service.images.length > 0)
                      ? service.images
                      : [categoryFallbacks[service.category] || categoryFallbacks['Other Services']]
                    return (
                      <>
                        <img
                          src={galleryImages[currentImageIndex] || galleryImages[0]}
                          alt={service.title}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = categoryFallbacks['Other Services'] }}
                        />
                        {galleryImages.length > 1 && (
                          <>
                            <button
                              onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all"
                              disabled={currentImageIndex === 0}
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setCurrentImageIndex(i => Math.min(galleryImages.length - 1, i + 1))}
                              className="absolute right-12 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all"
                              disabled={currentImageIndex === galleryImages.length - 1}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </>
                    )
                  })()}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <motion.button onClick={() => setIsFavorite(!isFavorite)} className="p-3 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
                    </motion.button>
                  </div>
                </div>
                {service.images && service.images.length > 1 && (
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {service.images.map((img: string, idx: number) => (
                      <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300'}`}>
                        <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Service Info */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg p-6">
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
                  {service.category}
                </span>
                <h1 className="text-3xl font-bold text-gray-900 mt-3 mb-4">{service.title}</h1>

                {/* Delivery / Area / Certs badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {service.delivery_time && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
                      <Clock className="w-4 h-4" />
                      {service.delivery_time}
                    </span>
                  )}
                  {service.service_area && serviceAreaLabel[service.service_area] && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
                      {serviceAreaLabel[service.service_area].icon === 'wifi'
                        ? <Wifi className="w-4 h-4" />
                        : <HardHat className="w-4 h-4" />
                      }
                      {serviceAreaLabel[service.service_area].label}
                    </span>
                  )}
                  {service.certifications && service.certifications.map((cert: string) => (
                    <span key={cert} className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
                      <Award className="w-4 h-4" />
                      {cert}
                    </span>
                  ))}
                </div>

                {/* Tags */}
                {service.tags && service.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {service.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-1">
                        <Tag className="w-3 h-3" />{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Provider card */}
                {service.provider && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl mt-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        {service.provider.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{service.provider.full_name}</h3>
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        {service.provider.location && (
                          <p className="text-sm text-gray-500 mt-0.5">{service.provider.location}</p>
                        )}
                        {service.provider.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{service.provider.bio}</p>
                        )}
                      </div>
                    </div>
                    {!isOwnService && (
                      <button onClick={handleContactProvider} className="px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-900 font-semibold rounded-lg transition-all text-sm flex-shrink-0">
                        Contact
                      </button>
                    )}
                  </div>
                )}

                {/* Price info row */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Price</div>
                    <div className="text-2xl font-bold text-gray-900">${Number(service.price).toLocaleString()}</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Status</div>
                    <div className="text-lg font-bold text-green-600">Active Listing</div>
                  </div>
                </div>
              </motion.div>

              {/* Full Description */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">About This Service</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{service.description}</p>
              </motion.div>
            </div>

            {/* RIGHT — Purchase Card */}
            <div className="lg:col-span-1">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="sticky top-24 bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {isOwnService ? 'Your Service' : 'Order This Service'}
                  </h3>

                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-4xl font-bold text-gray-900">${Number(service.price).toLocaleString()}</span>
                    <span className="text-gray-500 text-sm">USD</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">Professional engineering service</span>
                    </div>
                    {service.delivery_time && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Delivery: {service.delivery_time}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">Secure payment via Stripe</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">Direct communication with vendor</span>
                    </div>
                  </div>

                  {isOwnService ? (
                    <Link href="/dashboard/engineer" className="block w-full text-center bg-gray-100 text-gray-700 font-bold py-4 rounded-xl transition-all hover:bg-gray-200">
                      Manage in Dashboard
                    </Link>
                  ) : (
                    <div className="space-y-3">
                      <motion.button
                        onClick={handleOrderNow}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {currentUser ? 'Order Now' : 'Sign In to Order'}
                      </motion.button>
                      <motion.button
                        onClick={handleContactProvider}
                        className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <MessageCircle className="h-5 w-5" />
                        Message Vendor
                      </motion.button>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-gradient-to-br from-blue-50 to-slate-50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span className="text-sm">Secure payments via Stripe</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Award className="h-5 w-5 text-blue-600" />
                      <span className="text-sm">Verified professional vendor</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      <span className="text-sm">10% platform fee included</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
