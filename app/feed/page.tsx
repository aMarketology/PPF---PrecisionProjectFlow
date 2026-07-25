'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Heart, MessageCircle, Image as ImageIcon,
  X, Plus, Loader, Send, Briefcase, Zap, Trophy, FileText,
  ChevronDown, ChevronUp, Package, DollarSign, Clock, Award,
  MessageSquare, TrendingUp, Gavel, CheckCircle2, AlertCircle,
  Building2, UserPlus, ShoppingCart, Search, Hash,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Author {
  id: string; full_name: string; avatar_url: string | null; user_type: string; company_name?: string | null;
}

interface SiteActivity {
  id: string; activity_type: string; actor_id: string; target_type: string | null; target_id: string | null;
  summary: string; metadata: Record<string, any>; previous_hash: string | null; row_hash: string;
  created_at: string; actor: Author | null;
}

interface FeedPost {
  id: string; content: string; post_type: 'update' | 'project_showcase' | 'job_post' | 'milestone' | 'parts_request';
  media_urls: string[]; likes_count: number; comments_count: number; bids_count?: number;
  budget?: number | null; deadline?: string | null; created_at: string;
  author: Author; liked_by_me: boolean;
}

interface Bid {
  id: string; amount: number; note: string | null; status: string; created_at: string; bidder: Author;
}

