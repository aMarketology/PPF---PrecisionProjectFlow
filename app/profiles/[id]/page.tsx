'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import BadgeList from '@/app/components/BadgeList'
import ReportModal from '@/app/components/ReportModal'
import { computeBadges } from '@/lib/badges'
import { createClient } from '@/lib/supabase/client'
import {
  MapPin, CheckCircle2, Building2, Globe, Mail,
  Award, Package, Clock, ShoppingCart, Share2,
  ExternalLink, Shield, Loader, MessageSquare,
  ChevronRight, Star, Wrench, Tag, Wifi, HardHat,
  ArrowLeft, Users, Calendar, Flag,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────
// All company data lives directly on the profiles row for engineers.
interface CompanyProfile {
  id: string
  full_name: string        // engineer's name (shown as contact)
  email: string
  avatar_url: string | null
  company_name: string | null
  bio: string | null
  location: string | null
  user_type: string
  created_at: string
  is_admin: boolean | null
}

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
}

interface VendorReview {
  id: string
  rating: number
  title: string | null
  body: string | null
  reviewer_name: string | null
  created_at: string
}

const categoryFallbacks: Record<string, string> = {
  'Structural Engineering':  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop',
  'Mechanical Engineering':  'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=600&fit=crop',
  'Electrical Engineering':  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
  'Civil Engineering':       'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop',
  'Software Engineering':    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop',
  'Consulting Services':     'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
  'Design Services':         'https://images.unsplash.com/photo-1559028006-448665bd7c7f?w=800&h=600&fit=crop',
  'Analysis & Testing':      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  'Project Management':      'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=600&fit=crop',
  'Other Services':          'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=600&fit=crop',
}

