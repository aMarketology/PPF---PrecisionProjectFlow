'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, MapPin, Clock, DollarSign, FileText, Tag, Package,
  Building2, User, Calendar, Loader2, MessageSquare, Send,
  ExternalLink, Paperclip, AlertCircle, CheckCircle2, Wrench, Zap,
  Shield, Coins, Gavel, XCircle, CheckCircle, Eye, TrendingUp,
  ChevronDown, ChevronUp, Plus, Info,
} from 'lucide-react';

interface RFQ {
  id: string; client_id: string; title: string; category: string;
  description: string; quantity: string | null; budget: string | null;
  timeline: string | null; location: string | null; material: string | null;
  attachment_urls: string[] | null; status: string;
  rfq_type?: string; nda_required?: boolean; is_asap?: boolean;
  inventory_status: string | null; lead_time_days: number | null; estimated_ship_date: string | null;
  line_items?: LineItem[] | null;
  created_at: string; updated_at: string;
  client?: { id: string; full_name: string; email: string; avatar_url?: string; company_name?: string };
}

interface LineItem {
  part: string;
  qty: number | null;
  material: string | null;
  tolerance: string | null;
  finish: string | null;
  notes: string | null;
}

interface Offer {
  id: string; rfq_id: string; vendor_id: string;
  amount: number; note: string | null; delivery_days: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string; updated_at: string;
  vendor?: { id: string; full_name: string; avatar_url?: string; company_name?: string };
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  open: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Open for Quotes' },
  in_review: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'In Review' },
  awarded: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Awarded' },
  closed: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Closed' },
};

const OFFER_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-50', label: 'Pending' },
  accepted: { color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Accepted' },
  rejected: { color: 'text-red-700', bg: 'bg-red-50', label: 'Rejected' },
  withdrawn: { color: 'text-gray-500', bg: 'bg-gray-50', label: 'Withdrawn' },
};

