'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { 
  MapPin, 
  Star, 
  CheckCircle, 
  Building2,
  Globe,
  Mail,
  Phone,
  Calendar,
  Users,
  Award,
  Package,
  Clock,
  DollarSign,
  ShoppingCart,
  Heart,
  Share2,
  ExternalLink,
  Shield,
  Loader
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface CompanyProfile {
  id: string
  company_name: string
  description: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  specialties: string[] | null
  certifications: string[] | null
  team_size: number | null
  founded_year: number | null
  logo_url: string | null
  banner_url: string | null
  is_verified: boolean
  created_at: string
}

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  category: string | null
  delivery_time_days: number | null
  is_active: boolean
  image_url: string | null
  created_at: string
}

export default function VendorStorefrontPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'products' | 'about'>('products')

  useEffect(() => {
    loadCompanyData()
  }, [companyId])

  const loadCompanyData = async () => {
    try {
      const supabase = createClient()

      // Load company profile
      const { data: companyData, error: companyError } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', companyId)
        .single()

      if (companyError) {
        console.error('Error loading company:', companyError)
        toast.error('Company not found')
        router.push('/marketplace')
        return
      }

      setCompany(companyData)

      // Load company products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (productsError) {
        console.error('Error loading products:', productsError)
      } else {
        setProducts(productsData || [])
      }

    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load company data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Not Found</h1>
            <Link href="/marketplace" className="text-blue-600 hover:underline">
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Banner Section */}
      <div className="relative h-64 bg-gradient-to-r from-[#003D82] to-[#0066C0]">
        {company.banner_url ? (
          <img 
            src={company.banner_url} 
            alt={company.company_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            </div>
          </div>
        )}
      </div>

      {/* Company Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-white rounded-xl shadow-lg border-4 border-white flex items-center justify-center">
                {company.logo_url ? (
                  <img 
                    src={company.logo_url} 
                    alt={company.company_name}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <Building2 className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {company.company_name}
                    </h1>
                    {company.is_verified && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  {(company.city || company.state) && (
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>
                        {company.city && `${company.city}, `}
                        {company.state}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 text-sm">
                    {company.founded_year && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Est. {company.founded_year}</span>
                      </div>
                    )}
                    {company.team_size && (
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{company.team_size} Employees</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <Package className="w-4 h-4 mr-2" />
                      <span>{products.length} Products</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="p-2 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="p-2 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Specialties */}
          {company.specialties && company.specialties.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {company.specialties.map((specialty, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'products'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Products & Services ({products.length})
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'about'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  About Company
                </button>
              </div>
            </div>

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                {products.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Products Yet
                    </h3>
                    <p className="text-gray-600">
                      This company hasn't listed any products or services yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {products.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex gap-6">
                          {/* Product Image */}
                          <div className="flex-shrink-0 w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-16 h-16 text-gray-300" />
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">
                                  {product.name}
                                </h3>
                                {product.category && (
                                  <span className="text-sm text-gray-600">
                                    {product.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">
                                  ${(product.price / 100).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {product.currency.toUpperCase()}
                                </div>
                              </div>
                            </div>

                            <p className="text-gray-600 mb-4 line-clamp-2">
                              {product.description}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {product.delivery_time_days && (
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    <span>{product.delivery_time_days} days</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Link
                                  href={`/marketplace/${product.id}`}
                                  className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                                >
                                  View Details
                                </Link>
                                <Link
                                  href={`/checkout/${product.id}`}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center"
                                >
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Buy Now
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">About {company.company_name}</h2>
                
                {company.description ? (
                  <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">
                    {company.description}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">No company description available.</p>
                )}

                {/* Certifications */}
                {company.certifications && company.certifications.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-blue-600" />
                      Certifications & Accreditations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {company.certifications.map((cert, idx) => (
                        <div key={idx} className="flex items-center p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                          <span className="text-gray-700">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Contact Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>

              <div className="space-y-4">
                {company.email && (
                  <a
                    href={`mailto:${company.email}`}
                    className="flex items-start p-3 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors group"
                  >
                    <Mail className="w-5 h-5 text-gray-400 group-hover:text-blue-600 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="text-gray-900 font-medium break-all">{company.email}</div>
                    </div>
                  </a>
                )}

                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    className="flex items-start p-3 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors group"
                  >
                    <Phone className="w-5 h-5 text-gray-400 group-hover:text-blue-600 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="text-gray-900 font-medium">{company.phone}</div>
                    </div>
                  </a>
                )}

                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start p-3 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors group"
                  >
                    <Globe className="w-5 h-5 text-gray-400 group-hover:text-blue-600 mr-3 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">Website</div>
                      <div className="text-gray-900 font-medium truncate">{company.website}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 ml-2 flex-shrink-0" />
                  </a>
                )}

                {company.address && (
                  <div className="flex items-start p-3 border border-gray-200 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Address</div>
                      <div className="text-gray-900">
                        {company.address}
                        <br />
                        {company.city && `${company.city}, `}
                        {company.state} {company.zip_code}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Request Quote CTA */}
              <Link
                href={`/rfq/create?company=${company.id}`}
                className="block w-full mt-6 px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-center rounded-lg font-bold transition-colors"
              >
                Request a Quote
              </Link>

              {/* Trust Badge */}
              {company.is_verified && (
                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Verified Supplier
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This company has been verified by Precision Project Flow
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
