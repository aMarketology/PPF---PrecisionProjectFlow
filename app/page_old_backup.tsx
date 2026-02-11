'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import { 
  ArrowRight,
  Building,
  Cog,
  Zap,
  Star,
  MapPin,
  CheckCircle,
  Users,
  Shield,
  TrendingUp,
  FileText,
  Search,
  Scale,
  Target,
  HeadphonesIcon,
  Award,
  Globe,
  Sparkles,
  Package
} from 'lucide-react';
import { getUser } from './actions/auth';

const serviceAreas = [
  { name: 'Detroit', state: 'Michigan' },
  { name: 'Houston', state: 'Texas' },
  { name: 'Indianapolis', state: 'Indiana' },
  { name: 'Los Angeles', state: 'California' }
];

const engineeringCategories = [
  {
    icon: Building,
    title: 'Structural Engineering',
    description: 'Foundation design, seismic analysis, and code compliance',
    features: ['Foundation Design', 'Seismic Analysis', 'Building Codes', 'CAD Drawings'],
    color: 'blue'
  },
  {
    icon: Cog,
    title: 'Mechanical Engineering',
    description: 'HVAC systems, mechanical design, and optimization',
    features: ['HVAC Design', 'Energy Analysis', 'MEP Systems', 'Load Calculations'],
    color: 'blue'
  },
  {
    icon: Zap,
    title: 'Electrical Engineering',
    description: 'Power systems, lighting design, and smart solutions',
    features: ['Power Systems', 'Lighting Design', 'Solar/Renewable', 'Smart Building'],
    color: 'blue'
  }
];

const whyChooseUs = [
  {
    icon: Shield,
    title: 'Verified Professionals',
    description: 'Every engineer is thoroughly vetted and certified'
  },
  {
    icon: Globe,
    title: 'Global Network',
    description: '2,000+ experts across all engineering disciplines worldwide'
  },
  {
    icon: CheckCircle,
    title: 'Secure Transactions',
    description: 'Escrow payments and quality guarantees on every project'
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Expert Support',
    description: 'Dedicated team ready to assist whenever you need help'
  }
];

const howItWorks = [
  {
    number: '01',
    icon: FileText,
    title: 'Post Your Project',
    description: 'Describe your engineering needs with our guided project form'
  },
  {
    number: '02',
    icon: Search,
    title: 'Get Matched',
    description: 'We connect you with pre-vetted engineers who match your requirements'
  },
  {
    number: '03',
    icon: Scale,
    title: 'Review Proposals',
    description: 'Compare proposals, portfolios, and ratings to find the perfect fit'
  },
  {
    number: '04',
    icon: Target,
    title: 'Get Results',
    description: 'Collaborate securely and receive high-quality deliverables on time'
  }
];

