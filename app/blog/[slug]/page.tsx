import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { getPostBySlug, getAllSlugs, blogPosts } from '@/lib/blog'
import { ArrowLeft, Clock, Tag, ArrowRight, ChevronRight } from 'lucide-react'

interface Props {
  params: { slug: string }
}

// ── Static generation ────────────────────────────────────────────────────────
export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

// ── Per-post SEO metadata ────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return {}

  const url = `https://www.precisionprojectflow.com/blog/${post.slug}`

  return {
    title: `${post.title} | Precision Project Flow Blog`,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author.name }],
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: url,
    },
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const CATEGORY_COLORS: Record<string, string> = {
  'Hiring Guides':        'bg-blue-50 text-[#003D82] border border-blue-100',
  'Engineering Basics':   'bg-emerald-50 text-emerald-700 border border-emerald-100',
  'Marketplace Insights': 'bg-orange-50 text-[#FF6B35] border border-orange-100',
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-600 border border-gray-200'
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  // Related posts = other posts in the same category, fallback to any 2
  const related = blogPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 2)
  const otherPosts = related.length
    ? related
    : blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2)

  // JSON-LD structured data for Google
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: new Date(post.date).toISOString(),
    author: {
      '@type': 'Organization',
      name: post.author.name,
      url: 'https://www.precisionprojectflow.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Precision Project Flow',
      url: 'https://www.precisionprojectflow.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.precisionprojectflow.com/blog/${post.slug}`,
    },
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navigation />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-32 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-blue-300 text-xs mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-200 truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Category + meta */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(post.category)}`}>
              <Tag className="w-3 h-3" />{post.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-200 text-xs">
              <Clock className="w-3 h-3" />{post.readTime}
            </span>
            <span className="text-blue-300 text-xs">{formatDate(post.date)}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-blue-200 text-base leading-relaxed">
            {post.description}
          </p>
          <p className="text-blue-300 text-xs mt-4">
            By <span className="text-blue-200 font-semibold">{post.author.name}</span>
            {' · '}{post.author.title}
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 pb-24">

        {/* Back link */}
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#003D82] font-semibold transition-colors bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>

        {/* Article body */}
        <article
          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 sm:px-12 py-10 prose prose-lg max-w-none
            prose-headings:font-extrabold prose-headings:text-gray-900 prose-headings:font-jakarta
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-gray-600 prose-p:leading-relaxed
            prose-li:text-gray-600
            prose-strong:text-gray-800 prose-strong:font-bold
            prose-a:text-[#003D82] prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
            prose-ol:list-decimal prose-ul:list-disc
            prose-table:text-sm prose-thead:bg-gray-50
            prose-th:font-bold prose-th:text-gray-700 prose-th:py-3 prose-th:px-4 prose-th:text-left
            prose-td:py-3 prose-td:px-4 prose-td:text-gray-600 prose-td:border-b prose-td:border-gray-100"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* ── In-line CTA (mid-page) ── */}
        <div className="mt-10 bg-blue-50 border border-blue-100 rounded-2xl p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className="font-extrabold text-[#003D82] text-lg mb-1">Need an engineer for your project?</p>
            <p className="text-sm text-gray-600">Browse licensed engineers or post a free RFQ — get proposals within 48 hours.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href="/marketplace"
              className="px-5 py-2.5 bg-[#003D82] text-white font-bold rounded-xl hover:bg-[#002960] transition-all text-sm"
            >
              Browse Engineers
            </Link>
            <Link
              href="/rfq/create"
              className="px-5 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all text-sm"
            >
              Post RFQ
            </Link>
          </div>
        </div>

        {/* ── Related posts ── */}
        {otherPosts.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-extrabold text-gray-900 mb-5">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {otherPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group"
                >
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${getCategoryColor(p.category)}`}>
                    <Tag className="w-3 h-3" />{p.category}
                  </span>
                  <h3 className="font-extrabold text-gray-900 text-sm leading-snug mb-2 group-hover:text-[#003D82] transition-colors">
                    {p.title}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#003D82] group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom CTA ── */}
        <div className="mt-14 bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] rounded-2xl p-10 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)',
            }}
          />
          <div className="relative">
            <h2 className="text-2xl font-extrabold text-white mb-2">
              Ready to get started?
            </h2>
            <p className="text-blue-200 text-sm mb-7 max-w-md mx-auto">
              Connect with a licensed engineer on Precision Project Flow. Browse profiles, compare credentials, and get proposals — for free.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/marketplace"
                className="px-6 py-3 bg-white text-[#003D82] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg text-sm"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/rfq/create"
                className="px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg text-sm"
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
