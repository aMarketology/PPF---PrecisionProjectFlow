'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, MapPin, Clock, DollarSign, FileText, Tag, Package,
  Building2, User, Calendar, Loader2, MessageSquare, Send,
  ExternalLink, Paperclip, AlertCircle, CheckCircle2, Wrench, Zap,
  Shield,
} from 'lucide-react';

interface RFQ {
  id: string; client_id: string; title: string; category: string;
  description: string; quantity: string | null; budget: string | null;
  timeline: string | null; location: string | null;
  attachment_urls: string[] | null; status: string;
  created_at: string; updated_at: string;
  client?: { id: string; full_name: string; email: string; avatar_url?: string; company_name?: string };
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  open: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Open for Quotes' },
  in_review: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'In Review' },
  awarded: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Awarded' },
  closed: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Closed' },
};

export default function RFQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params?.id as string;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!rfqId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    loadRFQ();
  }, [rfqId]);

  const loadRFQ = async () => {
    try {
      const supabase = createClient();
      // Try fetching by UUID first, then fall back to slug
      const isUuid = rfqId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      let query = supabase.from('rfqs').select('*');
      if (isUuid) {
        query = query.eq('id', rfqId);
      } else {
        query = query.eq('slug', rfqId);
      }
      const { data, error } = await query.single();
      if (error || !data) { toast.error('RFQ not found'); router.push('/rfq'); return; }

      const { data: prof } = await supabase.from('profiles')
        .select('id, full_name, email, avatar_url, company_id').eq('id', data.client_id).single();

      let companyName: string | undefined;
      if (prof?.company_id) {
        const { data: comp } = await supabase.from('company_profiles')
          .select('company_name').eq('id', prof.company_id).single();
        companyName = comp?.company_name;
      }

      setRfq({ ...data, client: prof ? { ...prof, company_name: companyName } : undefined });
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(user?.id === data.client_id);
    } catch (err) { console.error('loadRFQ:', err); }
    finally { setLoading(false); }
  };

  const handleApply = () => {
    if (!currentUserId) { router.push('/login?redirect=/rfq/' + rfqId); return; }
    if (rfq?.client?.id) router.push(`/messages?with=${rfq.client.id}`);
  };

  const handleContact = () => {
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
  const canApply = !isOwner && rfq.status === 'open';

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
                {rfq.location && <span className="flex items-center gap-1 text-xs text-blue-200"><MapPin className="w-3.5 h-3.5" />{rfq.location}</span>}
              </div>
            </div>
            {canApply && (
              <button onClick={handleApply}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6B35]/25 text-sm flex-shrink-0">
                <Send className="w-4 h-4" /> Apply Now
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
            </div>
          </div>

          {/* Description + Apply CTA */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{rfq.description}</p>

            {/* Apply CTA inline */}
            {canApply && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="bg-gradient-to-br from-[#003D82] to-[#005BB5] rounded-2xl p-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1">Interested in this RFQ?</h3>
                    <p className="text-blue-200 text-sm">Send the client a direct message to discuss the project and submit your quote.</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Shield className="w-4 h-4 text-emerald-300" />
                      <span className="text-xs text-blue-200">Cross-company DMs require a token unlock (100 tokens). Same-company is free.</span>
                    </div>
                  </div>
                  <button onClick={handleApply}
                    className="flex items-center gap-2 px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg flex-shrink-0">
                    <Send className="w-4 h-4" /> Apply via DM
                  </button>
                </div>
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
                {canApply && (
                  <button onClick={handleApply}
                    className="px-4 py-2 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all text-sm flex items-center gap-1.5">
                    <Send className="w-4 h-4" /> Apply
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
  'Software Engineering': <FileText className="w-3.5 h-3.5" />,
};