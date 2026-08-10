'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { Layers, Briefcase, FileText, Package, Plus, Eye, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Listing {
  id: string;
  title?: string;
  name?: string;
  category?: string;
  price?: number;
  status?: string;
  active?: boolean;
  is_active?: boolean;
  created_at: string;
}

export default function MyListingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Listing[]>([]);
  const [products, setProducts] = useState<Listing[]>([]);
  const [rfqs, setRfqs] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'services' | 'products' | 'rfqs'>('all');

  useEffect(() => {
    fetch('/api/my-listings')
      .then(r => { if (r.status === 401) { router.push('/login'); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        setServices(data.services || []);
        setProducts(data.products || []);
        setRfqs(data.rfqs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const tabItems = (() => {
    const all: (Listing & { _type: string })[] = [
      ...services.map(s => ({ ...s, _type: 'service', title: s.title, name: s.title })),
      ...products.map(p => ({ ...p, _type: 'product', title: p.name, name: p.name })),
      ...rfqs.map(r => ({ ...r, _type: 'rfq', title: r.title, name: r.title })),
    ];
    
    switch (activeTab) {
      case 'services': return services.map(s => ({ ...s, _type: 'service', title: s.title, name: s.title }));
      case 'products': return products.map(p => ({ ...p, _type: 'product', title: p.name, name: p.name }));
      case 'rfqs': return rfqs.map(r => ({ ...r, _type: 'rfq', title: r.title, name: r.title }));
      default: return all;
    }
  })();

  const getStatusColor = (item: any) => {
    if (item._type === 'rfq') {
      return item.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
             item.status === 'in_review' ? 'bg-amber-100 text-amber-700' :
             item.status === 'awarded' ? 'bg-blue-100 text-blue-700' :
             'bg-gray-100 text-gray-700';
    }
    return (item.active ?? item.is_active) !== false
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-gray-100 text-gray-500';
  };

  const getStatusLabel = (item: any) => {
    if (item._type === 'rfq') return item.status?.replace('_', ' ');
    return (item.active ?? item.is_active) !== false ? 'Active' : 'Inactive';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.1) 40px,rgba(255,255,255,0.1) 41px)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">My Listings</h1>
              <p className="text-blue-200 text-sm">Services · Products · RFQs — all in one place</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0">
            {(['all', 'services', 'products', 'rfqs'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors capitalize ${
                  activeTab === tab ? 'border-[#003D82] text-[#003D82]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'all' ? 'All' : tab}
                <span className="ml-1.5 text-xs text-gray-400">
                  ({tab === 'all' ? services.length + products.length + rfqs.length :
                    tab === 'services' ? services.length : tab === 'products' ? products.length : rfqs.length})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {tabItems.length === 0 ? (
          <div className="text-center py-20">
            <Layers className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No listings yet</h2>
            <p className="text-gray-500 mb-6">Create your first listing to get started</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/services/create" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-colors text-sm">
                <Plus className="w-4 h-4" /> Create Service
              </Link>
              <Link href="/rfq/create" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl transition-colors text-sm">
                <FileText className="w-4 h-4" /> Post RFQ
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tabItems.map((item: any) => (
              <motion.div key={`${item._type}-${item.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-gray-200 transition-all group">
                {/* Type badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    item._type === 'service' ? 'bg-blue-50 text-blue-700' :
                    item._type === 'product' ? 'bg-purple-50 text-purple-700' :
                    'bg-orange-50 text-[#FF6B35]'
                  }`}>
                    {item._type === 'service' ? <Briefcase className="w-3 h-3" /> :
                     item._type === 'product' ? <Package className="w-3 h-3" /> :
                     <FileText className="w-3 h-3" />}
                    {item._type === 'service' ? 'Service' : item._type === 'product' ? 'Product' : 'RFQ'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(item)}`}>
                    {getStatusLabel(item)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-[#003D82] transition-colors">
                  {item.name || item.title}
                </h3>

                {/* Details */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  {item.category && <span className="bg-gray-100 px-2 py-0.5 rounded">{item.category}</span>}
                  {item.price && <span className="font-semibold text-gray-700">${Number(item.price).toLocaleString()}</span>}
                  <span className="ml-auto text-gray-400">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                </div>

                {/* Link */}
                <Link
                  href={
                    item._type === 'rfq' ? `/rfq/${item.id}` :
                    item._type === 'product' ? `/products/${item.id}` :
                    `/marketplace/service/${item.id}`
                  }
                  className="inline-flex items-center gap-1 text-xs text-[#003D82] hover:text-[#FF6B35] font-semibold transition-colors"
                >
                  View <Eye className="w-3 h-3" /> <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Quick actions footer */}
        {tabItems.length > 0 && (
          <div className="mt-12 flex gap-3 justify-center flex-wrap">
            <Link href="/services/create" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-colors text-sm">
              <Plus className="w-4 h-4" /> Create Service
            </Link>
            <Link href="/rfq/create" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl transition-colors text-sm">
              <FileText className="w-4 h-4" /> Post RFQ
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}