'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Search, MapPin, Clock, DollarSign, Filter, X, ChevronRight,
  FileText, Wrench, Zap, Building2, Tag, Loader2, Package,
  ArrowUpDown, Eye, MessageSquare, Plus, AlertCircle,
} from 'lucide-react';

interface RFQ {
  id: string;
  client_id: string;
  title: string;
  category: string;
  description: string;
  quantity: string | null;
  budget: string | null;
  timeline: string | null;
  location: string | null;
  attachment_urls: string[] | null;
  status: 'open' | 'in_review' | 'awarded' | 'closed';
  created_at: string;
  updated_at: string;
  client?: { full_name: string; company_name?: string; avatar_url?: string };
}

const CATEGORIES = [
  'All',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Structural Engineering',
  'Civil Engineering',
  'HVAC Systems',
  'Plumbing & Piping',
  'Fire Protection',
  'Controls & Automation',
  'Industrial Manufacturing',
  'Material Handling',
  'Software Engineering',
  'Other',
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_review: 'bg-amber-50 text-amber-700 border-amber-200',
  awarded: 'bg-blue-50 text-blue-700 border-blue-200',
  closed: 'bg-gray-50 text-gray-500 border-gray-200',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Mechanical Engineering': <Wrench className="w-4 h-4" />,
  'Electrical Engineering': <Zap className="w-4 h-4" />,
  'Structural Engineering': <Building2 className="w-4 h-4" />,
  'Civil Engineering': <Building2 className="w-4 h-4" />,
  'HVAC Systems': <Wrench className="w-4 h-4" />,
  'Plumbing & Piping': <Wrench className="w-4 h-4" />,
  'Fire Protection': <AlertCircle className="w-4 h-4" />,
  'Controls & Automation': <Zap className="w-4 h-4" />,
  'Industrial Manufacturing': <Package className="w-4 h-4" />,
  'Material Handling': <Package className="w-4 h-4" />,
  'Software Engineering': <FileText className="w-4 h-4" />,
};

export default function RFQFeedPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [sortBy, setSortBy] = useState<'newest' | 'budget'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    loadRFQs();
  }, []);

  const loadRFQs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from('rfqs').select('*').order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data } = await query;
      if (!data) { setRfqs([]); return; }

      // Fetch client profiles
      const clientIds = Array.from(new Set(data.map(r => r.client_id)));
      const { data: profiles } = await supabase.from('profiles')
        .select('id, full_name, avatar_url, company_id')
        .in('id', clientIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch company names for clients
      const companyIds = Array.from(new Set((profiles || []).map(p => p.company_id).filter(Boolean) as string[]));
      const { data: companies } = companyIds.length > 0
        ? await supabase.from('company_profiles').select('id, company_name').in('id', companyIds as string[])
        : { data: [] };
      const companyMap = new Map(companies?.map(c => [c.id, c.company_name]) || []);

      const enriched = data.map(r => {
        const prof = profileMap.get(r.client_id);
        return {
          ...r,
          client: prof ? {
            full_name: prof.full_name,
            avatar_url: prof.avatar_url,
            company_name: prof.company_id ? companyMap.get(prof.company_id) : undefined,
          } : undefined,
        };
      });

      setRfqs(enriched);
    } catch (err) {
      console.error('loadRFQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRFQs(); }, [selectedStatus]);

  const filtered = rfqs.filter(r => {
    if (selectedCategory !== 'All' && r.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'budget') {
      const getBudgetNum = (b: string | null) => {
        if (!b) return 0;
        const match = b.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : 0;
      };
      return getBudgetNum(b.budget) - getBudgetNum(a.budget);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <Zap className="w-4 h-4 text-[#FF6B35]" />
                Live RFQ Feed
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
                Open Part Requests & Repairs
              </h1>
              <p className="text-blue-200 text-lg">
                Browse active RFQs from clients who need parts, repairs, and engineering services now.
              </p>
            </div>
            <Link href="/rfq/create"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6B35]/25 text-sm flex-shrink-0">
              <Plus className="w-4 h-4" /> Post an RFQ
            </Link>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search RFQs by keyword..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82]" />
            </div>

            {/* Status Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {['open', 'in_review', 'awarded', 'all'].map(s => (
                <button key={s} onClick={() => setSelectedStatus(s)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                    selectedStatus === s ? 'bg-white text-[#003D82] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Sort */}
            <button onClick={() => setSortBy(sortBy === 'newest' ? 'budget' : 'newest')}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortBy === 'newest' ? 'Newest' : 'Budget'}
            </button>

            {/* Category Filter */}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition-all ${
                selectedCategory !== 'All' ? 'border-[#003D82] bg-blue-50 text-[#003D82]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              <Filter className="w-3.5 h-3.5" />
              {selectedCategory !== 'All' ? selectedCategory : 'Category'}
              {selectedCategory !== 'All' && (
                <button onClick={(e) => { e.stopPropagation(); setSelectedCategory('All'); }}
                  className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
              )}
            </button>
          </div>

          {/* Category dropdown */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="flex flex-wrap gap-2 pt-3 pb-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#003D82] text-white border-[#003D82]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#003D82] hover:text-[#003D82]'
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#003D82] animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No RFQs Found</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your filters or search terms.'
                : 'No open RFQs yet. Be the first to post one!'}
            </p>
            {!searchQuery && selectedCategory === 'All' && (
              <Link href="/rfq/create"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all">
                <Plus className="w-4 h-4" /> Post the First RFQ
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((rfq, i) => (
              <motion.div key={rfq.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all overflow-hidden group">
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[rfq.status] || STATUS_COLORS.open}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${rfq.status === 'open' ? 'bg-emerald-500' : rfq.status === 'in_review' ? 'bg-amber-500' : rfq.status === 'awarded' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                      {rfq.status === 'open' ? 'Open' : rfq.status === 'in_review' ? 'In Review' : rfq.status === 'awarded' ? 'Awarded' : 'Closed'}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {CATEGORY_ICONS[rfq.category] || <FileText className="w-4 h-4" />}
                    <span className="text-xs font-medium text-[#003D82] bg-blue-50 px-2 py-0.5 rounded-full">{rfq.category}</span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 group-hover:text-[#003D82] transition-colors">
                    {rfq.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{rfq.description}</p>
                </div>

                {/* Card Meta */}
                <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 space-y-2">
                  {rfq.budget && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold text-gray-900">{rfq.budget}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {rfq.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {rfq.location}
                      </span>
                    )}
                    {rfq.timeline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {rfq.timeline}
                      </span>
                    )}
                    {rfq.quantity && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> {rfq.quantity}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-[10px]">
                      {rfq.client?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                        {rfq.client?.company_name || rfq.client?.full_name || 'Anonymous'}
                      </p>
                    </div>
                  </div>
                  <Link href={`/rfq/${rfq.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-[#003D82] hover:text-[#002960] transition-colors">
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Results count */}
        {!loading && sorted.length > 0 && (
          <p className="text-center text-sm text-gray-400 mt-8">
            Showing {sorted.length} RFQ{sorted.length !== 1 ? 's' : ''}
            {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}