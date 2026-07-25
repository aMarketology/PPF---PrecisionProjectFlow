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
      const { data, error } = await supabase.from('rfqs').select('*').eq('id', rfqId).single();
      if (error || !data) { toast.error('RFQ not found'); router.push('/rfq/feed'); return; }

      // Fetch client profile
      const { data: prof } = await supabase.from('profiles')
        .select('id, full_name, email, avatar_url, company_id').eq('id', data.client_id).single();

      let companyName: string | undefined;
      if (prof?.company_id) {
        const { data: comp } = await supabase.from('company_profiles')
          .select('company_name').eq('id', prof.company_id).single();
        companyName = comp?.company_name;
      }

      setRfq({
        ...data,
        client: prof ? { ...prof, company_name: companyName } : undefined,
      });

      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(user?.id === data.client_id);
    } catch (err) {
      console.error('loadRFQ:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClient = () => {
    if (!rfq?.client?.id) return;
    router.push(`/messages?with=${rfq.client.id}`);
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

  const status = STATUS_CONFIG[rfq.status] || STATUS_CONFIG.open;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <Link href="/rfq/feed" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Feed
          </Link>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">{rfq.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.color} ${status.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${rfq.status === 'open' ? 'bg-emerald-500' : rfq.status === 'in_review' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  {status.label}
                </span>
                <span className="text-blue-200 text-sm flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Posted {formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            {!isOwner && rfq.status === 'open' && (
              <button onClick={handleMessageClient}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6B35]/25 text-sm">
                <MessageSquare className="w-4 h-4" /> Message Client
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{rfq.description}</p>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Client Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Posted By</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-lg">
                  {rfq.client?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{rfq.client?.full_name || 'Anonymous'}</p>
                  {rfq.client?.company_name && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> {rfq.client.company_name}
                    </p>
                  )}
                </div>
              </div>
              {!isOwner && (
                <button onClick={handleMessageClient}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all text-sm">
                  <MessageSquare className="w-4 h-4" /> Contact Client
                </button>
              )}
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">RFQ Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500">Category:</span>
                  <span className="font-semibold text-gray-900">{rfq.category}</span>
                </div>
                {rfq.budget && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Budget:</span>
                    <span className="font-semibold text-gray-900">{rfq.budget}</span>
                  </div>
                )}
                {rfq.timeline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Timeline:</span>
                    <span className="font-semibold text-gray-900">{rfq.timeline}</span>
                  </div>
                )}
                {rfq.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Location:</span>
                    <span className="font-semibold text-gray-900">{rfq.location}</span>
                  </div>
                )}
                {rfq.quantity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Quantity:</span>
                    <span className="font-semibold text-gray-900">{rfq.quantity}</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA for engineers */}
            {rfq.status === 'open' && !isOwner && (
              <div className="bg-gradient-to-br from-[#003D82] to-[#005BB5] rounded-2xl p-5 text-white">
                <h3 className="font-bold mb-2">Interested in this RFQ?</h3>
                <p className="text-blue-100 text-sm mb-4">Message the client directly to discuss the project and submit your quote.</p>
                <button onClick={handleMessageClient}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#003D82] font-bold rounded-xl hover:bg-blue-50 transition-all text-sm">
                  <Send className="w-4 h-4" /> Send a Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}