function getServiceImage(service: Service): string {
  if (service.images && service.images.length > 0) return service.images[0]
  return categoryFallbacks[service.category] ?? categoryFallbacks['Other Services']
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CompanyProfilePage() {
  const params   = useParams()
  const router   = useRouter()
  const profileId = params.id as string

  const [company, setCompany]           = useState<CompanyProfile | null>(null)
  const [services, setServices]         = useState<Service[]>([])
  const [reviews, setReviews]           = useState<VendorReview[]>([])
  const [companySlug, setCompanySlug]   = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState<'services' | 'reviews' | 'about'>('services')
  const [showReport, setShowReport]     = useState(false)

  useEffect(() => { loadData() }, [profileId])

  async function loadData() {
    const supabase = createClient()

    // Check who is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)

    // Load the engineer/vendor profile.
    // NOTE: live `profiles` has no company_name column - a company name is
    // only available via company_profiles, resolved below.
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, bio, location, user_type, created_at, is_admin')
      .eq('id', profileId)
      .eq('user_type', 'engineer')
      .single()

    if (error || !profileData) {
      toast.error('Profile not found')
      router.push('/profiles')
      return
    }

    // Resolve the engineer's company page (if they own one)
    const { data: companyRow } = await supabase
      .from('company_profiles')
      .select('slug, company_name')
      .eq('owner_id', profileId)
      .maybeSingle()
    setCompanySlug(companyRow?.slug ?? null)
    setCompany({ ...profileData, company_name: companyRow?.company_name ?? null })

    // Load their active services
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, title, description, price, category, tags, images, delivery_time, service_area, certifications, active, created_at')
      .eq('provider_id', profileId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    setServices(servicesData ?? [])

    // Load real vendor reviews (public)
    const { data: reviewsData } = await supabase
      .from('vendor_reviews')
      .select('id, rating, title, body, reviewer_name, created_at')
      .eq('vendor_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50)
    setReviews(reviewsData ?? [])

    setLoading(false)
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Profile link copied!')
  }

  const handleDM = () => {
    if (!currentUserId) { router.push('/login'); return }
    router.push(`/messages?with=${profileId}`)
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <Loader className="w-8 h-8 animate-spin text-[#003D82]" />
        </div>
      </div>
    )
  }

  if (!company) return null

  const displayName = company.company_name ?? company.full_name
  const memberSince = formatDistanceToNow(new Date(company.created_at), { addSuffix: true })

  // All unique certifications across all services
  const allCerts = Array.from(
    new Set(services.flatMap(s => s.certifications ?? []))
  )

  const TABS = [
    { key: 'services', label: `Services (${services.length})` },
    { key: 'reviews',  label: `Reviews (${reviews.length})`   },
    { key: 'about',    label: 'About'                          },
  ] as const

  const reviewAvg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* ── Hero banner ── */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-32">
        {/* subtle grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }}
        />
        <div className="relative max-w-6xl mx-auto px-4">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-medium mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back
          </button>
        </div>
      </div>

      {/* ── Profile card (overlaps hero) ── */}
      <div className="max-w-6xl mx-auto px-4 -mt-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 lg:p-8"
        >
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {company.avatar_url ? (
                <img src={company.avatar_url} alt={displayName}
                  className="w-24 h-24 lg:w-28 lg:h-28 rounded-2xl object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-2xl bg-gradient-to-br from-[#003D82] to-[#0066C0] flex items-center justify-center border-4 border-white shadow-lg">
                  <Building2 className="w-12 h-12 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900">{displayName}</h1>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />Verified Engineer
                </span>
              </div>

              {company.company_name && (
                <p className="text-gray-500 text-sm mb-2">{company.full_name} · {company.email}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                {company.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{company.location}</span>
                )}
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Member {memberSince}</span>
                <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{services.length} service{services.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Bio preview */}
              {company.bio && (
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{company.bio}</p>
              )}

              {/* Badges */}
              <BadgeList
                badges={computeBadges({
                  profile: company,
                  emailVerified: !!company.email,
                  serviceCount: services.length,
                })}
                size="sm"
                className="mt-3"
              />
            </div>

            {/* CTA buttons */}
            <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
              {companySlug && (
                <Link href={`/companies/${companySlug}`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl text-sm transition-all shadow-sm">
                  <Building2 className="w-4 h-4" />Company Page
                </Link>
              )}
              <button onClick={handleDM}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition-all shadow-sm">
                <MessageSquare className="w-4 h-4" />Message
              </button>
              <button onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-[#003D82] text-gray-600 hover:text-[#003D82] font-semibold rounded-xl text-sm transition-all">
                <Share2 className="w-4 h-4" />Share
              </button>
              {currentUserId && currentUserId !== profileId && (
                <button onClick={() => setShowReport(true)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-red-300 text-gray-500 hover:text-red-500 font-semibold rounded-xl text-sm transition-all">
                  <Flag className="w-4 h-4" />Report
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        targetType="user"
        targetId={profileId}
        targetLabel={displayName}
      />

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: tabs + content ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab bar */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {TABS.map(tab => (
                <button key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.key ? 'bg-white text-[#003D82] shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Services tab ── */}
            <AnimatePresence mode="wait">
              {activeTab === 'services' && (
                <motion.div key="services"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {services.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                      <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="font-semibold text-gray-700">No active services listed yet</p>
                    </div>
                  ) : (
                    services.map((service, i) => (
                      <motion.div key={service.id}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="flex gap-0">
                          {/* Image */}
                          <div className="flex-shrink-0 w-36 sm:w-48">
                            <img src={getServiceImage(service)} alt={service.title}
                              className="w-full h-full object-cover" style={{ minHeight: '140px' }} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-1.5">
                                <h3 className="font-bold text-gray-900 text-base leading-snug">{service.title}</h3>
                                <span className="flex-shrink-0 text-lg font-extrabold text-[#003D82]">
                                  ${Number(service.price).toLocaleString()}
                                </span>
                              </div>
                              <span className="inline-block text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold mb-2">
                                {service.category}
                              </span>
                              <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{service.description}</p>
                            </div>

                            {/* Badges */}
                            <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                              <div className="flex gap-2 flex-wrap">
                                {service.delivery_time && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                    <Clock className="w-3 h-3" />{service.delivery_time}
                                  </span>
                                )}
                                {service.service_area && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                    {service.service_area === 'remote' ? <Wifi className="w-3 h-3" /> : <HardHat className="w-3 h-3" />}
                                    {service.service_area === 'remote' ? 'Remote' : service.service_area === 'on-site' ? 'On-Site' : 'Remote & On-Site'}
                                  </span>
                                )}
                              </div>
                              <Link href={`/marketplace/service/${service.id}`}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-lg text-xs transition-all">
                                View & Book <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* ── Reviews tab ── */}
              {activeTab === 'reviews' && (
                <motion.div key="reviews"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {/* Rating summary */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-6">
                    <div className="text-center flex-shrink-0">
                      <div className="text-4xl font-extrabold text-gray-900">{reviewAvg.toFixed(1)}</div>
                      <div className="flex items-center gap-0.5 justify-center mt-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= Math.round(reviewAvg) ? 'text-amber-400 fill-current' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-gray-900">Client Reviews</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {reviews.length > 0
                          ? `Verified feedback from ${reviews.length} client${reviews.length !== 1 ? 's' : ''} who worked with ${displayName}.`
                          : `No reviews yet. Be the first to work with ${displayName}.`}
                      </p>
                    </div>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                      <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="font-semibold text-gray-700">No reviews yet</p>
                      <p className="text-sm text-gray-400 mt-1">Reviews appear here after a completed order.</p>
                    </div>
                  ) : (
                    reviews.map((review, i) => (
                      <motion.div key={review.id}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003D82] to-[#0066C0] flex items-center justify-center text-white font-bold flex-shrink-0">
                            {(review.reviewer_name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <p className="font-bold text-gray-900 text-sm">{review.reviewer_name || 'Verified Client'}</p>
                              <span className="text-[11px] text-gray-400">
                                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 mt-1">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-current' : 'text-gray-200'}`} />
                              ))}
                            </div>
                            {review.title && <p className="font-semibold text-gray-800 text-sm mt-2">{review.title}</p>}
                            {review.body && <p className="text-sm text-gray-600 leading-relaxed mt-1">{review.body}</p>}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* ── About tab ── */}
              {activeTab === 'about' && (
                <motion.div key="about"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  {/* Bio */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#003D82]" />About {displayName}
                    </h2>
                    {company.bio ? (
                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{company.bio}</p>
                    ) : (
                      <p className="text-gray-400 italic text-sm">No company description added yet.</p>
                    )}
                  </div>

                  {/* Certifications (aggregated across all services) */}
                  {allCerts.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-[#003D82]" />Certifications & Accreditations
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allCerts.map((cert, i) => (
                          <div key={i} className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="text-sm text-gray-700 font-medium">{cert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service categories breakdown */}
                  {services.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-[#003D82]" />Specialties
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(services.map(s => s.category))).map((cat, i) => (
                          <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-sm font-semibold">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: sticky sidebar ── */}
          <div className="lg:col-span-1 space-y-5">

            {/* Contact / CTA card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Get in Touch</h3>

              <button onClick={handleDM}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl text-sm transition-all shadow-sm mb-3">
                <MessageSquare className="w-4 h-4" />Send a Message
              </button>

              <Link href={`/rfq/create?engineer=${profileId}`}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl text-sm transition-all shadow-sm mb-5 block text-center">
                Request a Quote
              </Link>

              {/* Contact details */}
              <div className="space-y-3">
                <a href={`mailto:${company.email}`}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-[#003D82]/40 hover:bg-blue-50 transition-all group">
                  <Mail className="w-4 h-4 text-gray-400 group-hover:text-[#003D82]" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Email</p>
                    <p className="text-sm text-gray-800 font-medium truncate">{company.email}</p>
                  </div>
                </a>

                {company.location && (
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">Location</p>
                      <p className="text-sm text-gray-800 font-medium">{company.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Verified trust badge */}
              <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700">Verified Engineer</p>
                  <p className="text-[11px] text-gray-400">Identity verified by PPF</p>
                </div>
              </div>
            </div>

            {/* Quick stats card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-2"><Package className="w-4 h-4" />Active Services</span>
                  <span className="font-bold text-gray-900">{services.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-2"><Award className="w-4 h-4" />Certifications</span>
                  <span className="font-bold text-gray-900">{allCerts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-2"><Tag className="w-4 h-4" />Specialties</span>
                  <span className="font-bold text-gray-900">{Array.from(new Set(services.map(s => s.category))).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" />Member Since</span>
                  <span className="font-bold text-gray-900 text-xs">{new Date(company.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
