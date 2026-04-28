'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Heart, MessageCircle, Image as ImageIcon,
  X, Plus, Loader, Send, Briefcase, Zap, Trophy, FileText,
  ChevronDown, ChevronUp, Package, DollarSign, Clock, Award,
  MessageSquare, TrendingUp, Gavel, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Author {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: string;
  company_name?: string | null;
}

interface FeedPost {
  id: string;
  content: string;
  post_type: 'update' | 'project_showcase' | 'job_post' | 'milestone' | 'parts_request';
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  bids_count?: number;
  budget?: number | null;
  deadline?: string | null;
  created_at: string;
  author: Author;
  liked_by_me: boolean;
}

interface Bid {
  id: string;
  amount: number;
  note: string | null;
  status: string;
  created_at: string;
  bidder: Author;
}

// ─── Post type config ─────────────────────────────────────────────────────────
const POST_TYPES = [
  { value: 'update',           label: 'Update',        icon: FileText,  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  { value: 'project_showcase', label: 'Showcase',      icon: Trophy,    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { value: 'job_post',         label: 'Job Post',      icon: Briefcase, bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  { value: 'milestone',        label: 'Milestone',     icon: Zap,       bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  { value: 'parts_request',    label: 'Parts Request', icon: Package,   bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200'   },
] as const;

function getTypeConf(type: string) {
  return POST_TYPES.find(t => t.value === type) ?? POST_TYPES[0];
}

// ─── Shared Avatar component ──────────────────────────────────────────────────
function Avatar({ author, size = 10 }: { author: Author; size?: number }) {
  const dim = `w-${size} h-${size}`;
  if (author?.avatar_url) {
    return <img src={author.avatar_url} alt={author.full_name} className={`${dim} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#003D82] to-[#0066C0] text-white font-bold text-sm`}>
      {author?.full_name?.charAt(0)?.toUpperCase() || 'U'}
    </div>
  );
}

// ─── Bid Panel ────────────────────────────────────────────────────────────────
function BidPanel({ post, currentUserId, onDM }: {
  post: FeedPost;
  currentUserId: string | null;
  onDM: (userId: string) => void;
}) {
  const [bids, setBids]             = useState<Bid[]>([]);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [bidAmount, setBidAmount]   = useState('');
  const [bidNote, setBidNote]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fetched, setFetched]       = useState(false);

  const loadBids = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    const res = await fetch(`/api/feed/${post.id}/bid`);
    const data = await res.json();
    setBids(data.bids ?? []);
    setFetched(true);
    setLoading(false);
  }, [post.id, fetched]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadBids();
  };

  const submitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) { toast.error('Sign in to place a bid'); return; }
    if (!bidAmount || Number(bidAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feed/${post.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(bidAmount), note: bidNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBids(prev => {
        const idx = prev.findIndex(b => b.bidder?.id === currentUserId);
        const next = idx >= 0 ? prev.map((b, i) => i === idx ? data.bid : b) : [...prev, data.bid];
        return next.sort((a, b) => a.amount - b.amount);
      });
      setBidAmount('');
      setBidNote('');
      toast.success('Bid placed!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place bid');
    } finally {
      setSubmitting(false);
    }
  };

  const lowestBid = bids.length > 0 ? bids[0].amount : null;

  return (
    <div className="border-t border-gray-100">
      <button onClick={handleToggle} className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <Gavel className="w-4 h-4 text-rose-600" />
          <span className="text-sm font-semibold text-gray-800">
            {(post.bids_count ?? 0) > 0 ? `${post.bids_count} bid${post.bids_count !== 1 ? 's' : ''}` : 'Place a Bid'}
          </span>
          {lowestBid !== null && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
              Low: ${lowestBid.toLocaleString()}
            </span>
          )}
          {post.budget && (
            <span className="text-xs text-gray-400">Budget: ${Number(post.budget).toLocaleString()}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-3">
              {currentUserId && currentUserId !== post.author.id && (
                <form onSubmit={submitBid} className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Your Bid</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" min="1" step="0.01" placeholder="Amount"
                        value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none bg-white"
                      />
                    </div>
                    <button type="submit" disabled={submitting || !bidAmount}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-1.5">
                      {submitting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Gavel className="w-3.5 h-3.5" />}
                      Bid
                    </button>
                  </div>
                  <input type="text" placeholder="Add a note — e.g. 'Can deliver in 48hrs, based in TX'"
                    value={bidNote} onChange={e => setBidNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 outline-none bg-white"
                  />
                </form>
              )}
              {loading ? (
                <div className="flex justify-center py-3"><Loader className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : bids.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">No bids yet — be the first!</p>
              ) : (
                <div className="space-y-2">
                  {bids.map((bid, i) => (
                    <div key={bid.id} className={`flex items-center justify-between p-3 rounded-xl ${i === 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2.5">
                        {i === 0 && <Award className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                        <Avatar author={bid.bidder} size={7} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{bid.bidder?.full_name}</p>
                          {bid.note && <p className="text-xs text-gray-500 mt-0.5">{bid.note}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${i === 0 ? 'text-emerald-700' : 'text-gray-700'}`}>
                          ${Number(bid.amount).toLocaleString()}
                        </span>
                        {currentUserId === post.author.id && (
                          <button onClick={() => onDM(bid.bidder.id)}
                            className="p-1.5 text-[#003D82] hover:bg-blue-50 rounded-lg transition-colors" title="Message bidder">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create post modal ────────────────────────────────────────────────────────
function CreatePostModal({
  currentUser,
  onClose,
  onCreated,
  defaultType = 'update',
}: {
  currentUser: Author;
  onClose: () => void;
  onCreated: (post: FeedPost) => void;
  defaultType?: FeedPost['post_type'];
}) {
  const [content, setContent]       = useState('');
  const [postType, setPostType]     = useState<FeedPost['post_type']>(defaultType);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews]     = useState<string[]>([]);
  const [budget, setBudget]         = useState('');
  const [deadline, setDeadline]     = useState('');
  const [isPosting, setIsPosting]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    setMediaFiles(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    setMediaFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      const supabase = createClient();
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const ext  = file.name.split('.').pop();
        const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('post-media').upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path);
        mediaUrls.push(publicUrl);
      }

      const body: Record<string, unknown> = { content: content.trim(), post_type: postType, media_urls: mediaUrls };
      if (postType === 'parts_request') {
        if (budget) body.budget = Number(budget);
        if (deadline) body.deadline = deadline;
      }

      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to post');
      const { post } = await res.json();
      onCreated({ ...post, author: currentUser, liked_by_me: false });
      toast.success('Posted!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const typeConf = getTypeConf(postType);
  const TypeIcon = typeConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 font-jakarta"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar author={currentUser} size={10} />
            <div>
              <p className="font-semibold text-gray-900 text-sm">{currentUser.full_name}</p>
              <p className="text-xs text-gray-400">{currentUser.company_name ?? (currentUser.user_type === 'engineer' ? 'Engineer' : 'Client')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Post type pills */}
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.map(pt => {
              const Icon = pt.icon;
              const active = postType === pt.value;
              return (
                <button key={pt.value} type="button" onClick={() => setPostType(pt.value as FeedPost['post_type'])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active ? `${pt.bg} ${pt.text} ${pt.border} border` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{pt.label}
                </button>
              );
            })}
          </div>

          {/* Parts request notice */}
          {postType === 'parts_request' && (
            <div className="flex gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 leading-relaxed">
                <strong>Parts Request</strong> — Describe the part needed with photos, budget, and deadline.
                Vendors can bid directly on your post.
              </p>
            </div>
          )}

          {/* Content */}
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder={postType === 'parts_request'
              ? 'Describe the part — dimensions, material, quantity, urgency...'
              : "What's happening on your project?"}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] resize-none text-gray-900 placeholder-gray-400 text-sm outline-none transition-all"
            rows={postType === 'parts_request' ? 5 : 4} maxLength={3000} autoFocus
          />
          <p className="text-xs text-gray-300 text-right -mt-2">{content.length}/3000</p>

          {/* Budget + deadline for parts_request */}
          {postType === 'parts_request' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Budget (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min="1" placeholder="e.g. 500" value={budget} onChange={e => setBudget(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Needed By</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
            </div>
          )}

          {/* Media previews */}
          {previews.length > 0 && (
            <div className={`grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {previews.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                  {mediaFiles[i]?.type.startsWith('video') ? (
                    <video src={src} className="w-full h-full object-cover" />
                  ) : (
                    <img src={src} className="w-full h-full object-cover" alt="" />
                  )}
                  <button type="button" onClick={() => removeFile(i)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-[#003D82] hover:bg-blue-50 rounded-lg transition-all text-sm font-medium">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Add Photo</span>
            </button>
            <button type="submit" disabled={!content.trim() || isPosting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm">
              {isPosting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {postType === 'parts_request' ? 'Post Request' : 'Post'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Single post card ─────────────────────────────────────────────────────────
function PostCard({
  post,
  currentUserId,
  onLikeToggle,
  onDM,
}: {
  post: FeedPost;
  currentUserId: string | null;
  onLikeToggle: (postId: string) => void;
  onDM: (userId: string) => void;
}) {
  const [showComments, setShowComments]           = useState(false);
  const [comments, setComments]                   = useState<any[]>([]);
  const [newComment, setNewComment]               = useState('');
  const [loadingComments, setLoadingComments]     = useState(false);
  const [postingComment, setPostingComment]       = useState(false);
  const [lightboxSrc, setLightboxSrc]             = useState('');

  const typeConf = getTypeConf(post.post_type);
  const TypeIcon = typeConf.icon;
  const isPartsRequest = post.post_type === 'parts_request';

  const loadComments = async () => {
    if (comments.length > 0) return;
    setLoadingComments(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('feed_comments')
      .select('id, content, created_at, author:profiles!author_id(id, full_name, avatar_url, user_type)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments(data ?? []);
    setLoadingComments(false);
  };

  const handleCommentToggle = () => {
    if (!showComments) loadComments();
    setShowComments(v => !v);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;
    setPostingComment(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('feed_comments')
      .insert({ post_id: post.id, author_id: currentUserId, content: newComment.trim() })
      .select('id, content, created_at, author:profiles!author_id(id, full_name, avatar_url, user_type)')
      .single();
    if (!error && data) { setComments(c => [...c, data]); setNewComment(''); }
    setPostingComment(false);
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl shadow-sm border overflow-hidden font-jakarta ${
          isPartsRequest ? 'border-rose-200 ring-1 ring-rose-100' : 'border-gray-100'
        }`}
      >
        {/* Parts request urgent banner */}
        {isPartsRequest && (
          <div className="bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">Parts Request</span>
            {post.deadline && (
              <span className="ml-auto text-xs text-rose-100 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Needed by {new Date(post.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start gap-3">
          <Avatar author={post.author} size={10} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{post.author?.full_name}</span>
              {post.author?.company_name && (
                <span className="text-xs text-gray-400 truncate">· {post.author.company_name}</span>
              )}
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${typeConf.bg} ${typeConf.text} ${typeConf.border}`}>
                <TypeIcon className="w-2.5 h-2.5" />{typeConf.label}
              </span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          {/* DM button */}
          {currentUserId && currentUserId !== post.author?.id && (
            <button onClick={() => onDM(post.author.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-[#003D82] hover:text-[#003D82] text-gray-500 rounded-lg text-xs font-semibold transition-all">
              <MessageSquare className="w-3.5 h-3.5" />DM
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-5 pb-3">
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
        </div>

        {/* Budget badge */}
        {isPartsRequest && post.budget && (
          <div className="px-5 pb-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <DollarSign className="w-4 h-4" />Budget: ${Number(post.budget).toLocaleString()}
            </span>
          </div>
        )}

        {/* Media grid */}
        {post.media_urls?.length > 0 && (
          <div className={`grid gap-0.5 ${post.media_urls.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {post.media_urls.slice(0, 4).map((url, i) => (
              <div key={i} onClick={() => !url.match(/\.(mp4|webm|mov)$/i) && setLightboxSrc(url)}
                className={`relative bg-gray-100 overflow-hidden cursor-zoom-in ${
                  post.media_urls.length === 1 ? 'aspect-[16/9]' : 'aspect-square'
                }`}>
                {url.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={url} className="w-full h-full object-cover" controls onClick={e => e.stopPropagation()} />
                ) : (
                  <img src={url} className="w-full h-full object-cover hover:brightness-90 transition-all" alt="" loading="lazy" />
                )}
                {i === 3 && post.media_urls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{post.media_urls.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="px-5 py-3 flex items-center gap-1 border-t border-gray-50">
          <button onClick={() => onLikeToggle(post.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              post.liked_by_me ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-400 hover:bg-red-50'
            }`}>
            <Heart className={`w-4 h-4 ${post.liked_by_me ? 'fill-current' : ''}`} />
            {post.likes_count > 0 && <span>{post.likes_count}</span>}
          </button>
          <button onClick={handleCommentToggle}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showComments ? 'text-[#003D82] bg-blue-50' : 'text-gray-500 hover:text-[#003D82] hover:bg-blue-50'
            }`}>
            <MessageCircle className="w-4 h-4" />
            {post.comments_count > 0 && <span>{post.comments_count}</span>}
          </button>
          <span className="ml-auto text-xs text-gray-300 font-medium hidden sm:block">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Bid panel — parts_request only */}
        {isPartsRequest && (
          <BidPanel post={post} currentUserId={currentUserId} onDM={onDM} />
        )}

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-100 overflow-hidden"
            >
              <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                {loadingComments ? (
                  <div className="flex justify-center py-3"><Loader className="w-5 h-5 animate-spin text-blue-400" /></div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">No comments yet — be the first!</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar author={c.author} size={7} />
                      <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-baseline gap-2">
                          <p className="text-xs font-semibold text-gray-800">{c.author?.full_name}</p>
                          <p className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {currentUserId && (
                <form onSubmit={submitComment} className="flex gap-2 px-4 pb-4">
                  <input value={newComment} onChange={e => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] outline-none transition-all"
                  />
                  <button type="submit" disabled={!newComment.trim() || postingComment}
                    className="px-3 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white rounded-xl transition-all disabled:opacity-50">
                    {postingComment ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxSrc('')}>
            <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
            <img src={lightboxSrc} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main feed page ───────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts]                     = useState<FeedPost[]>([]);
  const [newPostIds, setNewPostIds]           = useState<Set<string>>(new Set());
  const [page, setPage]                       = useState(0);
  const [hasMore, setHasMore]                 = useState(true);
  const [isLoading, setIsLoading]             = useState(true);
  const [isLoadingMore, setIsLoadingMore]     = useState(false);
  const [currentUserId, setCurrentUserId]     = useState<string | null>(null);
  const [currentUser, setCurrentUser]         = useState<Author | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType]           = useState<FeedPost['post_type']>('update');
  const [filterType, setFilterType]           = useState('all');
  const [liveCount, setLiveCount]             = useState(0);
  const channelRef                            = useRef<RealtimeChannel | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    setPosts([]);
    setPage(0);
    setHasMore(true);
    loadFeed(0, filterType, true);
  }, [filterType]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('feed_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts', filter: 'is_published=eq.true' },
        async (payload) => {
          const newRow = payload.new as any;
          // Fetch full post with author profile
          const { data: fullPost } = await supabase
            .from('feed_posts')
            .select(`
              id, content, post_type, media_urls,
              likes_count, comments_count, bids_count, budget, deadline, created_at,
              author:profiles!author_id(id, full_name, avatar_url, user_type, company_name)
            `)
            .eq('id', newRow.id)
            .single();

          if (!fullPost) return;

          const enriched: FeedPost = { ...fullPost as any, liked_by_me: false };

          // If viewing "all" or the matching type, inject at top
          if (filterType === 'all' || filterType === fullPost.post_type) {
            setPosts(prev => {
              if (prev.some(p => p.id === enriched.id)) return prev;
              return [enriched, ...prev];
            });
            setNewPostIds(s => new Set(s).add(enriched.id));
            // Remove highlight after 8 seconds
            setTimeout(() => {
              setNewPostIds(s => { const next = new Set(s); next.delete(enriched.id); return next; });
            }, 8000);
          } else {
            // Different filter — just show a "new posts" nudge
            setLiveCount(c => c + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feed_posts' },
        (payload) => {
          const updated = payload.new as any;
          setPosts(prev => prev.map(p =>
            p.id === updated.id
              ? { ...p, likes_count: updated.likes_count, comments_count: updated.comments_count, bids_count: updated.bids_count }
              : p
          ));
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [filterType]);

  const initUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, user_type, company_name')
      .eq('id', user.id)
      .single();
    if (profile) setCurrentUser(profile);
  };

  const loadFeed = useCallback(async (pageNum: number, type: string, reset = false) => {
    if (pageNum === 0) setIsLoading(true); else setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/feed?page=${pageNum}&type=${type}`);
      const data = await res.json();
      setPosts(prev => reset ? (data.posts ?? []) : [...prev, ...(data.posts ?? [])]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch {
      toast.error('Failed to load feed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  const handleLikeToggle = async (postId: string) => {
    if (!currentUserId) { router.push('/login'); return; }
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ));
    await fetch(`/api/feed/${postId}/like`, { method: 'POST' });
  };

  const handleDM = (userId: string) => {
    if (!currentUserId) { router.push('/login'); return; }
    router.push(`/messages?with=${userId}`);
  };

  const handlePostCreated = (newPost: FeedPost) => {
    setPosts(prev => [newPost, ...prev]);
    setNewPostIds(s => new Set(s).add(newPost.id));
    setTimeout(() => {
      setNewPostIds(s => { const next = new Set(s); next.delete(newPost.id); return next; });
    }, 8000);
  };

  const openCreate = (type: FeedPost['post_type'] = 'update') => {
    if (!currentUser) { router.push('/login'); return; }
    setCreateType(type);
    setShowCreateModal(true);
  };

  const FILTER_TABS = [
    { value: 'all',              label: 'All',            icon: TrendingUp },
    { value: 'parts_request',   label: 'Parts Requests', icon: Package    },
    { value: 'project_showcase', label: 'Showcases',     icon: Trophy     },
    { value: 'job_post',        label: 'Jobs',           icon: Briefcase  },
    { value: 'milestone',       label: 'Milestones',     icon: Zap        },
    { value: 'update',          label: 'Updates',        icon: FileText   },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-10">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-blue-300 text-xs font-semibold tracking-widest uppercase mb-2">Community Feed</p>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2 leading-tight">Engineering Network</h1>
            <p className="text-blue-200 text-sm">Parts requests, project showcases, jobs, and live marketplace activity</p>
          </motion.div>

          {currentUser ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="mt-6 flex gap-2 flex-wrap">
              <button onClick={() => openCreate('parts_request')}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-sm transition-all shadow-lg">
                <Package className="w-4 h-4" />Post Parts Request
              </button>
              <button onClick={() => openCreate('update')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl text-sm transition-all backdrop-blur-sm border border-white/20">
                <Plus className="w-4 h-4" />Share Update
              </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-5">
              <Link href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#003D82] font-bold rounded-xl text-sm hover:bg-blue-50 transition-all shadow-lg">
                Sign in to post or bid
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {FILTER_TABS.map(tab => {
              const Icon = tab.icon;
              const active = filterType === tab.value;
              return (
                <button key={tab.value} onClick={() => { setFilterType(tab.value); setLiveCount(0); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active ? 'bg-[#003D82] text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Live-update nudge */}
        <AnimatePresence>
          {liveCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              onClick={() => { setLiveCount(0); loadFeed(0, filterType, true); }}
              className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 bg-[#003D82] text-white text-sm font-semibold rounded-xl shadow-lg hover:bg-[#002960] transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              {liveCount} new post{liveCount !== 1 ? 's' : ''} — tap to refresh
            </motion.button>
          )}
        </AnimatePresence>

        {/* Compose prompt */}
        {currentUser && (
          <button onClick={() => openCreate('update')}
            className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 mb-5 hover:border-[#003D82]/30 hover:shadow-md transition-all text-left group">
            <Avatar author={currentUser} size={10} />
            <span className="text-gray-400 text-sm group-hover:text-gray-500 transition-colors flex-1">
              Share a project update, parts request, or opportunity...
            </span>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#003D82]/5 group-hover:bg-[#003D82]/10 flex items-center justify-center transition-all">
              <Plus className="w-4 h-4 text-[#003D82]" />
            </div>
          </button>
        )}

        {/* Posts list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader className="w-8 h-8 animate-spin text-[#003D82]" />
            <p className="text-gray-400 text-sm font-medium">Loading feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">Nothing here yet</p>
            <p className="text-sm text-gray-400 mb-4">
              {filterType === 'parts_request' ? 'No parts requests posted yet.' : 'Be the first to post something!'}
            </p>
            {currentUser && (
              <button onClick={() => openCreate(filterType === 'parts_request' ? 'parts_request' : 'update')}
                className="px-5 py-2.5 bg-[#003D82] text-white font-semibold rounded-xl text-sm hover:bg-[#002960] transition-all">
                Post Now
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className={newPostIds.has(post.id) ? 'ring-2 ring-[#003D82]/40 rounded-2xl' : ''}>
                <PostCard
                  post={post}
                  currentUserId={currentUserId}
                  onLikeToggle={handleLikeToggle}
                  onDM={handleDM}
                />
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2 pb-4">
                <button onClick={() => loadFeed(page + 1, filterType)} disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-3 text-[#003D82] font-semibold hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50 text-sm">
                  {isLoadingMore ? <Loader className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreateModal && currentUser && (
          <CreatePostModal
            currentUser={currentUser}
            onClose={() => setShowCreateModal(false)}
            onCreated={handlePostCreated}
            defaultType={createType}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
