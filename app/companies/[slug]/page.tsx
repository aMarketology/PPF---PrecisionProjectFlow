'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import {
  MapPin, Globe, Phone, Mail, Building2, CheckCircle2,
  Briefcase, ArrowLeft, ExternalLink, Loader2, Tag, User
} from 'lucide-react'

interface Company {
  id: string
  company_name: string
  slug: string | null
  industry: string | null
  description: string | null
  city: string | null
  state: string | null
  website: string | null
  email: string | null
  phone: string | null
  is_claimed: boolean
  specialties: string[] | null
  certifications: string[] | null
  contact_name: string | null
  contact_title: string | null
  contact_email: string | null
  contact_phone: string | null
  street_address: string | null
}

const industryColor: Record<string, string> = {
  'Mechanical Engineering': 'bg-blue-100 text-blue-700',
  'Electrical Engineering': 'bg-yellow-100 text-yellow-700',
  'Structural Engineering': 'bg-orange-100 text-orange-700',
  'Software Engineering': 'bg-purple-100 text-purple-700',
  'Consulting Services': 'bg-teal-100 text-teal-700',
  'Analysis & Testing': 'bg-green-100 text-green-700',
  'Other Services': 'bg-gray-100 text-gray-600',
}

const categoryFallbacks: Record<string, string> = {
  'Mechanical Engineering': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop',
  'Electrical Engineering': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=400&fit=crop',
  'Structural Engineering': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=400&fit=crop',
  'Software Engineering': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=400&fit=crop',
  'Consulting Services': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=400&fit=crop',
  'Analysis & Testing': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&h=400&fit=crop',
  'Other Services': 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=400&fit=crop',
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (slug) loadCompany()
  }, [slug])

  async function loadCompany() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('company_profiles')
        .select('id, company_name, slug, industry, description, city, state, website, email, phone, is_claimed, specialties, certifications, contact_name, contact_title, contact_email, contact_phone, street_address')
        .eq('slug', slug)
        .single()

      if (error) console.error('Error loading company:', error)
      else setCompany(data as Company)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const heroImage = categoryFallbacks[company?.industry || ''] || categoryFallbacks['Other Services']

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#003D82] mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading company…</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-sm mx-auto px-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Company Not Found</h1>
            <p className="text-gray-500 text-sm mb-6">This company profile may have been removed.</p>
            <Link href="/companies"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all">
              <ArrowLeft className="w-4 h-4" /> Browse Directory
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const industryClass = industryColor[company.industry || ''] || industryColor['Other Services']
  const location = [company.city, company.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero Banner */}
      <div className="relative h-52 sm:h-64 overflow-hidden">
        <img src={heroImage} alt={company.company_name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#001f4d]/60 to-[#003D82]/80" />
        <div className="absolute inset-0 flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 pb-6">
          <Link href="/companies" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-3 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Company Directory
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT — main info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-[#003D82]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl font-extrabold text-gray-900">{company.company_name}</h1>
                    {company.is_claimed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                        <Briefcase className="w-3 h-3" /> Unclaimed
                      </span>
                    )}
                  </div>

                  {company.industry && (
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${industryClass}`}>
                      {company.industry}
                    </span>
                  )}

                  {location && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" /> {location}
                    </div>
                  )}
                </div>
              </div>

              {company.description && (
                <p className="mt-4 text-gray-600 leading-relaxed">{company.description}</p>
              )}
            </div>

            {/* Specialties */}
            {company.specialties && company.specialties.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#003D82]" /> Specialties
                </h2>
                <div className="flex flex-wrap gap-2">
                  {company.specialties.map((s) => (
                    <span key={s} className="text-sm bg-blue-50 border border-blue-100 text-blue-700 rounded-full px-3 py-1 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {company.certifications && company.certifications.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Certifications
                </h2>
                <div className="flex flex-wrap gap-2">
                  {company.certifications.map((c) => (
                    <span key={c} className="text-sm bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full px-3 py-1 font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact person */}
            {(company.contact_name || company.contact_title) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#003D82]" /> Primary Contact
                </h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#003D82]/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#003D82]" />
                  </div>
                  <div>
                    {company.contact_name && <p className="font-semibold text-gray-900">{company.contact_name}</p>}
                    {company.contact_title && <p className="text-sm text-gray-500">{company.contact_title}</p>}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {company.contact_email && (
                    <a href={`mailto:${company.contact_email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#003D82] transition-colors">
                      <Mail className="w-4 h-4 text-gray-400" /> {company.contact_email}
                    </a>
                  )}
                  {company.contact_phone && (
                    <a href={`tel:${company.contact_phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#003D82] transition-colors">
                      <Phone className="w-4 h-4 text-gray-400" /> {company.contact_phone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — sidebar CTAs */}
          <div className="space-y-4">

            {/* Main CTA card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Get in Touch</h3>
              <p className="text-sm text-gray-500 mb-5">Visit their website or reach out directly for quotes, availability, and services.</p>

              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all mb-3 text-sm"
                >
                  Visit Website <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl transition-all mb-3 text-sm"
                >
                  <Mail className="w-4 h-4" /> Send Email
                </a>
              )}

              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition-all text-sm"
                >
                  <Phone className="w-4 h-4" /> {company.phone}
                </a>
              )}

              {/* Address */}
              {(company.street_address || location) && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{[company.street_address, location].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Claim banner */}
            {!company.is_claimed && (
              <div className="bg-gradient-to-br from-[#FF6B35]/10 to-orange-50 border border-orange-200 rounded-2xl p-5">
                <h4 className="font-bold text-gray-900 mb-1 text-sm">Is this your company?</h4>
                <p className="text-xs text-gray-600 mb-3">Claim this profile to update your info, respond to inquiries, and get a verified badge.</p>
                <Link
                  href={`/claim-company?id=${company.id}&name=${encodeURIComponent(company.company_name)}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl transition-all text-sm"
                >
                  <Briefcase className="w-4 h-4" /> Claim This Company
                </Link>
              </div>
            )}

            {/* Back link */}
            <Link href="/companies" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#003D82] transition-colors px-1">
              <ArrowLeft className="w-4 h-4" /> Back to Directory
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