export default function RFQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params?.id as string;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [sameCompanyCheck, setSameCompanyCheck] = useState(false);

  // Offer form state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [offerDelivery, setOfferDelivery] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Accept/reject state
  const [actionOfferId, setActionOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!rfqId) return;
    init();
  }, [rfqId]);

  const init = async () => {
    console.log('🔵 [init] Starting...');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log('   user:', user ? `${user.email} (${user.id})` : 'NOT LOGGED IN');
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles')
        .select('user_type, token_balance').eq('id', user.id).single();
      console.log('   profile:', profile ? `type=${profile.user_type}, tokens=${profile.token_balance}` : 'NOT FOUND');
      setCurrentUserType(profile?.user_type ?? null);
      setTokenBalance(profile?.token_balance ?? 0);
    }
    await loadRFQ();
    await loadOffers();
  };

  const loadRFQ = async () => {
    try {
      // Use API route (service_role) to bypass RLS for unauthenticated visitors
      const isUuid = rfqId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      const param = isUuid ? `id=${rfqId}` : `slug=${rfqId}`;
      const res = await fetch(`/api/rfq/detail?${param}`);
      
      if (!res.ok) {
        if (res.status === 404) { toast.error('RFQ not found'); router.push('/rfq'); return; }
        throw new Error('Failed to fetch');
      }
      
      const data = await res.json();
      if (!data || data.error) { toast.error('RFQ not found'); router.push('/rfq'); return; }

      // Redirect UUID URLs to slug URLs for clean canonical URLs
      if (isUuid && data.slug) {
        router.replace(`/rfq/${data.slug}`);
        return;
      }

      setRfq(data);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(user?.id === data.client_id);

      // Check if the current user is in the same company as the RFQ poster
      if (user && user.id !== data.client_id) {
        const { data: sameCompany } = await supabase.rpc('same_company', {
          user_a: user.id,
          user_b: data.client_id,
        });
        setSameCompanyCheck(sameCompany === true);
      }
    } catch (err) { console.error('loadRFQ:', err); }
    finally { setLoading(false); }
  };

  const loadOffers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rfq_offers')
        .select('*')
        .eq('rfq_id', rfqId)
        .order('created_at', { ascending: false });

      if (error) { console.error('loadOffers:', error); return; }
      if (!data) { setOffers([]); return; }

      // Fetch vendor profiles
      const vendorIds = Array.from(new Set(data.map(o => o.vendor_id)));
      const { data: vendors } = await supabase.from('profiles')
        .select('id, full_name, avatar_url, company_id').in('id', vendorIds);
      const vendorMap = new Map(vendors?.map(v => [v.id, v]) || []);

      // Fetch company names
      const companyIds = Array.from(new Set((vendors || []).map(v => v.company_id).filter(Boolean))) as string[];
      const { data: companies } = companyIds.length > 0
        ? await supabase.from('company_profiles').select('id, company_name').in('id', companyIds)
        : { data: [] };
      const companyMap = new Map(companies?.map(c => [c.id, c.company_name]) || []);

      const enriched = data.map(o => {
        const v = vendorMap.get(o.vendor_id);
        return {
          ...o,
          vendor: v ? {
            id: v.id, full_name: v.full_name, avatar_url: v.avatar_url,
            company_name: v.company_id ? companyMap.get(v.company_id) : undefined,
          } : undefined,
        };
      });

      setOffers(enriched);
    } catch (err) { console.error('loadOffers:', err); }
  };

  const handleSubmitOffer = async () => {
    console.log('🔴 [handleSubmitOffer] FIRED');
    console.log('   currentUserId:', currentUserId);
    console.log('   rfqId:', rfqId);
    console.log('   offerAmount:', offerAmount);
    console.log('   tokenBalance:', tokenBalance);
    console.log('   isEngineer:', currentUserType === 'engineer');
    console.log('   isOwner:', isOwner);
    console.log('   rfq.status:', rfq?.status);

    if (!currentUserId) {
      console.log('   ❌ No currentUserId — redirecting to login');
      router.push('/login?redirect=/rfq/' + rfqId);
      return;
    }
    if (!offerAmount || isNaN(Number(offerAmount)) || Number(offerAmount) <= 0) {
      console.log('   ❌ Invalid offer amount');
      toast.error('Please enter a valid amount');
      return;
    }

    console.log('   ✅ Validation passed, calling API...');
    setSubmittingOffer(true);
    try {
      const payload = {
        rfqId,
        amount: Number(offerAmount),
        note: offerNote || null,
        deliveryDays: offerDelivery ? Number(offerDelivery) : null,
      };
      console.log('   📤 POST /api/rfq/offer payload:', JSON.stringify(payload));

      const res = await fetch('/api/rfq/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('   📥 Response status:', res.status);
      const json = await res.json();
      console.log('   📥 Response body:', JSON.stringify(json));

      if (!res.ok) throw new Error(json.error || 'Failed to submit offer');

      toast.success('Offer submitted! 50 tokens spent.');
      setShowOfferForm(false);
      setOfferAmount('');
      setOfferNote('');
      setOfferDelivery('');
      setOfferStartDate('');
      setTokenBalance(prev => prev - 50);
      await loadOffers();
    } catch (err: any) {
      console.error('   ❌ Offer submit error:', err.message);
      toast.error(err.message);
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setActionOfferId(offerId);
    try {
      const res = await fetch('/api/rfq/offer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, action: 'accept' }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to accept offer');

      toast.success('Offer accepted! Conversation unlocked.');
      await loadRFQ();
      await loadOffers();
      if (json.conversationId) {
        router.push(`/messages?conversation=${json.conversationId}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setActionOfferId(offerId);
    try {
      const res = await fetch('/api/rfq/offer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, action: 'reject' }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reject offer');

      toast.success('Offer rejected.');
      await loadOffers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionOfferId(null);
    }
  };

  const handleWithdrawOffer = async (offerId: string) => {
    try {
      const res = await fetch(`/api/rfq/offer?offerId=${offerId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to withdraw');
      toast.success('Offer withdrawn.');
      await loadOffers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleContact = () => {
    if (!currentUserId) { router.push('/login?redirect=/rfq/' + rfqId); return; }
    if (rfq?.client?.id) router.push(`/messages?with=${rfq.client.id}`);
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

  if (!rfq) return null;

  const status = STATUS_CONFIG[rfq.status] || STATUS_CONFIG.open;
  // Any user can see the Submit Offer button UNLESS they own the RFQ or are in the same company.
  // Not-logged-in visitors are redirected to login by the /submit page.
  const isSameCompany = sameCompanyCheck;
  const myPendingOffer = offers.find(o => o.vendor_id === currentUserId && o.status === 'pending');
  const hasAcceptedOffer = offers.some(o => o.status === 'accepted');
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const acceptedOffer = offers.find(o => o.status === 'accepted');

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <Link href="/rfq" className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to RFQ Marketplace
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.bg} ${status.color} ${status.border}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />{status.label}
                </span>
                <span className="text-blue-200 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{rfq.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-blue-200">{CATEGORY_ICONS[rfq.category] || <FileText className="w-3.5 h-3.5" />}{rfq.category}</span>
                {rfq.rfq_type && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    rfq.rfq_type === 'product'
                      ? 'bg-purple-500/20 text-purple-200 border-purple-400/30'
                      : 'bg-sky-500/20 text-sky-200 border-sky-400/30'
                  }`}>
                    {rfq.rfq_type === 'product' ? <Package className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {rfq.rfq_type === 'product' ? 'Product' : 'Service'}
                  </span>
                )}
                {rfq.location && <span className="flex items-center gap-1 text-xs text-blue-200"><MapPin className="w-3.5 h-3.5" />{rfq.location}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {rfq.nda_required && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full text-[11px] font-semibold">
                    <Shield className="w-3 h-3" /> NDA Required
                  </span>
                )}
                {rfq.is_asap && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-500/20 text-orange-200 border border-orange-400/30 rounded-full text-[11px] font-semibold">
                    <Zap className="w-3 h-3" /> ASAP / Next Day Air
                  </span>
                )}
              </div>
            </div>
            {!isOwner && !isSameCompany && rfq.status === 'open' && !myPendingOffer && (
              <Link href={`/rfq/${rfqId}/submit`}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6B35]/25 text-sm flex-shrink-0">
                <Gavel className="w-4 h-4" /> Submit Offer
              </Link>
            )}
            {isOwner && (
              <button
                onClick={() => document.getElementById('offers-section')?.scrollIntoView({ behavior: 'smooth' })}
                disabled={pendingOffers.length === 0}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                  pendingOffers.length > 0
                    ? 'bg-white text-[#003D82] hover:bg-blue-50 shadow-lg'
                    : 'bg-white/20 text-white/50 border border-white/30 cursor-not-allowed'
                }`}
              >
                <Gavel className="w-4 h-4" />
                {pendingOffers.length > 0
                  ? `View Proposals (${pendingOffers.length})`
                  : 'No Proposals Yet'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          {/* Budget + Timeline Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {rfq.budget && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Budget</p>
                  <p className="text-xl font-bold text-gray-900">{rfq.budget}</p>
                </div>
              )}
              {rfq.timeline && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Timeline</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{rfq.timeline}</p>
                </div>
              )}
              {rfq.location && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Location</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{rfq.location}</p>
                </div>
              )}
              {rfq.quantity && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Quantity</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><Package className="w-3.5 h-3.5 text-gray-400" />{rfq.quantity}</p>
                </div>
              )}
              {rfq.material && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Material</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><Tag className="w-3.5 h-3.5 text-gray-400" />{rfq.material}</p>
                </div>
              )}
              {rfq.inventory_status && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Inventory</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    rfq.inventory_status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' :
                    rfq.inventory_status === 'out_of_stock' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {rfq.inventory_status === 'in_stock' ? '🟢 In Stock' :
                     rfq.inventory_status === 'out_of_stock' ? '🔴 Out of Stock' : '🟡 Back Order'}
                  </span>
                </div>
              )}
              {rfq.lead_time_days && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Lead Time</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />{rfq.lead_time_days} days</p>
                </div>
              )}
              {rfq.estimated_ship_date && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Est. Ship Date</p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{new Date(rfq.estimated_ship_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {rfq.nda_required && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-semibold">
                  <Shield className="w-3 h-3" /> NDA Required
                </span>
              )}
              {rfq.is_asap && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-[11px] font-semibold">
                  <Zap className="w-3 h-3" /> ASAP / Next Day Air
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{rfq.description}</p>
          </div>

          {/* ── Line Items / Parts List ── */}
          {rfq.line_items && rfq.line_items.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#003D82]" />
                  Line Items / Parts List
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#003D82] border border-blue-200 rounded-full text-xs font-semibold">
                  <Package className="w-3.5 h-3.5" />
                  {rfq.line_items.length} {rfq.line_items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Part</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Qty</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Material</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Tolerance</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Finish</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rfq.line_items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.part}</td>
                        <td className="px-4 py-3 text-gray-700">{item.qty || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{item.material || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs">{item.tolerance || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{item.finish || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── OFFER SUBMISSION FORM ── */}
          <AnimatePresence>
            {showOfferForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-2xl border-2 border-[#FF6B35] shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <Gavel className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white">Submit Your Offer</h2>
                          <p className="text-sm text-orange-100">Send your proposal to the client</p>
                        </div>
                      </div>
                      <button onClick={() => setShowOfferForm(false)} className="text-white/80 hover:text-white transition-colors">
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* ── RFQ Summary Card ── */}
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">RFQ Requirements</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium">Budget</p>
                          <p className="text-sm font-bold text-gray-900">{rfq.budget || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium">Timeline</p>
                          <p className="text-sm font-semibold text-gray-900">{rfq.timeline || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium">Category</p>
                          <p className="text-sm font-semibold text-gray-900">{rfq.category}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium">Location</p>
                          <p className="text-sm font-semibold text-gray-900">{rfq.location || 'N/A'}</p>
                        </div>
                        {rfq.quantity && (
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium">Quantity</p>
                            <p className="text-sm font-semibold text-gray-900">{rfq.quantity}</p>
                          </div>
                        )}
                        {rfq.material && (
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium">Material / Specs</p>
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{rfq.material}</p>
                          </div>
                        )}
                        {rfq.inventory_status && (
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium">Inventory Status</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              rfq.inventory_status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' :
                              rfq.inventory_status === 'out_of_stock' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {rfq.inventory_status === 'in_stock' ? '🟢 In Stock' :
                               rfq.inventory_status === 'out_of_stock' ? '🔴 Out of Stock' : '🟡 Back Order'}
                            </span>
                          </div>
                        )}
                        {rfq.lead_time_days && (
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium">Required Lead Time</p>
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" />{rfq.lead_time_days} days</p>
                          </div>
                        )}
                        {rfq.estimated_ship_date && (
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium">Required Ship Date</p>
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{new Date(rfq.estimated_ship_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        )}
                      </div>
                      {rfq.description && (
                        <p className="text-xs text-gray-500 mt-3 line-clamp-3 italic leading-relaxed">
                          &ldquo;{rfq.description}&rdquo;
                        </p>
                      )}
                      {rfq.attachment_urls && rfq.attachment_urls.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-[10px] text-gray-400 font-medium mb-1.5 flex items-center gap-1"><Paperclip className="w-3 h-3" />Attached Files ({rfq.attachment_urls.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rfq.attachment_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-[#003D82] hover:bg-blue-50 transition-colors">
                                <FileText className="w-3 h-3" /> File {i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Token Cost Notice ── */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Coins className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-amber-900">This offer costs 50 tokens to submit</p>
                        <p className="text-xs text-amber-700">
                          Your balance: <span className="font-bold">{tokenBalance.toLocaleString()} tokens</span>
                          {tokenBalance < 50 && (
                            <span className="ml-2 text-red-600 font-semibold">— Insufficient! <Link href="/tokens" className="underline">Buy tokens</Link></span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-amber-600">50</span>
                        <span className="text-xs text-amber-500 block leading-tight">tokens</span>
                      </div>
                    </div>

                    {/* ── Form Fields ── */}
                    <div className="space-y-5">
                      {/* Offer Amount */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          <DollarSign className="w-4 h-4 inline mr-1 text-[#FF6B35]" />
                          Your Offer Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <span className="text-gray-400 font-bold text-lg">$</span>
                          </div>
                          <input
                            type="number"
                            value={offerAmount}
                            onChange={e => setOfferAmount(e.target.value)}
                            placeholder="0.00"
                            min="1"
                            step="0.01"
                            className="w-full pl-10 pr-4 py-4 text-2xl font-extrabold text-gray-900 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 outline-none transition-all"
                          />
                        </div>
                        {rfq.budget && (
                          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Client budget: <span className="font-semibold text-gray-700">{rfq.budget}</span>
                          </p>
                        )}
                      </div>

                      {/* Delivery + Timeline side by side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            <Clock className="w-4 h-4 inline mr-1 text-[#FF6B35]" />
                            Estimated Delivery
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={offerDelivery}
                              onChange={e => setOfferDelivery(e.target.value)}
                              placeholder="14"
                              min="1"
                              className="w-full px-4 py-3.5 pr-16 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 outline-none transition-all font-semibold"
                            />
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm text-gray-400 font-medium">days</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1 text-[#FF6B35]" />
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={offerStartDate}
                            onChange={e => setOfferStartDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 outline-none transition-all text-gray-700 font-semibold"
                          />
                        </div>
                      </div>

                      {/* Note to Client */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          <MessageSquare className="w-4 h-4 inline mr-1 text-[#FF6B35]" />
                          Note to Client
                        </label>
                        <textarea
                          value={offerNote}
                          onChange={e => setOfferNote(e.target.value)}
                          placeholder="Describe your approach, relevant experience, materials you'll use, and why you're the best fit for this project..."
                          rows={4}
                          className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 outline-none transition-all resize-none text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          A detailed note increases your chances of being selected by {rfq.client?.full_name || 'the client'}
                        </p>
                      </div>
                    </div>

                    {/* ── Submit Button ── */}
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 font-medium">By submitting, you agree to:</p>
                          <ul className="text-[11px] text-gray-400 mt-1 space-y-0.5">
                            <li>• 50 tokens will be deducted from your wallet</li>
                            <li>• Your offer is binding for 30 days</li>
                            <li>• You can withdraw your offer anytime</li>
                          </ul>
                        </div>
                        <button
                          onClick={handleSubmitOffer}
                          disabled={submittingOffer || tokenBalance < 50 || !offerAmount}
                          className="flex items-center gap-2 px-8 py-3.5 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6B35]/25 whitespace-nowrap"
                        >
                          {submittingOffer ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                          ) : tokenBalance < 50 ? (
                            <><Coins className="w-5 h-5" /> Insufficient Tokens</>
                          ) : (
                            <><Send className="w-5 h-5" /> Submit Offer — 50 Tokens</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── OFFERS SECTION ── */}
          <div id="offers-section" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#003D82]" />
                {isOwner ? 'Proposals' : 'Offers'}
                <span className="text-sm font-normal text-gray-400">({offers.length})</span>
              </h2>
            </div>

            {offers.length === 0 ? (
              <div className="text-center py-8">
                <Gavel className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No {isOwner ? 'proposals' : 'offers'} yet</p>
                <p className="text-sm text-gray-400">Be the first to submit an offer on this RFQ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map(offer => {
                  const os = OFFER_STATUS[offer.status] || OFFER_STATUS.pending;
                  const isMyOffer = offer.vendor_id === currentUserId;
                  const isAccepted = offer.status === 'accepted';

                  return (
                    <motion.div key={offer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border p-4 transition-all ${isAccepted ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {offer.vendor?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900">{offer.vendor?.full_name || 'Unknown'}</p>
                              {offer.vendor?.company_name && (
                                <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{offer.vendor.company_name}</span>
                              )}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${os.bg} ${os.color}`}>
                                {os.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm">
                              <span className="font-bold text-[#003D82] text-lg">${offer.amount.toLocaleString()}</span>
                              {offer.delivery_days && (
                                <span className="text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{offer.delivery_days} days</span>
                              )}
                              <span className="text-gray-400 text-xs">{formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}</span>
                            </div>
                            {offer.note && (
                              <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3">{offer.note}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isOwner && offer.status === 'pending' && (
                            <>
                              <button onClick={() => handleAcceptOffer(offer.id)} disabled={actionOfferId === offer.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1 disabled:opacity-50">
                                {actionOfferId === offer.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Accept
                              </button>
                              <button onClick={() => handleRejectOffer(offer.id)} disabled={actionOfferId === offer.id}
                                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 disabled:opacity-50">
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          {isMyOffer && offer.status === 'pending' && (
                            <button onClick={() => handleWithdrawOffer(offer.id)}
                              className="px-3 py-1.5 border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 text-xs font-semibold rounded-lg transition-all">
                              Withdraw
                            </button>
                          )}
                          {isAccepted && (
                            <Link href={`/messages?with=${offer.vendor_id}`}
                              className="px-3 py-1.5 bg-[#003D82] hover:bg-[#002960] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> Message
                            </Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attachments */}
          {rfq.attachment_urls && rfq.attachment_urls.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Attachments</h2>
              <div className="space-y-2">
                {rfq.attachment_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Paperclip className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-[#003D82] font-medium">Attachment {i + 1}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Client & Actions Footer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-lg">
                  {rfq.client?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{rfq.client?.full_name || 'Anonymous'}</p>
                  {rfq.client?.company_name && (
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{rfq.client.company_name}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!isOwner && (
                  <button onClick={handleContact}
                    className="px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" /> Message
                  </button>
                )}
                {!isOwner && !isSameCompany && rfq.status === 'open' && !myPendingOffer && (
                  <Link href={`/rfq/${rfqId}/submit`}
                    className="px-4 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all text-sm flex items-center gap-1.5">
                    <Gavel className="w-4 h-4" /> Submit Offer
                  </Link>
                )}
                {isOwner && (
                  <button
                    onClick={() => document.getElementById('offers-section')?.scrollIntoView({ behavior: 'smooth' })}
                    disabled={pendingOffers.length === 0}
                    className={`px-4 py-2 rounded-xl transition-all text-sm flex items-center gap-1.5 font-bold ${
                      pendingOffers.length > 0
                        ? 'bg-[#003D82] hover:bg-[#002960] text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Gavel className="w-4 h-4" />
                    {pendingOffers.length > 0
                      ? `View Proposals (${pendingOffers.length})`
                      : 'No Proposals Yet'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'CNC Machining': <Wrench className="w-3.5 h-3.5" />,
  'Industrial Parts & Replacement': <Package className="w-3.5 h-3.5" />,
  'Sheet Metal & Fabrication': <Wrench className="w-3.5 h-3.5" />,
  '3D Printing / Additive Manufacturing': <Package className="w-3.5 h-3.5" />,
  'Injection Molding & Tooling': <Package className="w-3.5 h-3.5" />,
  'Electrical & Controls': <Zap className="w-3.5 h-3.5" />,
  'Welding & Assembly': <Wrench className="w-3.5 h-3.5" />,
  'Quality & Inspection': <Eye className="w-3.5 h-3.5" />,
  'Mechanical Engineering': <Wrench className="w-3.5 h-3.5" />,
  'Electrical Engineering': <Zap className="w-3.5 h-3.5" />,
  'Structural Engineering': <Building2 className="w-3.5 h-3.5" />,
  'Civil Engineering': <Building2 className="w-3.5 h-3.5" />,
  'HVAC Systems': <Wrench className="w-3.5 h-3.5" />,
  'Plumbing & Piping': <Wrench className="w-3.5 h-3.5" />,
  'Fire Protection': <AlertCircle className="w-3.5 h-3.5" />,
  'Controls & Automation': <Zap className="w-3.5 h-3.5" />,
  'Industrial Manufacturing': <Package className="w-3.5 h-3.5" />,
  'Material Handling': <Package className="w-3.5 h-3.5" />,
};