'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import { 
  Search,
  Building2,
  Factory,
  Cpu,
  Zap,
  Wrench,
  HardHat,
  Package,
  Truck,
  Award,
  Shield,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Star,
  FileText,
  Users,
  Globe,
  Hash,
  MessageCircle,
  ShoppingCart,
  UserPlus,
  Coins,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { getUser } from './actions/auth'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface SiteActivity {
  id: string; activity_type: string; actor_id: string; target_type: string | null; target_id: string | null;
  summary: string; metadata: Record<string, any>; previous_hash: string | null; row_hash: string;
  created_at: string; actor: { id: string; full_name: string; avatar_url: string | null; user_type: string } | null;
}

// Engineering categories matching ThomasNet style
const engineeringCategories = [
  { icon: Building2, name: 'Civil Engineering',        count: 'Browse suppliers', color: 'blue' },
  { icon: Factory,   name: 'Mechanical Engineering',   count: 'Browse suppliers', color: 'orange' },
  { icon: Zap,       name: 'Electrical Engineering',   count: 'Browse suppliers', color: 'yellow' },
  { icon: Cpu,       name: 'Controls & Automation',    count: 'Browse suppliers', color: 'purple' },
  { icon: Wrench,    name: 'Manufacturing',             count: 'Browse suppliers', color: 'green' },
  { icon: HardHat,   name: 'Construction Services',    count: 'Browse suppliers', color: 'red' },
  { icon: Package,   name: 'Material Handling',        count: 'Browse suppliers', color: 'indigo' },
  { icon: Truck,     name: 'Logistics & Supply Chain', count: 'Browse suppliers', color: 'cyan' },
]

// Featured suppliers
const featuredSuppliers = [
  {
    name: 'Bechtel Corporation',
    logo: '/logos/bechtel.svg',
    category: 'Civil Engineering',
    location: 'Reston, VA',
    rating: 4.9,
    reviews: 127,
    verified: true,
    capabilities: ['Infrastructure', 'Power Generation', 'Mining'],
    badge: 'Premium'
  },
  {
    name: 'AECOM',
    logo: '/logos/aecom.svg',
    category: 'Transportation',
    location: 'Dallas, TX',
    rating: 4.8,
    reviews: 203,
    verified: true,
    capabilities: ['Urban Planning', 'Water Treatment', 'Environmental'],
    badge: 'Premium'
  },
  {
    name: 'Fluor Corporation',
    logo: '/logos/fluor.svg',
    category: 'Energy & Chemicals',
    location: 'Irving, TX',
    rating: 4.7,
    reviews: 156,
    verified: true,
    capabilities: ['Oil & Gas', 'Petrochemicals', 'Refining'],
    badge: 'Premium'
  },
]

// How it works steps
const howItWorksSteps = [
  {
    step: '1',
    title: 'Search & Discover',
    description: 'Find qualified suppliers by product, service, or company name across 500,000+ industrial products',
    icon: Search
  },
  {
    step: '2',
    title: 'Request Quotes',
    description: 'Send RFQs to multiple suppliers simultaneously. Compare quotes and capabilities side-by-side',
    icon: FileText
  },
  {
    step: '3',
    title: 'Connect & Order',
    description: 'Contact suppliers directly, negotiate terms, and complete transactions securely',
    icon: CheckCircle2
  },
]