const trustBadges = [
  { icon: '🏗️', title: 'ASCE Certified', subtitle: 'American Society of Civil Engineers' },
  { icon: '⚙️', title: 'ASME Member', subtitle: 'Mechanical Engineering Society' },
  { icon: '⚡', title: 'IEEE Standards', subtitle: 'Electrical Engineering Institute' },
  { icon: '✅', title: 'ISO 9001', subtitle: 'Quality Management Standard' },
  { icon: '🎓', title: 'FE Licensed', subtitle: 'Fundamentals of Engineering' }
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const isVendor = user?.profile?.user_type === 'engineer';

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* === HERO SECTION === */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 bg-blue-50 mb-6">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Engineering Marketplace</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-8"
            >
              The Verified Engineering
              <span className="block bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent pb-2">
                Marketplace for Real Projects
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            >
              Find, compare, and hire <strong className="text-gray-900">certified engineering professionals</strong> through a platform built on verification, transparency, and secure project delivery.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              {isVendor ? (
                // Vendor/Engineer CTAs
                <>
                  <Link
                    href="/products/create"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Package className="w-5 h-5" />
                    List Your Product
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  
                  <Link
                    href="/dashboard/engineer"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 rounded-lg font-semibold text-gray-900 hover:border-blue-600 transition-all"
                  >
                    Go to Dashboard
                  </Link>
                </>
              ) : user ? (
                // Logged in Client CTAs
                <>
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Browse Services
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  
                  <Link
                    href="/dashboard/client"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 rounded-lg font-semibold text-gray-900 hover:border-blue-600 transition-all"
                  >
                    Go to Dashboard
                  </Link>
                </>
              ) : (
                // Not logged in CTAs
                <>
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Browse Services
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  
                  <Link
                    href="/get-started"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 rounded-lg font-semibold text-gray-900 hover:border-blue-600 transition-all"
                  >
                    Start Offering Services
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* === VALUE PROPOSITION SECTION === */}
      <section className="relative py-20 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Professional Engineering Services.{' '}
              <span className="text-blue-600">Verified Experts.</span>{' '}
              One Marketplace.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8"
            >
              Precision Project Flow is the engineering marketplace that connects businesses, builders, architects, and innovators with <strong className="text-gray-900">vetted engineering professionals</strong> across all major disciplines.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-600 leading-relaxed"
            >
              We eliminate guesswork, reduce risk, and standardize how engineering work gets sourced, evaluated, and delivered. Whether you need a structural analysis, an MEP system design, or a fully integrated engineering team—<strong className="text-gray-900">our platform delivers expertise you can trust.</strong>
            </motion.p>
          </div>
        </div>
      </section>

      {/* === ENGINEERING SERVICES SECTION === */}
      <section className="relative py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white bg-white shadow-sm mb-6">
              <Building className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Engineering Disciplines</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Engineering Expertise Across Every Discipline
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Foundation design, HVAC systems, power distribution, and more—connect with verified experts in every specialty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {engineeringCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link 
                  key={index}
                  href="/marketplace"
                  className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-white border-2 border-gray-200 hover:border-blue-600 transition-all duration-300 hover:shadow-xl p-8"
                >
                  <div className="w-14 h-14 mb-6 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{category.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {category.description}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {category.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="inline-flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                    Learn More
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="relative py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 bg-blue-50 mb-6">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">How It Works</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple. Transparent. Results-Driven.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get your engineering project completed in four streamlined steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-600 transition-all hover:shadow-xl">
                  <div className="absolute -top-4 left-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-lg">
                      {step.number}
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="text-4xl mb-4">{step.icon === FileText ? '📝' : step.icon === Search ? '🔍' : step.icon === Scale ? '⚖️' : '🎯'}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* === WHY CHOOSE US === */}
      <section className="relative py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Teams Choose
              <span className="block bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Precision Project Flow
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're the engineering marketplace built for professionals who demand quality, reliability, and results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {whyChooseUs.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-600 transition-all hover:shadow-xl">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              );
            })}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center p-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white">
              <div className="text-5xl font-bold mb-2">4.8</div>
              <div className="text-xl font-semibold mb-1">Highly Trusted</div>
              <div className="text-blue-100">Rated by thousands of satisfied clients globally</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white">
              <div className="text-5xl font-bold mb-2">2K+</div>
              <div className="text-xl font-semibold mb-1">Expert Engineers</div>
              <div className="text-blue-100">Across all disciplines</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white">
              <div className="text-5xl font-bold mb-2">500+</div>
              <div className="text-xl font-semibold mb-1">Active Services</div>
              <div className="text-blue-100">Available right now</div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="text-center">
            <p className="text-lg text-gray-600 font-semibold mb-4">Trusted in 50+ Countries</p>
            <p className="text-gray-500">International engineering teams rely on us daily</p>
          </div>
        </div>
      </section>

      {/* === TRUSTED BY LEADING ORGANIZATIONS === */}
      <section className="relative py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 bg-blue-50 mb-6">
              <Award className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">TRUSTED BY LEADING ORGANIZATIONS</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Industry Certifications & Standards
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {trustBadges.map((badge, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-blue-600 transition-all text-center hover:shadow-xl">
                <div className="text-5xl mb-4">{badge.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{badge.title}</h3>
                <p className="text-sm text-gray-600">{badge.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === SERVICE AREAS === */}
      <section className="relative py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 bg-blue-50 mb-6">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Service Areas</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Serving Engineers & Clients Nationwide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connecting engineering talent with projects across the United States
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {serviceAreas.map((area, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-600 transition-all text-center">
                <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900">{area.name}</h3>
                <p className="text-sm text-gray-600">{area.state}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 text-lg">
              And expanding to more cities across the United States
            </p>
          </div>
        </div>
      </section>

      {/* === MANIFESTO SECTION === */}
      <section className="relative py-24 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-600 bg-slate-800/50 mb-6">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Our Commitment</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Engineering Excellence,
              <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Simplified.
              </span>
            </h2>
          </div>

          <div className="prose prose-lg prose-invert mx-auto">
            <p className="text-xl text-slate-300 leading-relaxed mb-6">
              We believe exceptional engineering work shouldn't be hard to find. That's why we built a platform where 
              <strong className="text-white"> verified professionals</strong> connect with <strong className="text-white">real projects</strong> 
              —no fluff, no gimmicks, just results.
            </p>
            
            <p className="text-xl text-slate-300 leading-relaxed mb-6">
              Every engineer is vetted. Every project is legitimate. Every transaction is secure. We've eliminated the noise 
              so you can focus on what matters: <strong className="text-white">building something great</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
              <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-3xl font-bold text-blue-400 mb-2">100%</div>
                <div className="text-slate-300">Verified Engineers</div>
              </div>
              <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
                <div className="text-slate-300">Platform Support</div>
              </div>
              <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-3xl font-bold text-blue-400 mb-2">$10M+</div>
                <div className="text-slate-300">Projects Completed</div>
              </div>
            </div>

            <p className="text-xl text-slate-300 leading-relaxed">
              Whether you're an engineer looking for your next challenge or a company seeking top-tier talent, 
              Precision Project Flow is your trusted partner for engineering excellence.
            </p>
          </div>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section className="relative py-24 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Join Precision Product Flow today and connect with top engineering talent or find your next project.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:shadow-2xl transition-all"
            >
              Create Account
              <ArrowRight className="w-6 h-6" />
            </Link>
            
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
