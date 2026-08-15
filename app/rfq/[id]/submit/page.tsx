'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Clock, DollarSign, FileText, Tag, Package,
  Building2, Calendar, Loader2, MessageSquare, Send,
  AlertCircle, CheckCircle2, Wrench, Zap,
  Shield, Coins, Gavel, Info, TrendingUp, Phone, User, Mail,
} from 'lucide-react';

interface RFQ {
  id: string; client_id: string; title: string; category: string;
  description: string; quantity: string | null; budget: string | null;
  timeline: string | null; location: string | null; material: string | null;
  status: string; nda_required?: boolean; is_asap?: boolean;
  inventory_status: string | null; lead_time_days: number | null;
  estimated_ship_date: string | null;
  line_items?: { part: string; qty: number | null; material: string | null; tolerance: string | null; finish: string | null; notes: string | null }[] | null;
  client?: { id: string; full_name: string; company_name?: string };
}

export default function SubmitOfferPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params?.id as string;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [userType, setUserType] = useState<string | null>(null);

  // Form state
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [offerDelivery, setOfferDelivery] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [lineItemPrices, setLineItemPrices] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedOfferId, setSubmittedOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!rfqId) return;
    init();
  }, [rfqId]);

  const init = async () => {
    console.log('🔵 [SubmitOfferPage] init');
    const supabase = createClient();

    // Auth
    const { data: { user } } = await supabase.auth.getUser();
    console.log('   user:', user ? `${user.email} (${user.id})` : 'NOT LOGGED IN');
    if (!user) {
      toast.error('Please log in to submit an offer');
      router.push(`/login?redirect=/rfq/${rfqId}/submit`);
      return;
    }
    setCurrentUserId(user.id);

    // Profile
    const { data: profile } = await supabase.from('profiles')
      .select('user_type, token_balance, full_name, company_id').eq('id', user.id).single();
    console.log('   profile:', profile ? `type=${profile.user_type}, tokens=${profile.token_balance}` : 'NOT FOUND');
    setUserType(profile?.user_type ?? null);
    setTokenBalance(profile?.token_balance ?? 0);
    setContactName(profile?.full_name || '');
    setPhoneNumber('');  // phone column doesn't exist yet — leave blank for manual entry

    // Pre-fill company name
    if (profile?.company_id) {
      const { data: comp } = await supabase.from('company_profiles')
        .select('company_name').eq('id', profile.company_id).single();
      if (comp) setCompanyName(comp.company_name);
    }

    // Load RFQ
    const isUuid = rfqId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    const param = isUuid ? `id=${rfqId}` : `slug=${rfqId}`;
    const res = await fetch(`/api/rfq/detail?${param}`);
    if (!res.ok) { toast.error('RFQ not found'); router.push('/rfq'); return; }
    const data = await res.json();
    if (!data || data.error) { toast.error('RFQ not found'); router.push('/rfq'); return; }
    setRfq(data);

    // Block: owner or same company
    if (user.id === data.client_id) {
      toast.error('You cannot bid on your own RFQ');
      router.push(`/rfq/${rfqId}`);
      return;
    }
    const { data: sameCompany } = await supabase.rpc('same_company', {
      user_a: user.id,
      user_b: data.client_id,
    });
    if (sameCompany === true) {
      toast.error('You cannot bid on an RFQ from your own company');
      router.push(`/rfq/${rfqId}`);
      return;
    }

    // Check if already has pending offer
    const { data: existing } = await supabase.from('rfq_offers')
      .select('id').eq('rfq_id', data.id).eq('vendor_id', user.id).eq('status', 'pending').limit(1);
    if (existing && existing.length > 0) {
      toast('You already have a pending offer on this RFQ');
      router.push(`/rfq/${rfqId}`);
      return;
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    console.log('🔴 [SubmitOfferPage] handleSubmit');
    setSubmitError(null);
    if (!offerAmount || isNaN(Number(offerAmount)) || Number(offerAmount) <= 0) {
      const message = 'Enter a valid total offer amount greater than $0.';
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      // Build a detailed note from all fields
      let detailedNote = '';
      if (companyName) detailedNote += `Company: ${companyName}\n`;
      if (contactName) detailedNote += `Contact: ${contactName}\n`;
      if (phoneNumber) detailedNote += `Phone: ${phoneNumber}\n`;
      if (offerDelivery) detailedNote += `Delivery: ${offerDelivery} days\n`;
      
      // Per-part pricing
      if (rfq?.line_items && Object.keys(lineItemPrices).length > 0) {
        detailedNote += '\nPer-Part Pricing:\n';
        rfq.line_items.forEach((item, i) => {
          const price = lineItemPrices[i];
          if (price) detailedNote += `  ${item.part}: $${Number(price).toLocaleString()}\n`;
        });
      }
      
      if (offerNote) detailedNote += `\nAdditional Notes:\n${offerNote}`;

      const payload = {
        rfqId: rfq?.id || rfqId,  // Use resolved UUID, fallback to URL param
        amount: Number(offerAmount),
        note: detailedNote || null,
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

      setSubmitted(true);
      setSubmittedOfferId(json.offerId);
      toast.success('Offer submitted! 50 tokens spent.');
    } catch (err: any) {
      console.error('   ❌ Submit error:', err.message);
      const message = err.message || 'The offer could not be submitted.';
      setSubmitError(message);
      toast.error(message, { duration: 7000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!rfq) return null;

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-20 sm:py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-12 text-center"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">Offer Submitted!</h1>
            <p className="text-gray-500 mb-2">
              Your offer of <span className="font-bold text-gray-900">${Number(offerAmount).toLocaleString()}</span> has been sent to the client.
            </p>
            <p className="text-sm text-gray-400 mb-8">
              50 tokens were deducted from your wallet. The client will review your offer and respond.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/rfq/${rfqId}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to RFQ
              </Link>
              <Link
                href="/dashboard/engineer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 hover:border-[#003D82] text-gray-700 font-semibold rounded-xl transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <Link href={`/rfq/${rfqId}`} className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to RFQ
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Submit Your Offer</h1>
          <p className="text-blue-200 text-sm mt-1">{rfq.title}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* RFQ Summary */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#003D82]" />
              RFQ Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 font-medium">Budget</p>
                <p className="font-bold text-gray-900">{rfq.budget || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Timeline</p>
                <p className="font-semibold text-gray-900">{rfq.timeline || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Category</p>
                <p className="font-semibold text-gray-900">{rfq.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Location</p>
                <p className="font-semibold text-gray-900">{rfq.location || 'N/A'}</p>
              </div>
              {rfq.quantity && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Quantity</p>
                  <p className="font-semibold text-gray-900">{rfq.quantity}</p>
                </div>
              )}
              {rfq.material && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Material</p>
                  <p className="font-semibold text-gray-900">{rfq.material}</p>
                </div>
              )}
            </div>
            {rfq.description && (
              <p className="text-xs text-gray-500 mt-4 line-clamp-3 italic leading-relaxed">
                &ldquo;{rfq.description}&rdquo;
              </p>
            )}
          </div>

          {/* Line Items (if any) */}
          {rfq.line_items && rfq.line_items.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#003D82]" />
                Parts to Quote
              </h2>
              <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Part</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Qty</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Material</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Tolerance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rfq.line_items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-gray-900">{item.part}</td>
                        <td className="px-3 py-2 text-gray-700">{item.qty || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{item.material || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 font-mono text-xs">{item.tolerance || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 sm:hidden">
                {rfq.line_items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">{item.part}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 border border-gray-200">Qty {item.qty || '—'}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">Material</span><p className="font-medium text-gray-700 break-words">{item.material || '—'}</p></div>
                      <div><span className="text-gray-400">Tolerance</span><p className="font-mono text-gray-700 break-words">{item.tolerance || '—'}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offer Form */}
          <div className="bg-white rounded-2xl border-2 border-[#FF6B35] shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gavel className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Your Offer</h2>
                  <p className="text-sm text-orange-100">50 tokens will be deducted when you submit</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Token balance */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900">Cost: 50 tokens</p>
                  <p className="text-xs text-amber-700">
                    Your balance: <span className="font-bold">{tokenBalance.toLocaleString()} tokens</span>
                    {tokenBalance < 50 && (
                      <span className="ml-2 text-red-600 font-semibold">
                        — Insufficient! <Link href="/tokens" className="underline">Buy tokens</Link>
                      </span>
                    )}
                  </p>
                </div>
                <div className="hidden sm:block text-right">
                  <span className="text-2xl font-black text-amber-600">50</span>
                  <span className="text-xs text-amber-500 block leading-tight">tokens</span>
                </div>
              </div>

              {/* ── Contact Information ── */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" /> Your Contact Information
                </h3>
                <p className="text-xs text-blue-500 mb-3">Optional details shared with the RFQ poster. Only your offer amount is required.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">
                      <User className="w-3 h-3 inline mr-1" /> Contact Name <span className="font-normal text-blue-400">(optional)</span>
                    </label>
                    <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                      placeholder="Your full name" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">
                      <Building2 className="w-3 h-3 inline mr-1" /> Company <span className="font-normal text-blue-400">(optional)</span>
                    </label>
                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                      placeholder="Your company name" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">
                      <Phone className="w-3 h-3 inline mr-1" /> Phone Number <span className="font-normal text-blue-400">(optional)</span>
                    </label>
                    <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="(555) 123-4567" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">
                      <Mail className="w-3 h-3 inline mr-1" /> Email
                    </label>
                    <input type="email" value="" disabled
                      placeholder="Your account email (auto-filled)" className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-50/50 text-sm text-gray-400" />
                  </div>
                </div>
              </div>

              {/* ── Total Offer Amount ── */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1 text-[#FF6B35]" />
                  Total Offer Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-gray-400 font-bold text-lg">$</span>
                  </div>
                  <input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
                    placeholder="0.00" min="1" step="0.01"
                    className="w-full pl-10 pr-4 py-4 text-2xl font-extrabold text-gray-900 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 outline-none transition-all" />
                </div>
                {rfq.budget && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Client budget: <span className="font-semibold text-gray-700">{rfq.budget}</span>
                  </p>
                )}
              </div>

              {/* ── Per-Part Pricing (if line items exist) ── */}
              {rfq.line_items && rfq.line_items.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Package className="w-4 h-4 inline mr-1 text-[#FF6B35]" />
                    Per-Part Pricing (optional)
                  </label>
                  <div className="space-y-2">
                    {rfq.line_items.map((item, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{item.part}</p>
                          <p className="text-[10px] text-gray-400">Qty: {item.qty || '—'} · {item.material || '—'}</p>
                        </div>
                        <div className="relative w-full sm:w-32 flex-shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" value={lineItemPrices[i] || ''}
                            onChange={e => setLineItemPrices(prev => ({ ...prev, [i]: e.target.value }))}
                            placeholder="0.00" min="0" step="0.01"
                            className="w-full pl-6 pr-2 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 outline-none bg-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Delivery ── */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1 text-[#FF6B35]" />
                  Estimated Delivery (days)
                </label>
                <div className="relative">
                  <input type="number" value={offerDelivery} onChange={e => setOfferDelivery(e.target.value)}
                    placeholder="14" min="1"
                    className="w-full px-4 py-3.5 pr-16 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 outline-none transition-all font-semibold" />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm text-gray-400 font-medium">days</span>
                </div>
              </div>

              {/* ── Note ── */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1 text-[#FF6B35]" />
                  Additional Notes
                </label>
                <textarea value={offerNote} onChange={e => setOfferNote(e.target.value)}
                  placeholder="Describe your approach, relevant experience, materials, certifications, and why you're the best fit..."
                  rows={4}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 outline-none transition-all resize-none text-sm" />
              </div>

              {/* ── Submit ── */}
              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Offer could not be submitted</p>
                      <p className="mt-1 text-sm text-red-700">{submitError}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium">By submitting, you agree to:</p>
                    <ul className="text-[11px] text-gray-400 mt-1 space-y-0.5">
                      <li>• 50 tokens will be deducted from your wallet</li>
                      <li>• Your offer is binding for 30 days</li>
                      <li>• You can withdraw your offer anytime</li>
                    </ul>
                  </div>
                  <button type="button" onClick={handleSubmit}
                    disabled={submitting || tokenBalance < 50 || !offerAmount}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 sm:px-8 py-3.5 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold rounded-xl transition-all shadow-lg shadow-[#FF6B35]/25 sm:whitespace-nowrap">
                    {submitting ? (
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
        </div>
      </div>

      <Footer />
    </div>
  );
}