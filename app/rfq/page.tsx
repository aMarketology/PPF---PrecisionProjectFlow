'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Search, MapPin, Clock, DollarSign, Filter, X, ChevronRight,
  FileText, Wrench, Zap, Building2, Tag, Loader2, Package,
  ArrowUpDown, MessageSquare, Plus, AlertCircle, Send,
  BarChart3, TrendingUp, Users, Layers,
} from 'lucide-react';

interface RFQ {
  id: string;
  slug?: string | null;
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
  client?: { id: string; full_name: string; company_name?: string; avatar_url?: string };
}

const CATEGORIES = [
  'All', 'Mechanical Engineering', 'Electrical Engineering', 'Structural Engineering',
  'Civil Engineering', 'HVAC Systems', 'Plumbing & Piping', 'Fire Protection',
  'Controls & Automation', 'Industrial Manufacturing', 'Material Handling', 'Software Engineering', 'Other',
];

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  in_review: 'bg-amber-100 text-amber-800 border-amber-300',
  awarded: 'bg-blue-100 text-blue-800 border-blue-300',
  closed: 'bg-gray-100 text-gray-500 border-gray-300',
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

export default function RFQMarketplacePage() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [sortBy, setSortBy] = useState<'newest' | 'budget'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [totalRFQs, setTotalRFQs] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    loadRFQs();
  }, []);

  const loadRFQs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from('rfqs').select('*').order('created_at', { ascending: false });
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      const { data } = await query;
      if (!data) { setRfqs([]); return; }

      const clientIds = Array.from(new Set(data.map(r => r.client_id)));
      const { data: profiles } = await supabase.from('profiles')
        .select('id, full_name, avatar_url, company_id').in('id', clientIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const companyIds = Array.from(new Set((profiles || []).map(p => p.company_id).filter(Boolean))) as string[];
      const { data: companies } = companyIds.length > 0
        ? await supabase.from('company_profiles').select('id, company_name').in('id', companyIds)
        : { data: [] };
      const companyMap = new Map(companies?.map(c => [c.id, c.company_name]) || []);

      const enriched = data.map(r => {
        const prof = profileMap.get(r.client_id);
        return { ...r, client: prof ? { id: prof.id, full_name: prof.full_name, avatar_url: prof.avatar_url, company_name: prof.company_id ? companyMap.get(prof.company_id) : undefined } : undefined };
      });
      setRfqs(enriched);
      setTotalRFQs(data.length);
    } catch (err) { console.error('loadRFQs:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRFQs(); }, [selectedStatus]);

  const handleApply = (rfq: RFQ) => {
    if (!currentUserId) { router.push('/login?redirect=/rfq'); return; }
    if (rfq.client?.id) router.push(`/messages?with=${rfq.client.id}`);
  };

  const filtered = rfqs.filter(r => {
    if (selectedCategory !== 'All' && r.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q) || r.budget?.toLowerCase().includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'budget') {
      const getNum = (b: string | null) => { if (!b) return 0; const m = b.match(/[\d,]+/); return m ? parseInt(m[0].replace(/,/g, '')) : 0; };
      return getNum(b.budget) - getNum(a.budget);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const openCount = rfqs.filter(r => r.status === 'open').length;
  // Calculate earliest and latest budget ranges
  const budgetNumbers = rfqs.map(r => { const m = r.budget?.match(/[\d,]+/); return m ? parseInt(m[0].replace(/,/g, '')) : 0; }).filter(Boolean);
  const maxBudget = budgetNumbers.length ? Math.max(...budgetNumbers) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Slim Hero */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-20 pb-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><FileText className="w-5 h-5 text-[#FF6B35]" /></div>
              <div><h1 className="text-xl md:text-2xl font-extrabold text-white">RFQ Marketplace</h1><p className="text-blue-200 text-xs">{openCount} open · {totalRFQs} total</p></div>
            </div>
            <Link href="/rfq/create" className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg text-sm flex-shrink-0">
              <Plus className="w-4 h-4" /> Post an RFQ
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 outline-none" />
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {['open', 'in_review', 'awarded', 'all'].map(s => (
                <button key={s} onClick={() => setSelectedStatus(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all capitalize ${selectedStatus === s ? 'bg-white text-[#003D82] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-2.5 py-1 border rounded-lg text-xs font-semibold transition-all ${selectedCategory !== 'All' ? 'border-[#003D82] bg-blue-50 text-[#003D82]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Filter className="w-3 h-3" />{selectedCategory !== 'All' ? selectedCategory : 'Category'}
              {selectedCategory !== 'All' && <button onClick={e => { e.stopPropagation(); setSelectedCategory('All'); }} className="ml-1 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>}
            </button>
            <button onClick={() => setSortBy(sortBy === 'newest' ? 'budget' : 'newest')}
              className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <ArrowUpDown className="w-3 h-3" />{sortBy === 'newest' ? 'Newest' : 'Budget'}
            </button>
            <span className="text-xs text-gray-400 font-mono ml-auto">{sorted.length} RFQ{sorted.length !== 1 ? 's' : ''}</span>
          </div>
          {/* Category dropdown */}
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
              <div className="flex flex-wrap gap-1.5 pt-2 pb-1 border-t border-gray-50 mt-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${selectedCategory === cat ? 'bg-[#003D82] text-white border-[#003D82]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#003D82]'}`}>{cat}</button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content: Linear Feed + Right Panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* LEFT: Linear RFQ Feed */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#003D82] animate-spin" /></div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="font-semibold text-gray-700 mb-1">No RFQs found</p>
                <p className="text-sm text-gray-400 mb-4">{searchQuery || selectedCategory !== 'All' ? 'Try adjusting filters' : 'Be the first to post!'}</p>
                <Link href="/rfq/create" className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white font-semibold rounded-xl text-sm hover:bg-[#E55A2B]">
                  <Plus className="w-4 h-4" /> Post an RFQ
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map((rfq, i) => (
                  <LinearRFQCard key={rfq.id} rfq={rfq} i={i} currentUserId={currentUserId} onApply={handleApply} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Dashboard Panel */}
          <div className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {/* Stats Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Marketplace Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /><span className="text-sm text-gray-600">Total RFQs</span></div>
                    <span className="font-bold text-gray-900 text-sm">{totalRFQs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-sm text-gray-600">Open</span></div>
                    <span className="font-bold text-emerald-600 text-sm">{openCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-500" /><span className="text-sm text-gray-600">In Review</span></div>
                    <span className="font-bold text-amber-600 text-sm">{rfqs.filter(r => r.status === 'in_review').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-purple-500" /><span className="text-sm text-gray-600">Highest Budget</span></div>
                    <span className="font-bold text-gray-900 text-sm">${maxBudget.toLocaleString()}+</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Link href="/rfq/create"
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl transition-all text-sm">
                    <Plus className="w-4 h-4" /> Post a New RFQ
                  </Link>
                  <Link href="/feed"
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl transition-all text-sm">
                    <TrendingUp className="w-4 h-4" /> View Activity Feed
                  </Link>
                  <Link href="/messages"
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl transition-all text-sm">
                    <MessageSquare className="w-4 h-4" /> Open Messages
                  </Link>
                </div>
              </div>

              {/* Categories Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Categories</h3>
                <div className="space-y-1.5">
                  {CATEGORIES.filter(c => c !== 'All').slice(0, 8).map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setSelectedStatus('all'); }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCategory === cat ? 'bg-blue-50 text-[#003D82]' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {CATEGORY_ICONS[cat] || <FileText className="w-3.5 h-3.5" />}
                      <span className="truncate">{cat}</span>
                      <span className="ml-auto text-[10px] text-gray-400">{rfqs.filter(r => r.category === cat).length}</span>
                    </button>
                  ))}
                  {selectedCategory !== 'All' && CATEGORIES.filter(c => c !== 'All' && c !== selectedCategory).length > 8 && (
                    <button onClick={() => setSelectedCategory('All')} className="w-full text-xs text-[#003D82] font-semibold hover:underline">Show all categories →</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function LinearRFQCard({ rfq, i, currentUserId, onApply }: { rfq: RFQ; i: number; currentUserId: string | null; onApply: (rfq: RFQ) => void }) {
  const isOwn = rfq.client_id === currentUserId;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Left: Status + Avatar */}
          <div className="flex flex-col items-center gap-2 min-w-[56px]">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-sm">
              {rfq.client?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[rfq.status]}`}>
              {rfq.status === 'open' ? 'Open' : rfq.status === 'in_review' ? 'Review' : rfq.status === 'awarded' ? 'Awarded' : 'Closed'}
            </span>
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-900">{rfq.client?.company_name || rfq.client?.full_name || 'Anonymous'}</span>
              <span className="text-xs text-gray-400">{rfq.client?.company_name ? '' : ''}</span>
              <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}</span>
            </div>
            <Link href={`/rfq/${rfq.slug || rfq.id}`}>
              <h3 className="font-bold text-gray-900 text-base hover:text-[#003D82] transition-colors">{rfq.title}</h3>
            </Link>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">{rfq.description}</p>

            {/* Meta Tags */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {CATEGORY_ICONS[rfq.category] || <FileText className="w-3 h-3" />}
                {rfq.category}
              </span>
              {rfq.location && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />{rfq.location}
                </span>
              )}
              {rfq.timeline && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />{rfq.timeline}
                </span>
              )}
              {rfq.quantity && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Package className="w-3 h-3" />Qty: {rfq.quantity}
                </span>
              )}
            </div>
          </div>

          {/* Right: Budget + Actions */}
          <div className="flex flex-col items-end gap-2 min-w-[120px] flex-shrink-0">
            {rfq.budget && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Budget</p>
                <p className="font-bold text-gray-900 text-lg leading-tight">{rfq.budget}</p>
              </div>
            )}
            <div className="flex gap-1.5">
              <Link href={`/rfq/${rfq.slug || rfq.id}`}
                className="px-3 py-1.5 text-xs font-semibold text-[#003D82] border border-gray-200 hover:bg-blue-50 rounded-lg transition-colors">
                Details
              </Link>
              {!isOwn && rfq.status === 'open' && (
                <button onClick={() => onApply(rfq)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#003D82] hover:bg-[#002960] text-white rounded-lg transition-colors flex items-center gap-1">
                  <Send className="w-3 h-3" /> Apply
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