const ACTIVITY_TYPES = [
  { value: 'all',                 label: 'All Activity',     icon: TrendingUp, bg: 'bg-gray-50',  text: 'text-gray-700',  border: 'border-gray-200' },
  { value: 'rfq_posted',          label: 'RFQs Posted',     icon: FileText,   bg: 'bg-blue-50',   text: 'text-blue-700',  border: 'border-blue-200' },
  { value: 'rfq_awarded',         label: 'RFQs Awarded',    icon: Award,      bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200' },
  { value: 'social_post_created', label: 'Community Posts', icon: MessageCircle,bg: 'bg-purple-50',text: 'text-purple-700',border: 'border-purple-200' },
  { value: 'order_placed',        label: 'Orders',          icon: ShoppingCart,bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { value: 'company_joined',      label: 'New Companies',   icon: Building2,  bg: 'bg-cyan-50',   text: 'text-cyan-700',  border: 'border-cyan-200' },
  { value: 'team_member_added',   label: 'Team Joins',      icon: UserPlus,   bg: 'bg-rose-50',   text: 'text-rose-700',  border: 'border-rose-200' },
] as const;

const POST_TYPES = [
  { value: 'update',           label: 'Update',        icon: FileText,  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  { value: 'project_showcase', label: 'Showcase',      icon: Trophy,    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { value: 'job_post',         label: 'Job Post',      icon: Briefcase, bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  { value: 'milestone',        label: 'Milestone',     icon: Zap,       bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  { value: 'parts_request',    label: 'Parts Request', icon: Package,   bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
] as const;

function Avatar({ author, size = 10 }: { author: Author | null; size?: number }) {
  const dim = `w-${size} h-${size}`;
  if (author?.avatar_url) {
    return <img src={author.avatar_url} alt={author.full_name} className={`${dim} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#003D82] to-[#0066C0] text-white font-bold text-sm`}>
      {author?.full_name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const conf = ACTIVITY_TYPES.find(t => t.value === type);
  if (!conf) return <FileText className="w-4 h-4" />;
  const Icon = conf.icon;
  return <Icon className="w-4 h-4" />;
}

function BidPanel({ post, currentUserId, onDM }: { post: FeedPost; currentUserId: string | null; onDM: (userId: string) => void }) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNote, setBidNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fetched, setFetched] = useState(false);

  const loadBids = async () => {
    if (fetched) return;
    setLoading(true);
    const res = await fetch(`/api/feed/${post.id}/bid`);
    const data = await res.json();
    setBids(data.bids ?? []);
    setFetched(true);
    setLoading(false);
  };

  const submitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) { toast.error('Sign in to place a bid'); return; }
    if (!bidAmount || Number(bidAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feed/${post.id}/bid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(bidAmount), note: bidNote }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const next = bids.filter(b => b.bidder?.id !== currentUserId);
      next.push(data.bid);
      next.sort((a: any, b: any) => a.amount - b.amount);
      setBids(next);
      setBidAmount(''); setBidNote('');
      toast.success('Bid placed!');
    } catch (err: any) { toast.error(err.message || 'Failed to place bid'); }
    finally { setSubmitting(false); }
  };

  const lowestBid = bids.length > 0 ? bids[0].amount : null;

  return (
    <div className="border-t border-gray-100">
      <button onClick={() => { if (!open) loadBids(); setOpen(!open); }} className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <Gavel className="w-4 h-4 text-rose-600" />
          <span className="text-sm font-semibold text-gray-800">{(post.bids_count ?? 0) > 0 ? `${post.bids_count} bid${post.bids_count !== 1 ? 's' : ''}` : 'Place a Bid'}</span>
          {lowestBid !== null && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">Low: $${lowestBid.toLocaleString()}</span>}
          {post.budget && <span className="text-xs text-gray-400">Budget: $${Number(post.budget).toLocaleString()}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-4 space-y-3">
              {currentUserId && currentUserId !== post.author.id && (
                <form onSubmit={submitBid} className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Your Bid</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input type="number" min="1" step="0.01" placeholder="Amount" value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 outline-none bg-white" />
                    </div>
                    <button type="submit" disabled={submitting || !bidAmount}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50 flex items-center gap-1.5">
                      {submitting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Gavel className="w-3.5 h-3.5" />} Bid
                    </button>
                  </div>
                  <input type="text" placeholder="Add a note" value={bidNote} onChange={e => setBidNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" />
                </form>
              )}
              {loading ? <div className="flex justify-center py-3"><Loader className="w-5 h-5 animate-spin text-gray-400" /></div>
                : bids.length === 0 ? <p className="text-sm text-gray-400 text-center py-2">No bids yet</p>
                : bids.map((bid, i) => (
                    <div key={bid.id} className={`flex items-center justify-between p-3 rounded-xl ${i === 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2.5">
                        {i === 0 && <Award className="w-3.5 h-3.5 text-emerald-600" />}
                        <Avatar author={bid.bidder} size={7} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{bid.bidder?.full_name}</p>
                          {bid.note && <p className="text-xs text-gray-500 mt-0.5">{bid.note}</p>}
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${i === 0 ? 'text-emerald-700' : 'text-gray-700'}`}>${Number(bid.amount).toLocaleString()}</span>
                    </div>
                  ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreatePostModal({ currentUser, onClose, onCreated, defaultType = 'update' }: {
  currentUser: Author; onClose: () => void; onCreated: (post: FeedPost) => void; defaultType?: FeedPost['post_type'];
}) {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<FeedPost['post_type']>(defaultType);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      const supabase = createClient();
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const ext = file.name.split('.').pop();
        const path = `${currentUser.id}/${Date.now()}.${ext}`;
        await supabase.storage.from('post-media').upload(path, file, { upsert: false });
        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path);
        mediaUrls.push(publicUrl);
      }
      const body: any = { content: content.trim(), post_type: postType, media_urls: mediaUrls };
      if (postType === 'parts_request') {
        if (budget) body.budget = Number(budget);
        if (deadline) body.deadline = deadline;
      }
      const res = await fetch('/api/feed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to post');
      const { post } = await res.json();
      onCreated({ ...post, author: currentUser, liked_by_me: false });
      toast.success('Posted!');
      onClose();
    } catch (err: any) { toast.error(err.message || 'Failed to create post'); }
    finally { setIsPosting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 font-jakarta" onClick={onClose}>
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar author={currentUser} size={10} />
            <div><p className="font-semibold text-gray-900 text-sm">{currentUser.full_name}</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.map(pt => {
              const Icon = pt.icon;
              return (
                <button key={pt.value} type="button" onClick={() => setPostType(pt.value as FeedPost['post_type'])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${postType === pt.value ? `${pt.bg} ${pt.text} ${pt.border}` : 'bg-white text-gray-500 border-gray-200'}`}>
                  <Icon className="w-3.5 h-3.5" />{pt.label}
                </button>
              );
            })}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder={postType === 'parts_request' ? 'Describe the part...' : "What's happening?"}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003D82]/30 outline-none resize-none text-sm" rows={4} maxLength={3000} autoFocus />
          {postType === 'parts_request' && (
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Budget $" value={budget} onChange={e => setBudget(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
            </div>
          )}
          {previews.length > 0 && (
            <div className={`grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {previews.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => { setMediaFiles(f => f.filter((_, idx) => idx !== i)); setPreviews(p => p.filter((_, idx) => idx !== i)); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => {
              const files = Array.from(e.target.files ?? []).slice(0, 4);
              setMediaFiles(files);
              setPreviews(files.map(f => URL.createObjectURL(f)));
            }} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="p-2 text-gray-400 hover:text-[#003D82] hover:bg-blue-50 rounded-lg"><ImageIcon className="w-5 h-5" /></button>
            <button type="submit" disabled={!content.trim() || isPosting}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl disabled:opacity-50 text-sm">
              {isPosting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ActivityCard({ activity }: { activity: SiteActivity }) {
  const getTargetLink = () => {
    if (activity.target_type === 'rfq' && activity.target_id) return `/rfq/${activity.target_id}`;
    return null;
  };
  const getIconBg = () => {
    switch (activity.activity_type) {
      case 'rfq_posted': return 'bg-blue-100 text-blue-600';
      case 'rfq_awarded': return 'bg-emerald-100 text-emerald-600';
      case 'social_post_created': return 'bg-purple-100 text-purple-600';
      case 'order_placed': return 'bg-amber-100 text-amber-600';
      case 'order_completed': return 'bg-green-100 text-green-600';
      case 'company_joined': return 'bg-cyan-100 text-cyan-600';
      case 'team_member_added': return 'bg-rose-100 text-rose-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };
  const targetLink = getTargetLink();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBg()}`}>
            <ActivityIcon type={activity.activity_type} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {activity.actor && <span className="font-semibold text-gray-900 text-sm truncate">{activity.actor.full_name}</span>}
              <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{activity.summary}</p>
            {activity.metadata?.budget && <p className="text-xs text-emerald-600 font-semibold mt-1">Budget: {activity.metadata.budget}</p>}
            {activity.metadata?.location && <p className="text-xs text-gray-500 mt-0.5">📍 {activity.metadata.location}</p>}
            {activity.metadata?.category && <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-50 text-[#003D82] text-[10px] font-semibold rounded-full">{activity.metadata.category}</span>}
          </div>
        </div>
      </div>
      <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
          <Hash className="w-3 h-3" />
          <span className="truncate max-w-[120px]" title={activity.row_hash}>{activity.row_hash.substring(0, 16)}...</span>
        </div>
        {targetLink ? (
          <Link href={targetLink} className="text-xs font-semibold text-[#003D82] hover:text-[#002960] flex items-center gap-1">View Details →</Link>
        ) : activity.target_type === 'feed_post' && activity.target_id ? (
          <span className="text-xs text-gray-400">Community post</span>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<SiteActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalActivities, setTotalActivities] = useState(0);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<Author | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: prof } = await supabase.from('profiles').select('id, full_name, avatar_url, user_type').eq('id', data.user.id).single();
        if (prof) setCurrentUser(prof);
      }
    });
    loadActivities(0, 'all', '');
    const channel = supabase.channel('sa_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_activities' }, (payload) => {
        const a = payload.new as SiteActivity;
        loadActorThenAdd(a);
      })
      .subscribe();
    realtimeRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadActorThenAdd = async (activity: SiteActivity) => {
    const supabase = createClient();
    const { data: actor } = await supabase.from('profiles').select('id, full_name, avatar_url, user_type').eq('id', activity.actor_id).single();
    setActivities(prev => [{ ...activity, actor }, ...prev]);
    setTotalActivities(prev => prev + 1);
  };

  const loadActivities = async (p: number, type: string, search: string) => {
    if (p === 0) setIsLoading(true); else setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/activities?page=${p}&type=${type}&search=${search}`);
      const data = await res.json();
      setActivities(p === 0 ? (data.activities ?? []) : prev => [...prev, ...(data.activities ?? [])]);
      setHasMore(data.hasMore ?? false);
      setTotalActivities(data.total ?? 0);
      setPage(p);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); setIsLoadingMore(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(0); loadActivities(0, filterType, searchQuery); };

  const handlePostCreated = (post: FeedPost) => {
    const newActivity: SiteActivity = {
      id: `temp-${post.id}`,
      activity_type: 'social_post_created',
      actor_id: post.author.id,
      target_type: 'feed_post',
      target_id: post.id,
      summary: post.content.substring(0, 120),
      metadata: { post_type: post.post_type },
      previous_hash: null, row_hash: '',
      created_at: new Date().toISOString(),
      actor: post.author,
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-4"><TrendingUp className="w-4 h-4 text-[#FF6B35]" /> Activity Feed</div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">What's Happening</h1>
            <p className="text-blue-200 text-lg">Real-time activity across the marketplace</p>
          </div>
          {currentUser && (
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#FF6B35]/25 text-sm flex-shrink-0">
              <Plus className="w-4 h-4" /> Post Update
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5 overflow-x-auto flex-1">
              {ACTIVITY_TYPES.map(at => {
                const Icon = at.icon;
                return (
                  <button key={at.value} onClick={() => { setFilterType(at.value); setPage(0); loadActivities(0, at.value, searchQuery); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all ${filterType === at.value ? `${at.bg} ${at.text} ${at.border}` : 'bg-white text-gray-500 border-gray-200'}`}>
                    <Icon className="w-3 h-3" />{at.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-lg ${showSearch ? 'bg-[#003D82] text-white' : 'text-gray-400 hover:bg-gray-100'}`}><Search className="w-4 h-4" /></button>
          </div>
          <AnimatePresence>
            {showSearch && (
              <motion.form onSubmit={handleSearch} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex gap-2 pt-2">
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search all activity..." autoFocus
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none" />
                  <button type="submit" className="px-4 py-2 bg-[#003D82] text-white font-semibold rounded-xl text-sm">Search</button>
                  {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); loadActivities(0, filterType, ''); }} className="text-sm text-gray-500">Clear</button>}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader className="w-8 h-8 animate-spin text-[#003D82]" />
            <p className="text-gray-400 text-sm font-medium">Loading activity feed...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-700 mb-1">No activity yet</p>
            <p className="text-sm text-gray-400 mb-4">Be the first to post or create an RFQ!</p>
            {currentUser && (
              <button onClick={() => setShowCreateModal(true)} className="px-5 py-2.5 bg-[#003D82] text-white font-semibold rounded-xl text-sm">Post Update</button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activities.map(a => <ActivityCard key={a.id} activity={a} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-6">
                <button onClick={() => loadActivities(page + 1, filterType, searchQuery)} disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-3 text-[#003D82] font-semibold hover:bg-blue-50 rounded-xl disabled:opacity-50 text-sm">
                  {isLoadingMore ? <Loader className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />} Load more
                </button>
              </div>
            )}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600">🔗 SHA256 Hash Chain Ledger</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Every platform action is cryptographically chained to the previous one. Each entry's <code className="bg-gray-200 px-1 rounded">row_hash</code> = SHA256(id + type + actor + previous_hash). Immutable and verifiable.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && currentUser && (
          <CreatePostModal currentUser={currentUser} onClose={() => setShowCreateModal(false)} onCreated={handlePostCreated} />
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}