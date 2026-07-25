'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import {
  Search, MapPin, Building2, ExternalLink, CheckCircle,
  ChevronDown, Filter, ArrowRight, Briefcase, Users
} from 'lucide-react';
import Link from 'next/link';

const INDUSTRIES = [
  'All Industries',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Structural Engineering',
  'Software Engineering',
  'Consulting Services',
  'Analysis & Testing',
  'Other Services',
];

const US_STATES = [
  'All States','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI',
  'MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA',
  'WA','WV','WI','WY',
];

interface Company {
  id: string;
  company_name: string;
  slug: string | null;
  industry: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  is_claimed: boolean;
  specialties: string[] | null;
  contact_name: string | null;
  contact_title: string | null;
}

function CompaniesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [industry, setIndustry] = useState(searchParams.get('industry') || 'All Industries');
  const [state, setState] = useState(searchParams.get('state') || 'All States');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  const fetchCompanies = useCallback(async (reset = true) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);

    let q = supabase
      .from('company_profiles')
      .select('id,company_name,slug,industry,description,city,state,website,email,phone,is_claimed,specialties,contact_name,contact_title', { count: 'exact' })
      .order('company_name', { ascending: true })
      .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

    if (query.trim()) {
      q = q.or(`company_name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%,city.ilike.%${query.trim()}%`);
    }
    if (industry !== 'All Industries') q = q.eq('industry', industry);
    if (state !== 'All States') q = q.eq('state', state);

    const { data, error, count } = await q;
    if (!error) {
      setCompanies(reset ? (data || []) : prev => [...prev, ...(data || [])]);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [query, industry, state, page, supabase]);

  useEffect(() => { fetchCompanies(true); }, [query, industry, state]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);

    let q = supabase
      .from('company_profiles')
      .select('id,company_name,slug,industry,description,city,state,website,email,phone,is_claimed,specialties,contact_name,contact_title')
      .order('company_name', { ascending: true })
      .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);

    if (query.trim()) q = q.or(`company_name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%,city.ilike.%${query.trim()}%`);
    if (industry !== 'All Industries') q = q.eq('industry', industry);
    if (state !== 'All States') q = q.eq('state', state);

    const { data } = await q;
    setCompanies(prev => [...prev, ...(data || [])]);
    setLoading(false);
  };

  const industryColor: Record<string, string> = {
    'Mechanical Engineering': 'bg-blue-50 text-blue-700 border-blue-200',
    'Electrical Engineering': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Structural Engineering': 'bg-orange-50 text-orange-700 border-orange-200',
    'Software Engineering': 'bg-purple-50 text-purple-700 border-purple-200',
    'Consulting Services': 'bg-teal-50 text-teal-700 border-teal-200',
    'Analysis & Testing': 'bg-rose-50 text-rose-700 border-rose-200',
    'Other Services': 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const hasMore = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <Building2 className="w-4 h-4" />
            Engineering Company Directory
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Find & Connect With<br />
            <span className="text-[#FF6B35]">Engineering Companies</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
            Browse {total.toLocaleString()}+ engineering companies across the US. Own one? Claim your listing for free.
          </p>

          <div className="flex items-center justify-center gap-3 mb-8">
            <Link href="/companies/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-[#FF6B35]/25">
              <Building2 className="w-4 h-4" /> Create Your Company
            </Link>
          </div>
        </div>
      </section>

      {/* Filters + Stats bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {/* Industry filter */}
            <div className="relative">
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 pr-7 text-sm font-medium text-gray-700 focus:outline-none focus:border-[#003D82] cursor-pointer"
              >
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            {/* State filter */}
            <div className="relative">
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 pr-7 text-sm font-medium text-gray-700 focus:outline-none focus:border-[#003D82] cursor-pointer"
              >
                {US_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            {(industry !== 'All Industries' || state !== 'All States' || query) && (
              <button
                onClick={() => { setQuery(''); setIndustry('All Industries'); setState('All States'); }}
                className="text-xs text-[#003D82] hover:underline font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {loading ? 'Loading...' : `${total.toLocaleString()} companies`}
          </p>
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading && companies.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No companies found</p>
            <button onClick={() => { setQuery(''); setIndustry('All Industries'); setState('All States'); }}
              className="mt-3 text-[#003D82] text-sm hover:underline">Clear filters</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {companies.map(company => {
                const initials = company.company_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                const colorClass = industryColor[company.industry || ''] || industryColor['Other Services'];
                return (
                  <div key={company.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col group">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      {/* Logo placeholder */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight truncate group-hover:text-[#003D82] transition-colors">
                          {company.company_name}
                        </h3>
                        {(company.city || company.state) && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {[company.city, company.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      {company.is_claimed && (
                        <div title="Claimed" className="shrink-0">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                    </div>

                    {/* Industry pill */}
                    {company.industry && (
                      <span className={`self-start text-xs font-semibold rounded-full px-2.5 py-1 border mb-3 ${colorClass}`}>
                        {company.industry}
                      </span>
                    )}

                    {/* Description */}
                    {company.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
                        {company.description}
                      </p>
                    )}

                    {/* Specialties */}
                    {company.specialties && company.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {company.specialties.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 rounded-full px-2 py-0.5">{s}</span>
                        ))}
                      </div>
                    )}

                    {/* Contact info */}
                    {company.contact_name && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                        <Users className="w-3 h-3" />
                        {company.contact_name}{company.contact_title ? ` · ${company.contact_title}` : ''}
                      </p>
                    )}

                    {/* Footer CTAs */}
                    <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50">
                      {company.is_claimed ? (
                        <Link
                          href={`/companies/${company.slug || company.id}`}
                          className="flex-1 text-center text-xs font-semibold bg-[#003D82] hover:bg-[#002960] text-white rounded-xl py-2 transition-colors flex items-center justify-center gap-1"
                        >
                          View Profile <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <>
                          <Link
                            href={`/claim-company?id=${company.id}&name=${encodeURIComponent(company.company_name)}`}
                            className="flex-1 text-center text-xs font-semibold bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-xl py-2 transition-colors flex items-center justify-center gap-1"
                          >
                            <Briefcase className="w-3 h-3" /> Claim This
                          </Link>
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl py-2 transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-white border border-gray-200 hover:border-[#003D82] text-gray-700 hover:text-[#003D82] font-semibold rounded-xl px-8 py-3 transition-all shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Loading...' : `Load more (${total - companies.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense>
      <CompaniesInner />
    </Suspense>
  );
}