// Trust indicators
const trustIndicators = [
  { icon: Building2, value: '3,900+', label: 'Companies Listed' },
  { icon: Users,     value: 'Free',   label: 'To Join & Browse' },
  { icon: FileText,  value: 'Direct', label: 'RFQ to Supplier' },
  { icon: Shield,    value: 'Secure', label: 'Verified Platform' },
]

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [activities, setActivities] = useState<SiteActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      const userData = await getUser()
      setUser(userData)
      // If logged in, also fetch blockchain activity feed
      if (userData?.id) {
        loadActivities()
      }
    }
    fetchUser()
  }, [])

  const loadActivities = async () => {
    setActivitiesLoading(true)
    try {
      const res = await fetch('/api/activities?page=0&type=all&search=')
      const data = await res.json()
      setActivities(data.activities?.slice(0, 6) ?? [])
    } catch { /* silent */ }
    finally { setActivitiesLoading(false) }
  }

  const popularSearches = [
    'Structural Steel Fabrication',
    'HVAC Design Services',
    'Electrical Panel Manufacturing',
    'Precision Machining',
    'Industrial Automation',
    'CAD/CAM Services',
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section - ThomasNet Style Search */}
      <section className="relative bg-gradient-to-br from-[#003D82] via-[#0052A3] to-[#0066C0] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center pt-12"
          >
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              Source Industrial Products & Services
            </h1>
            <p className="text-xl lg:text-2xl mb-10 text-blue-100 max-w-3xl mx-auto">
              Connect with verified engineering suppliers, manufacturers, and service providers
            </p>

            {/* Main Search Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div className={`bg-white rounded-xl shadow-2xl transition-all duration-300 ${
                  searchFocus ? 'ring-4 ring-blue-300' : ''
                }`}>
                  <div className="flex items-center p-4">
                    <Search className="w-6 h-6 text-gray-400 ml-2" />
                    <input
                      type="text"
                      placeholder="Search by product, service, or company name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocus(true)}
                      onBlur={() => setTimeout(() => setSearchFocus(false), 200)}
                      className="flex-1 px-4 py-2 text-lg text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                    <Link
                      href={`/marketplace?search=${encodeURIComponent(searchQuery)}`}
                      className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white px-8 py-3 rounded-lg font-semibold transition-colors ml-2"
                    >
                      Search
                    </Link>
                  </div>

                  {/* Popular Searches */}
                  {searchFocus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-gray-200 p-4"
                    >
                      <div className="text-sm text-gray-500 mb-2">Popular Searches:</div>
                      <div className="flex flex-wrap gap-2">
                        {popularSearches.map((search, idx) => (
                          <Link
                            key={idx}
                            href={`/marketplace?search=${encodeURIComponent(search)}`}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                          >
                            {search}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex justify-center gap-4 mt-6">
                <Link
                  href="/marketplace"
                  className="text-white hover:text-blue-100 underline text-sm"
                >
                  Browse Directory
                </Link>
                <span className="text-blue-200">•</span>
                <Link
                  href="/rfq/create"
                  className="text-white hover:text-blue-100 underline text-sm"
                >
                  Post an RFQ
                </Link>
                <span className="text-blue-200">•</span>
                <Link
                  href="/signup"
                  className="text-white hover:text-blue-100 underline text-sm"
                >
                  Join Free
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600 rounded-full opacity-10 blur-3xl"></div>
        </div>
      </section>

      {/* ── Blockchain Activity Feed (Authenticated users) ── */}
      {user && (
        <section className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#003D82]/10 text-[#003D82] rounded-full px-3 py-1 text-xs font-semibold mb-2">
                  <Hash className="w-3.5 h-3.5" /> Blockchain Ledger
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Live Activity Feed</h2>
                <p className="text-sm text-gray-500">Real-time platform activity — cryptographically chained</p>
              </div>
              <Link
                href="/activity"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:border-[#003D82] text-gray-700 hover:text-[#003D82] font-semibold rounded-xl text-sm transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                View Full Activity
              </Link>
            </div>

            {activitiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#003D82]" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Hash className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-600 text-sm">No activity yet</p>
                <p className="text-xs text-gray-400 mt-1">Activity will appear as vendors post RFQs, submit offers, and complete orders.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activities.map((activity) => {
                  const iconBg: Record<string, string> = {
                    rfq_posted: 'bg-blue-100 text-blue-600',
                    rfq_awarded: 'bg-emerald-100 text-emerald-600',
                    offer_submitted: 'bg-rose-100 text-rose-600',
                    social_post_created: 'bg-purple-100 text-purple-600',
                    order_placed: 'bg-amber-100 text-amber-600',
                    order_completed: 'bg-green-100 text-green-600',
                    company_joined: 'bg-cyan-100 text-cyan-600',
                    team_member_added: 'bg-rose-100 text-rose-600',
                  };
                  const activityIcons: Record<string, React.ReactNode> = {
                    rfq_posted: <FileText className="w-4 h-4" />,
                    rfq_awarded: <Award className="w-4 h-4" />,
                    offer_submitted: <TrendingUp className="w-4 h-4" />,
                    social_post_created: <MessageCircle className="w-4 h-4" />,
                    order_placed: <ShoppingCart className="w-4 h-4" />,
                    order_completed: <CheckCircle2 className="w-4 h-4" />,
                    company_joined: <Building2 className="w-4 h-4" />,
                    team_member_added: <UserPlus className="w-4 h-4" />,
                  };
                  const targetLink = activity.target_type === 'rfq' && activity.target_id
                    ? `/rfq/${activity.target_id}`
                    : activity.target_type === 'feed_post' && activity.target_id
                    ? `/activity`
                    : null;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg[activity.activity_type] || 'bg-gray-100 text-gray-600'}`}>
                            {activityIcons[activity.activity_type] || <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {activity.actor && (
                                <span className="font-semibold text-gray-900 text-sm truncate">{activity.actor.full_name}</span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{activity.summary}</p>
                            {activity.metadata?.budget && (
                              <p className="text-xs text-emerald-600 font-semibold mt-1">Budget: {activity.metadata.budget}</p>
                            )}
                            {activity.metadata?.category && (
                              <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-50 text-[#003D82] text-[10px] font-semibold rounded-full">
                                {activity.metadata.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-mono">
                          <Hash className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[100px]" title={activity.row_hash}>
                            {activity.row_hash?.substring(0, 12) || 'pending'}...
                          </span>
                        </div>
                        {targetLink && (
                          <Link href={targetLink} className="text-[10px] font-semibold text-[#003D82] hover:text-[#002960] flex items-center gap-0.5">
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-center mt-6 gap-4">
              <Link
                href="/activity"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                View Full Activity Feed
              </Link>
              <Link
                href="/rfq"
                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 hover:border-[#003D82] text-gray-700 hover:text-[#003D82] font-semibold rounded-xl text-sm transition-all"
              >
                <FileText className="w-4 h-4" />
                Browse Open RFQs
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Trust Indicators Bar */}
      <section className="bg-gray-50 border-y border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustIndicators.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <item.icon className="w-8 h-8 text-[#003D82] mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">{item.value}</div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Categories Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Browse by Engineering Category
            </h2>
            <p className="text-xl text-gray-600">
              Find engineers and vendors across every major discipline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {engineeringCategories.map((category, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Link
                  href={`/marketplace?category=${encodeURIComponent(category.name)}`}
                  className="block bg-white border-2 border-gray-200 hover:border-[#003D82] rounded-xl p-6 transition-all group"
                >
                  <div className={`w-14 h-14 bg-${category.color}-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <category.icon className={`w-7 h-7 text-${category.color}-600`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#003D82]">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500">{category.count}</p>
                  <div className="flex items-center text-[#003D82] mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Explore</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/marketplace"
              className="inline-flex items-center px-8 py-3 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white rounded-lg font-semibold transition-colors"
            >
              View All Categories
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Suppliers */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Featured Suppliers
              </h2>
              <p className="text-xl text-gray-600">
                Premium verified engineering companies you can trust
              </p>
            </div>
            <Link
              href="/marketplace?featured=true"
              className="hidden md:flex items-center text-[#003D82] hover:text-[#0052A3] font-semibold"
            >
              View All
              <ArrowRight className="w-5 h-5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredSuppliers.map((supplier, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Link
                  href={`/profiles/${supplier.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="block bg-white border-2 border-gray-200 hover:border-[#003D82] rounded-xl p-6 h-full transition-all"
                >
                  {/* Premium Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {supplier.badge}
                    </div>
                    {supplier.verified && (
                      <div className="flex items-center text-green-600">
                        <Shield className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Company Logo/Name */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {supplier.name}
                    </h3>
                    <p className="text-sm text-gray-500">{supplier.category}</p>
                  </div>

                  {/* Location & Rating */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {supplier.location}
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                      {supplier.rating} ({supplier.reviews})
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {supplier.capabilities.map((cap, capIdx) => (
                        <span
                          key={capIdx}
                          className="px-2 py-1 bg-blue-50 text-[#003D82] text-xs rounded-md"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                    <button className="flex-1 bg-[#003D82] hover:bg-[#0052A3] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Request Quote
                    </button>
                    <button className="flex-1 border-2 border-gray-300 hover:border-[#003D82] text-gray-700 hover:text-[#003D82] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      View Profile
                    </button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How Precision Project Flow Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Streamlined sourcing process connecting buyers with qualified engineering suppliers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {howItWorksSteps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                className="text-center relative"
              >
                {/* Connecting Line */}
                {idx < howItWorksSteps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-[#003D82] to-[#0066C0]"></div>
                )}

                {/* Step Number Circle */}
                <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-[#003D82] to-[#0066C0] text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-3xl font-bold">{step.step}</span>
                </div>

                {/* Icon */}
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-[#003D82]" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href={user ? "/marketplace" : "/signup"}
              className="inline-flex items-center px-8 py-4 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
            >
              {user ? "Start Sourcing Now" : "Get Started Free"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-[#003D82] to-[#0066C0] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                Are You a Supplier?
              </h2>
              <p className="text-xl text-blue-100 mb-6">
                Join thousands of verified suppliers connecting with qualified buyers. Grow your business with Precision Project Flow.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle2 className="w-6 h-6 mr-3 text-green-400" />
                  <span>Free company profile</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-6 h-6 mr-3 text-green-400" />
                  <span>Receive qualified RFQs</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-6 h-6 mr-3 text-green-400" />
                  <span>Showcase your capabilities</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-6 h-6 mr-3 text-green-400" />
                  <span>Connect with decision makers</span>
                </li>
              </ul>
              <Link
                href="/signup?type=vendor"
                className="inline-flex items-center px-8 py-4 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-lg font-bold text-lg transition-colors"
              >
                Register as Supplier
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold mb-6">Why Suppliers Choose Us</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Increase Visibility</h4>
                    <p className="text-sm text-blue-100">Get discovered by thousands of active buyers searching daily</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Build Trust</h4>
                    <p className="text-sm text-blue-100">Showcase certifications, reviews, and successful projects</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Premium Features</h4>
                    <p className="text-sm text-blue-100">Stand out with featured placement and enhanced profiles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
