import type { Metadata } from 'next'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { blogPosts } from '@/lib/blog'
import { ArrowRight, Clock, Tag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Engineering Blog — Hiring Guides & Industry Insights | Precision Project Flow',
  description:
    'Expert guides on hiring licensed engineers, PE-stamped drawings, engineering RFQs, and more. Resources from the Precision Project Flow engineering marketplace.',
  keywords: [
    'engineering blog',
    'hire engineer guide',
    'PE stamped drawings',
    'engineering services marketplace',
    'structural engineer cost',
  ],
  openGraph: {
    title: 'Engineering Blog | Precision Project Flow',
    description:
      'Expert guides on hiring licensed engineers, PE stamps, RFQs, and the engineering services marketplace.',
    url: 'https://www.precisionprojectflow.com/blog',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.precisionprojectflow.com/blog',
  },
}

const CATEGORY_COLORS: Record<string, string> = {
  'Hiring Guides':       'bg-blue-50 text-[#003D82] border border-blue-100',
  'Engineering Basics':  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  'Marketplace Insights':'bg-orange-50 text-[#FF6B35] border border-orange-100',
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
}

// Sort posts newest-first
const sortedPosts = [...blogPosts].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogPage() {
  const [featured, ...rest] = sortedPosts

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-28 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-3 py-1 text-xs font-bold tracking-widest text-blue-200 border border-blue-400/30 rounded-full mb-4 uppercase">
            Engineering Resources
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
            The PPF Engineering Blog
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto">
            Hiring guides, cost breakdowns, and industry insights for engineers and the clients who work with them.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-10 pb-24">

        {/* ── Featured post ── */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="block bg-white rounded-2xl border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden mb-10 group"
          >
            <div className="p-8 sm:p-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(featured.category)}`}>
                  <Tag className="w-3 h-3" />{featured.category}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />{featured.readTime}
                </span>
                <span className="text-xs text-gray-400">{formatDate(featured.date)}</span>
                <span className="ml-auto text-xs font-bold text-[#FF6B35] uppercase tracking-wide">Featured</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 group-hover:text-[#003D82] transition-colors leading-snug">
                {featured.title}
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-6 max-w-3xl">
                {featured.description}
              </p>
              <span className="inline-flex items-center gap-2 text-[#003D82] font-bold text-sm group-hover:gap-3 transition-all">
                Read article <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        )}

        {/* ── Post grid ── */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col"
              >
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getCategoryColor(post.category)}`}>
                      <Tag className="w-3 h-3" />{post.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />{post.readTime}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-gray-900 mb-2 group-hover:text-[#003D82] transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                    <span className="text-xs text-gray-400">{formatDate(post.date)}</span>
                    <span className="inline-flex items-center gap-1.5 text-[#003D82] font-bold text-xs group-hover:gap-2 transition-all">
                      Read more <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Bottom CTA ── */}
        <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] rounded-2xl p-10 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)',
            }}
          />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Ready to find a licensed engineer?
            </h2>
            <p className="text-blue-200 mb-8 max-w-xl mx-auto">
              Browse verified engineers, compare credentials, and get proposals on your project — all in one place.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/marketplace"
                className="px-6 py-3 bg-white text-[#003D82] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/rfq/create"
                className="px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg"
              >
                Post a Free RFQ
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
