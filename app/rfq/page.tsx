'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Layers, Grid3X3, List,
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
  client?: { id: string; full_name: string; company_name?: string; avatar_url?: string };
}

const CATEGORIES = [
  'All', 'Mechanical Engineering', 'Electrical Engineering', 'Structural Engineering',
  'Civil Engineering', 'HVAC Systems', 'Plumbing & Piping', 'Fire Protection',
  'Controls & Automation', 'Industrial Manufacturing', 'Material Handling', 'Software Engineering', 'Other',
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-[#FF6B35]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">RFQ Marketplace</h1>
                <p className="text-blue-200 text-sm">{sorted.length} open request{sorted.length !== 1 ? 's' : ''} for quotes</p>
              </div>
            </div>
            <Link href="/rfq/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6B35]/25 text-sm flex-shrink-0">
              <Plus className="w-4 h-4" /> Post an RFQ
            </Link>
          </div>
          <div className="mt-5 relative max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search RFQs by keyword, category, or location..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-0 text-sm focus:ring-2 focus:ring-[#FF6B35]/50 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {['open', 'in_review', 'awarded', 'all'].map(s => (
                <button key={s} onClick={() => setSelectedStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${selectedStatus === s ? 'bg-white text-[#003D82] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all ${selectedCategory !== 'All' ? 'border-[#003D82] bg-blue-50 text-[#003D82]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Filter className="w-3.5 h-3.5" />{selectedCategory !== 'All' ? selectedCategory : 'Category'}
              {selectedCategory !== 'All' && <button onClick={e => { e.stopPropagation(); setSelectedCategory('All'); }} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>}
            </button>
            <button onClick={() => setSortBy(sortBy === 'newest' ? 'budget' : 'newest')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <ArrowUpDown className="w-3.5 h-3.5" />{sortBy === 'newest' ? 'Newest' : 'Budget'}
            </button>
            <div className="flex bg-gray-100 rounded-lg p-0.5 ml-auto">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400'}`}><Grid3X3 className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
            </div>
            <span className="text-xs text-gray-400 font-mono">{sorted.length} RFQs</span>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${selectedCategory === cat ? 'bg-[#003D82] text-white border-[#003D82]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#003D82]'}`}>{cat}</button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#003D82] animate-spin" /></div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No RFQs Found</h2>
            <p className="text-gray-500 mb-6">{searchQuery || selectedCategory !== 'All' ? 'Try adjusting your filters.' : 'Be the first to post an RFQ!'}</p>
            <Link href="/rfq/create" className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF6B35] text-white font-bold rounded-xl hover:bg-[#E55A2B] transition-all">
              <Plus className="w-4 h-4" /> Post an RFQ
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((rfq, i) => (
              <RFQCard key={rfq.id} rfq={rfq} i={i} currentUserId={currentUserId} onApply={handleApply} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((rfq, i) => (
              <RFQListCard key={rfq.id} rfq={rfq} i={i} currentUserId={currentUserId} onApply={handleApply} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function RFQCard({ rfq, i, currentUserId, onApply }: { rfq: RFQ; i: number; currentUserId: string | null; onApply: (rfq: RFQ) => void }) {
  const isOwn = rfq.client_id === currentUserId;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all overflow-hidden group flex flex-col">
      <div className="p-5 pb-3 flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[rfq.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${rfq.status === 'open' ? 'bg-emerald-500' : rfq.status === 'in_review' ? 'bg-amber-500' : rfq.status === 'awarded' ? 'bg-blue-500' : 'bg-gray-400'}`} />
            {rfq.status === 'open' ? 'Open' : rfq.status === 'in_review' ? 'In Review' : rfq.status === 'awarded' ? 'Awarded' : 'Closed'}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          {CATEGORY_ICONS[rfq.category] || <FileText className="w-4 h-4" />}
          <span className="text-xs font-medium text-[#003D82] bg-blue-50 px-2 py-0.5 rounded-full">{rfq.category}</span>
        </div>
        <Link href={`/rfq/${rfq.id}`}>
          <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 group-hover:text-[#003D82] transition-colors">{rfq.title}</h3>
        </Link>
        <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{rfq.description}</p>
      </div>
      <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 space-y-2">
        {rfq.budget && <div className="flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" /><span className="font-semibold text-gray-900">{rfq.budget}</span></div>}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {rfq.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{rfq.location}</span>}
          {rfq.timeline && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{rfq.timeline}</span>}
          {rfq.quantity && <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{rfq.quantity}</span>}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-[10px]">{rfq.client?.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
          <p className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{rfq.client?.company_name || rfq.client?.full_name || 'Anonymous'}</p>
        </div>
        <div className="flex gap-1">
          <Link href={`/rfq/${rfq.id}`} className="px-3 py-1.5 text-xs font-semibold text-[#003D82] hover:bg-blue-50 rounded-lg transition-colors">Details</Link>
          {!isOwn && rfq.status === 'open' && (
            <button onClick={() => onApply(rfq)}
              className="px-3 py-1.5 text-xs font-semibold bg-[#003D82] hover:bg-[#002960] text-white rounded-lg transition-colors flex items-center gap-1">
              <Send className="w-3 h-3" /> Apply
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RFQListCard({ rfq, i, currentUserId, onApply }: { rfq: RFQ; i: number; currentUserId: string | null; onApply: (rfq: RFQ) => void }) {
  const isOwn = rfq.client_id === currentUserId;
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[rfq.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${rfq.status === 'open' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{rfq.status}
          </span>
          <span className="text-[10px] text-gray-400">{CATEGORY_ICONS[rfq.category]} {rfq.category}</span>
          <span className="text-[10px] text-gray-400"><Clock className="w-3 h-3 inline" /> {formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}</span>
        </div>
        <Link href={`/rfq/${rfq.id}`}>
          <h3 className="font-bold text-gray-900 text-sm truncate hover:text-[#003D82]">{rfq.title}</h3>
        </Link>
        <p className="text-xs text-gray-500 truncate mt-0.5">{rfq.description}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {rfq.budget && <span className="font-bold text-gray-900 text-sm">{rfq.budget}</span>}
        {rfq.location && <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{rfq.location}</span>}
        <Link href={`/rfq/${rfq.id}`} className="px-3 py-1.5 text-xs font-semibold text-[#003D82] hover:bg-blue-50 rounded-lg transition-colors">Details</Link>
        {!isOwn && rfq.status === 'open' && (
          <button onClick={() => onApply(rfq)} className="px-3 py-1.5 text-xs font-semibold bg-[#003D82] hover:bg-[#002960] text-white rounded-lg transition-colors flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Apply via DM
          </button>
        )}
      </div>
    </motion.div>
  );
}
