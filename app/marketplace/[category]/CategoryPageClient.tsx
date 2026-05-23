'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { CategoryConfig } from '@/lib/categoryConfig'
import { Star, MapPin, Clock, ChevronRight, CheckCircle, ArrowRight, MessageSquare, Award } from 'lucide-react'

interface Service {
  id: string
  title: string
  description: string
  price: number
  category: string
  delivery_time: string | null
  service_area: string | null
  certifications: string[] | null
  images: string[] | null
  provider_id: string
  provider?: { id: string; full_name: string; location: string | null; avatar_url: string | null }
}

const categoryFallbacks: Record<string, string> = {
  'Structural Engineering': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop',
  'Mechanical Engineering': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop',
  'Electrical Engineering': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop',
  'Civil Engineering': 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=400&fit=crop',
  'Consulting Services': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
}

export default function CategoryPageClient({ config }: { config: CategoryConfig }) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, title, description, price, category, delivery_time, service_area, certifications, images, provider_id, created_at')
        .eq('active', true)
        .eq('category', config.dbCategory)
        .order('created_at', { ascending: false })

      if (!servicesData || servicesData.length === 0) { setLoading(false); return }

      const providerIds = Array.from(new Set(servicesData.map((s: any) => s.provider_id).filter(Boolean)))
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, location, avatar_url')
        .in('id', providerIds)

      const profileMap: Record<string, any> = {}
      for (const p of (profilesData || [])) profileMap[p.id] = p

      setServices(servicesData.map((s: any) => ({ ...s, provider: profileMap[s.provider_id] || null })))
      setLoading(false)
    }
    load()
  }, [config.dbCategory])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: config.title,
    description: config.seoDescription,
    provider: { '@type': 'Organization', name: 'Precision Project Flow', url: 'https://www.precisionprojectflow.com' },
    areaServed: 'United States',
    serviceType: config.title,
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Navigation />
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">

        {/* ── Hero ── */}
        <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.3) 39px, rgba(255,255,255,0.3) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.3) 39px, rgba(255,255,255,0.3) 40px)' }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-blue-300 text-sm mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white">{config.title}</span>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-blue-300 text-sm font-semibold tracking-widest uppercase mb-3">Engineering Marketplace</p>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
                {config.headline}
              </h1>
              <p className="text-blue-100 text-lg max-w-2xl mb-8 leading-relaxed">{config.subheadline}</p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/rfq/create" className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-lg">
                  Post Your Project Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/marketplace" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors border border-white/20">
                  Browse All Services
                </Link>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
              {config.stats.map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                  <p className="text-blue-200 text-sm mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Benefits ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What You Get</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {config.benefits.map((b) => (
              <div key={b.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="text-3xl mb-3">{b.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Service Listings ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading services…' : `${services.length} ${config.title} Available`}
            </h2>
            <Link href="/rfq/create" className="text-[#003D82] hover:text-[#002960] text-sm font-semibold flex items-center gap-1">
              Post an RFQ instead <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No listings yet in this category</h3>
              <p className="text-gray-500 mb-6">Post an RFQ and we'll match you with qualified engineers.</p>
              <Link href="/rfq/create" className="inline-flex items-center gap-2 bg-[#003D82] hover:bg-[#002960] text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                Post Your Project
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link href={`/marketplace/service/${service.id}`} className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden">
                    <div className="h-40 overflow-hidden">
                      <img
                        src={service.images?.[0] || categoryFallbacks[service.category] || categoryFallbacks['Consulting Services']}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-[#003D82] transition-colors">{service.title}</h3>
                      </div>
                      <p className="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">{service.description}</p>

                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                        {service.provider?.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{service.provider.location}</span>
                        )}
                        {service.delivery_time && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{service.delivery_time}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[#003D82] font-bold text-base">${service.price.toLocaleString()}</span>
                          {service.provider && (
                            <p className="text-gray-400 text-xs mt-0.5">by {service.provider.full_name}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-[#003D82] bg-blue-50 px-3 py-1 rounded-full group-hover:bg-[#003D82] group-hover:text-white transition-colors">
                          View →
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ── RFQ CTA ── */}
        <div className="bg-gradient-to-r from-[#003D82] to-[#005BB5] py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-3">Don't see what you need?</h2>
            <p className="text-blue-100 text-lg mb-8">Post your project as an RFQ and get quotes from qualified {config.heroKeyword}s within 24 hours.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/rfq/create" className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold px-8 py-4 rounded-xl transition-colors shadow-lg text-lg">
                Post Your Project Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/profiles" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg">
                Browse Engineers
              </Link>
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {config.faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cross-links to other categories ── */}
        <div className="bg-gray-50 border-t border-gray-200 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-lg font-bold text-gray-700 mb-5 text-center">Explore Other Engineering Categories</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { slug: 'structural-engineering', label: 'Structural Engineering' },
                { slug: 'mechanical-engineering', label: 'Mechanical Engineering' },
                { slug: 'civil-engineering', label: 'Civil Engineering' },
                { slug: 'electrical-engineering', label: 'Electrical Engineering' },
                { slug: 'pe-stamps', label: 'PE Stamps' },
                { slug: 'consulting-services', label: 'Consulting Services' },
              ]
                .filter((c) => c.slug !== config.slug)
                .map((c) => (
                  <Link
                    key={c.slug}
                    href={`/marketplace/${c.slug}`}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-[#003D82] hover:text-[#003D82] transition-colors shadow-sm"
                  >
                    {c.label}
                  </Link>
                ))}
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </>
  )
}
