'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MessageSquare, Send, Loader, User, Clock, Search, X, Plus,
  CheckCheck, Check, Lock, Unlock, DollarSign, ShieldCheck,
  Paperclip, FileText, Download, ExternalLink, Zap,
  Hash, Users, ChevronDown, ChevronRight, Settings2, Building2, Crown, AtSign,
  Shield, Trash2, Edit3, UserPlus, UserMinus, Briefcase,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const UNLOCK_COST = 50;

interface UserProfile { id: string; full_name: string; email: string; user_type: string; avatar_url?: string | null; }
interface Conversation {
  id: string; participant_one_id: string; participant_two_id: string;
  last_message_at: string; created_at: string; is_unlocked: boolean;
  conversation_type: 'direct' | 'group' | 'channel';
  name?: string | null; description?: string | null; is_public?: boolean;
  other_user: UserProfile; last_message?: { content: string; sender_id: string; created_at: string } | null;
  unread_count: number;
}
interface Message {
  id: string; conversation_id: string; sender_id: string; content: string;
  is_read: boolean; read_at: string | null; created_at: string; is_system_message?: boolean;
  message_type?: 'text' | 'system' | 'company_invite' | 'rfq_offer';
  message_metadata?: Record<string, unknown> | null;
  attachment_url?: string | null; attachment_name?: string | null; attachment_type?: 'image' | 'pdf' | 'file' | null;
}

interface RFQOfferMessage {
  rfqId: string;
  title: string;
  vendorName: string;
  amount: number;
  deliveryDays: number | null;
  note: string | null;
}

const RFQ_OFFER_PREFIX = '[RFQ_OFFER]';

function parseRFQOfferMessage(message: Pick<Message, 'content' | 'message_type' | 'message_metadata'>): RFQOfferMessage | null {
  if (message.message_type === 'rfq_offer' && message.message_metadata) {
    return message.message_metadata as unknown as RFQOfferMessage;
  }
  if (!message.content?.startsWith(RFQ_OFFER_PREFIX)) return null;
  try {
    return JSON.parse(message.content.slice(RFQ_OFFER_PREFIX.length)) as RFQOfferMessage;
  } catch {
    return null;
  }
}

function messagePreview(content: string) {
  return content.startsWith(RFQ_OFFER_PREFIX) ? 'New RFQ offer received' : content;
}

function Avatar({ user, size = 'md' }: { user: UserProfile | null; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base';
  if (user?.avatar_url) return <img src={user.avatar_url} alt={user.full_name} className={`${sz} rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm`} />;
  return <div className={`${sz} rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold flex-shrink-0`}>{user?.full_name?.charAt(0)?.toUpperCase() || 'U'}</div>;
}

function MentionRenderer({ content, isOwn }: { content: string; isOwn: boolean }) {
  // Split by @username pattern and render mentions as highlighted spans
  const parts = content.split(/(@[a-zA-Z0-9_\s.]+?)(?=\s|$)/g);
  return (
    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('@') && part.length > 1) {
          return (
            <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold ${
              isOwn ? 'bg-blue-400/30 text-white' : 'bg-blue-100 text-[#003D82]'
            }`}>
              <AtSign className="w-3 h-3" />
              {part.substring(1)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function AttachmentDisplay({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!msg.attachment_url) return;
    createClient().storage.from('message-attachments').createSignedUrl(msg.attachment_url, 3600).then(({ data }) => { if (data) setSignedUrl(data.signedUrl); });
  }, [msg.attachment_url]);
  if (!msg.attachment_url) return null;
  if (msg.attachment_type === 'image' && signedUrl)
    return <a href={signedUrl} target="_blank" rel="noopener noreferrer"><img src={signedUrl} alt={msg.attachment_name || 'image'} className="max-w-xs max-h-48 rounded-xl mt-1.5 object-cover" /></a>;
  return (
    <a href={signedUrl || '#'} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg text-sm font-medium ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
      {msg.attachment_type === 'pdf' ? <FileText className="w-4 h-4" /> : <Download className="w-4 h-4" />}
      <span className="truncate max-w-[200px]">{msg.attachment_name || 'Attachment'}</span>
      <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  );
}

function TokenPackCard({ pack, onSelect }: { pack: { id: string; name: string; tokens: number; price_cents: number; unlocks?: number }; onSelect: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <button onClick={async () => { setLoading(true); await onSelect(); setLoading(false); }} disabled={loading}
      className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 hover:border-[#003D82] hover:bg-blue-50 rounded-xl transition-all text-left">
      <div>
        <p className="font-semibold text-gray-900">{pack.name}</p>
        <p className="text-sm text-gray-500">{pack.tokens.toLocaleString()} tokens{pack.unlocks ? <span className="ml-1 text-green-600 font-medium">· {pack.unlocks} unlock{pack.unlocks > 1 ? 's' : ''}</span> : ''}</p>
      </div>
      <div className="text-right"><p className="font-bold text-[#003D82]">${(pack.price_cents / 100).toFixed(0)}</p>{loading && <Loader className="w-4 h-4 animate-spin ml-auto mt-1" />}</div>
    </button>
  );
}

function TokenPackPaymentForm({ onSuccess, onBack }: { onSuccess: (id: string) => Promise<void>; onBack: () => void }) {
  const stripe = useStripe(); const elements = useElements(); const [processing, setProcessing] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!stripe || !elements) return; setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (error) { toast.error(error.message || 'Payment failed'); return; }
      if (paymentIntent?.status === 'succeeded') await onSuccess(paymentIntent.id);
    } finally { setProcessing(false); }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50">← Back</button>
        <button type="submit" disabled={!stripe || processing} className="flex-1 px-4 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
          {processing ? <Loader className="w-5 h-5 animate-spin" /> : <><DollarSign className="w-4 h-4" />Pay & Get Tokens</>}
        </button>
      </div>
    </form>
  );
}

function MessagesPageInner() {
  const router = useRouter(); const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserFullName, setCurrentUserFullName] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenPacks, setTokenPacks] = useState<Array<{ id: string; name: string; tokens: number; price_cents: number; unlocks: number }>>([]);
  const [convFilter, setConvFilter] = useState('');
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [paywallSecret, setPaywallSecret] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // ── Channels & Groups ──
  const [channels, setChannels] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [directConvs, setDirectConvs] = useState<Conversation[]>([]);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelType, setNewChannelType] = useState<'channel' | 'group'>('channel');
  const [newChannelPublic, setNewChannelPublic] = useState(true);
  const [sidebarSection, setSidebarSection] = useState<'all' | 'channels' | 'groups' | 'dms'>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<UserProfile[]>([]);
  const [isMemberSearching, setIsMemberSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null);
  const [companyChannel, setCompanyChannel] = useState<Conversation | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [channelParticipants, setChannelParticipants] = useState<any[]>([]);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberResults, setAddMemberResults] = useState<UserProfile[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [myChannelRole, setMyChannelRole] = useState<string | null>(null);
  // ── Company Invite ──
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [inviteMemberSearch, setInviteMemberSearch] = useState('');
  const [inviteMemberResults, setInviteMemberResults] = useState<UserProfile[]>([]);
  const [isInviteSending, setIsInviteSending] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
  const [pendingInvites, setPendingInvites] = useState<Array<{company_id: string; company_name: string; invited_by_name: string; created_at: string}>>([]);
  const [showInviteActions, setShowInviteActions] = useState<{[key: string]: boolean}>({});
  const realtimeRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const globalRealtimeRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const typingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const messagesEnd = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { initializeUser(); }, []);
  useEffect(() => { if (currentUserId) { loadConversations(); setupGlobalRealtime(); } return () => { if (globalRealtimeRef.current) { createClient().removeChannel(globalRealtimeRef.current); globalRealtimeRef.current = null; } }; }, [currentUserId]);
  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation.id);
    markMessagesAsRead(selectedConversation.id);
    setupRealtime(selectedConversation.id);
    loadMyChannelRole();
    return () => {
      if (realtimeRef.current) { createClient().removeChannel(realtimeRef.current); realtimeRef.current = null; }
      // Clear typing timers
      typingRef.current.forEach(t => clearTimeout(t));
      typingRef.current.clear();
      setTypingUsers(new Map());
    };
  }, [selectedConversation?.id]);
  useEffect(() => {
    const withId = searchParams.get('with');
    if (!withId || !currentUserId || isLoadingConversations) return;
    if (withId === currentUserId) return;
    const existing = conversations.find(c => c.other_user?.id === withId);
    if (existing) setSelectedConversation(existing); else openOrCreateConversation(withId);
  }, [searchParams, currentUserId, isLoadingConversations]);
  useEffect(() => { if (searchQuery.length >= 2) searchUsers(); else setSearchResults([]); }, [searchQuery]);
  useEffect(() => { if (memberSearchQuery.length >= 2) searchMembers(); else setMemberSearchResults([]); }, [memberSearchQuery]);
  useEffect(() => {
    if (!userCompanyId) { setTeamMembers([]); return; }
    const supabase = createClient();
    supabase.from('company_members').select('user_id, role').eq('company_id', userCompanyId).eq('status', 'active')
      .then(async ({ data: mems }) => {
        if (!mems) return;
        const withProfiles = await Promise.all(mems.map(async (m: any) => {
          const { data: prof } = await supabase.from('profiles').select('full_name, email, avatar_url, user_type').eq('id', m.user_id).single();
          return { ...m, profile: prof || { full_name: 'Unknown', email: '', user_type: 'engineer' } };
        }));
        setTeamMembers(withProfiles);
      });
  }, [userCompanyId]);

  const setupRealtime = useCallback((conversationId: string) => {
    const supabase = createClient();
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    const channel = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.sender_id !== currentUserId) markMessagesAsRead(conversationId);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const u = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === u.id ? u : m));
      })
      // ── Typing indicator via Realtime Broadcast ──
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== currentUserId) {
          setTypingUsers(prev => {
            const next = new Map(prev);
            next.set(payload.payload.userId, payload.payload.userName || 'Someone');
            return next;
          });
          // Clear typing after 2.5s of no signal
          if (typingRef.current.has(payload.payload.userId)) {
            clearTimeout(typingRef.current.get(payload.payload.userId)!);
          }
          const timeout = setTimeout(() => {
            setTypingUsers(prev => { const n = new Map(prev); n.delete(payload.payload.userId); return n; });
          }, 2500);
          typingRef.current.set(payload.payload.userId, timeout);
        }
      })
      .subscribe();
    realtimeRef.current = channel;
  }, [currentUserId]);

  // ── Global sidebar Realtime subscription ──
  // Subscribes to user_messages + user_conversations changes to keep the
  // conversation list order, unread badges, and last message preview live.
  const setupGlobalRealtime = useCallback(() => {
    const supabase = createClient();
    if (globalRealtimeRef.current) supabase.removeChannel(globalRealtimeRef.current);

    const channel = supabase.channel('sidebar:global')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        // Reload conversations to update sidebar order + unread counts
        loadConversations();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'user_conversations',
      }, (payload) => {
        const updated = payload.new as any;
        // Reload if the conversation is in our list
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === updated.id);
          if (idx === -1) return prev;
          return prev.map(c => c.id === updated.id ? { ...c, ...updated } : c);
        });
        setSelectedConversation(prev => prev?.id === updated.id ? { ...prev, ...updated } as Conversation : prev);
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversation_participants',
      }, (payload) => {
        // Reload participants when they change
        if (selectedConversation && (payload.new as any)?.conversation_id === selectedConversation.id) {
          loadChannelParticipants(selectedConversation.id);
        }
      })
      .subscribe();

    globalRealtimeRef.current = channel;
  }, [selectedConversation?.id]);

  const loadMyChannelRole = useCallback(async () => {
    if (!selectedConversation || !currentUserId) { setMyChannelRole(null); return; }
    if (selectedConversation.conversation_type === 'direct') { setMyChannelRole(null); return; }
    const supabase = createClient();
    try {
      const { data: role } = await supabase
        .from('conversation_participants')
        .select('role')
        .eq('conversation_id', selectedConversation.id)
        .eq('user_id', currentUserId)
        .maybeSingle();
      setMyChannelRole(role?.role || 'member');
    } catch { setMyChannelRole('member'); }
  }, [selectedConversation?.id, currentUserId]);

  const loadChannelParticipants = useCallback(async (conversationId: string) => {
    const supabase = createClient();
    try {
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, role')
        .eq('conversation_id', conversationId);
      if (!parts) return;
      const withProfiles = await Promise.all(parts.map(async (p: any) => {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url, user_type')
          .eq('id', p.user_id)
          .maybeSingle();
        return { ...p, profile: prof || { full_name: 'Unknown', email: '', avatar_url: null, user_type: 'engineer' } };
      }));
      setChannelParticipants(withProfiles);
    } catch { /* silent */ }
  }, []);

  const handleRenameChannel = async () => {
    if (!selectedConversation || !renameValue.trim()) return;
    setIsRenaming(true);
    try {
      const res = await fetch('/api/messages/update-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          name: renameValue.trim(),
        }),
      });
      if (!res.ok) { toast.error('Failed to rename'); return; }
      setSelectedConversation(prev => prev ? { ...prev, name: renameValue.trim() } : prev);
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, name: renameValue.trim() } : c));
      setShowChannelSettings(false);
      toast.success('Channel renamed');
    } catch { toast.error('Failed to rename'); }
    finally { setIsRenaming(false); }
  };

  const handleDeleteChannel = async () => {
    if (!selectedConversation) return;
    if (!window.confirm(`Delete "${selectedConversation.name || 'this channel'}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/messages/delete-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversation.id }),
      });
      if (!res.ok) { toast.error('Failed to delete'); return; }
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      setChannels(prev => prev.filter(c => c.id !== selectedConversation.id));
      setGroups(prev => prev.filter(c => c.id !== selectedConversation.id));
      setSelectedConversation(null);
      setShowChannelSettings(false);
      toast.success('Channel deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!selectedConversation) return;
    if (!window.confirm(`Remove ${userName} from this channel?`)) return;
    try {
      const res = await fetch('/api/messages/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversation.id, targetUserId: userId }),
      });
      if (!res.ok) { toast.error('Failed to remove member'); return; }
      setChannelParticipants(prev => prev.filter(p => p.user_id !== userId));
      toast.success(`${userName} removed`);
    } catch { toast.error('Failed to remove member'); }
  };

  const handleUpdateRole = async (userId: string, newRole: string, userName: string) => {
    if (!selectedConversation) return;
    try {
      const res = await fetch('/api/messages/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversation.id, targetUserId: userId, role: newRole }),
      });
      if (!res.ok) { toast.error('Failed to update role'); return; }
      setChannelParticipants(prev => prev.map(p => p.user_id === userId ? { ...p, role: newRole } : p));
      toast.success(`${userName} is now ${newRole}`);
    } catch { toast.error('Failed to update role'); }
  };

  const handleAddMember = async (user: UserProfile) => {
    if (!selectedConversation) return;
    try {
      const res = await fetch('/api/messages/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversation.id, targetUserId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[add-member] failed:', data.error);
        toast.error(data.error || 'Failed to add member');
        return;
      }
      setChannelParticipants(prev => [...prev, { user_id: user.id, role: 'member', profile: user }]);
      setShowAddMemberModal(false);
      setAddMemberSearch('');
      setAddMemberResults([]);
      toast.success(`${user.full_name} added`);
    } catch (err) {
      console.error('[add-member] exception:', err);
      toast.error('Failed to add member');
    }
  };

  // ── Send typing indicator via Realtime Broadcast ──
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTypingIndicator = useCallback(() => {
    if (!selectedConversation?.id || !currentUserId) return;
    // Broadcast typing event (debounced to once per 2s)
    if (typingTimeoutRef.current) return;
    const supabase = createClient();
    const channel = supabase.channel(`messages:${selectedConversation.id}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUserId, userName: currentUserFullName || 'Someone' },
        });
        setTimeout(() => supabase.removeChannel(channel), 500);
      }
    });
    typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
  }, [selectedConversation?.id, currentUserId, currentUserFullName]);

  const initializeUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Fetch profile FIRST so we can set both id and company_id together
      const { data: profile } = await supabase.from('profiles').select('token_balance, company_id, full_name').eq('id', user.id).single();
      if (profile) {
        setTokenBalance(profile.token_balance ?? 0);
        setCurrentUserFullName(profile.full_name || '');
        if (profile.company_id) {
          setUserCompanyId(profile.company_id);
          const { data: comp } = await supabase.from('company_profiles').select('company_name').eq('id', profile.company_id).single();
          if (comp) setUserCompanyName(comp.company_name);
        }
      }

      // NOW set currentUserId — this will trigger loadConversations with company_id already in state
      setCurrentUserId(user.id);

      // Load pending invites (for users not in a company)
      if (!profile?.company_id) {
        loadPendingInvites(user.id);
      }

      setTokenPacks([
        { id: 'starter', name: 'Starter', tokens: 100, price_cents: 1000, unlocks: 1 },
        { id: 'pro', name: 'Pro', tokens: 500, price_cents: 4500, unlocks: 5 },
        { id: 'business', name: 'Business', tokens: 1200, price_cents: 9900, unlocks: 12 },
      ]);
    } catch (err: any) { console.error('initializeUser:', err); toast.error('Failed to load profile'); }
  };

  const loadPendingInvites = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_pending_invites', { p_user_id: userId });
      if (!error && data) setPendingInvites(data);
    } catch {}
  };

  const handleAcceptInvite = async (companyId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('accept_company_invite', { p_company_id: companyId });
      if (error) { toast.error('Failed to accept invite'); return; }
      if (data === 'active') {
        toast.success('You joined the company! 🎉');
        setPendingInvites(prev => prev.filter(p => p.company_id !== companyId));
        // Reload user state
        initializeUser();
      } else {
        toast.error(data || 'Failed to accept invite');
      }
    } catch { toast.error('Failed to accept invite'); }
  };

  const handleDeclineInvite = async (companyId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('decline_company_invite', { p_company_id: companyId });
      if (error) { toast.error('Failed to decline invite'); return; }
      if (data === 'declined') {
        toast.success('Invite declined');
        setPendingInvites(prev => prev.filter(p => p.company_id !== companyId));
      }
    } catch { toast.error('Failed to decline invite'); }
  };

  const handleSendInvite = async (targetUser: UserProfile) => {
    if (!userCompanyId) { toast.error('No company found'); return; }
    setInvitingUserId(targetUser.id);
    try {
      console.log('[invite] sending to:', targetUser.full_name, 'companyId:', userCompanyId);
      const res = await fetch('/api/messages/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: userCompanyId, targetUserId: targetUser.id }),
      });
      const data = await res.json();
      console.log('[invite] response:', res.status, data);
      if (!res.ok) {
        toast.error(data.error || 'Failed to send invite');
        return;
      }
      toast.success(`Invite sent to ${targetUser.full_name}!`);
      setInvitedUserIds(prev => new Set(prev).add(targetUser.id));
      setInviteMemberSearch('');
      setInviteMemberResults([]);
    } catch (err) {
      console.error('[invite] exception:', err);
      toast.error('Network error — is the dev server running?');
    }
    finally { setInvitingUserId(null); }
  };

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const supabase = createClient();

      // Fetch all conversations the user is part of
      // Direct: via participant_one_id / participant_two_id
      // Group/Channel: via conversation_participants
      const { data: directData } = await supabase.from('user_conversations').select('*')
        .eq('conversation_type', 'direct')
        .or(`participant_one_id.eq.${currentUserId},participant_two_id.eq.${currentUserId}`)
        .order('last_message_at', { ascending: false });

      const { data: groupChannelData } = await supabase.from('user_conversations').select('*')
        .in('conversation_type', ['group', 'channel'])
        .order('last_message_at', { ascending: false });

      // Filter group/channel to only those the user is a member of
      const allConvs = [...(directData || [])];
      if (groupChannelData) {
        for (const gc of groupChannelData) {
          const { data: membership } = await supabase.from('conversation_participants')
            .select('id').eq('conversation_id', gc.id).eq('user_id', currentUserId).maybeSingle();
          if (membership) allConvs.push(gc);
        }
      }

      // Sort by last_message_at
      allConvs.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      const withDetails = await Promise.all(allConvs.map(async (conv) => {
        let otherUser: any = null;
        let lastMsg: any = null;
        let unreadCount = 0;

        if (conv.conversation_type === 'direct') {
          const otherId = conv.participant_one_id === currentUserId ? conv.participant_two_id : conv.participant_one_id;
          const [{ data: ou }, { data: lm }, { count }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, email, user_type, avatar_url').eq('id', otherId).single(),
            supabase.from('user_messages').select('content, sender_id, created_at').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1).single(),
            supabase.from('user_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('is_read', false).neq('sender_id', currentUserId),
          ]);
          otherUser = ou; lastMsg = lm; unreadCount = count || 0;
        } else {
          // For groups/channels, get last message and unread count
          const [{ data: lm }, { count }] = await Promise.all([
            supabase.from('user_messages').select('content, sender_id, created_at').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1).single(),
            supabase.from('user_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('is_read', false).neq('sender_id', currentUserId),
          ]);
          lastMsg = lm; unreadCount = count || 0;
        }

        return { ...conv, other_user: otherUser, last_message: lastMsg, unread_count: unreadCount };
      }));

      // Split by type
      const channels = withDetails.filter(c => c.conversation_type === 'channel');
      const groups = withDetails.filter(c => c.conversation_type === 'group');
      const directs = withDetails.filter(c => c.conversation_type === 'direct');

      // Fetch company channel if user has a company
      let compChan: Conversation | null = null;
      if (userCompanyId) {
        const { data: cc } = await supabase.from('user_conversations')
          .select('*').eq('company_id', userCompanyId).eq('conversation_type', 'channel').eq('name', 'General').maybeSingle();
        if (cc) {
          const [{ data: lm }, { count }] = await Promise.all([
            supabase.from('user_messages').select('content, sender_id, created_at').eq('conversation_id', cc.id).order('created_at', { ascending: false }).limit(1).single(),
            supabase.from('user_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', cc.id).eq('is_read', false).neq('sender_id', currentUserId),
          ]);
          compChan = { ...cc, other_user: null, last_message: lm, unread_count: count || 0 } as Conversation;
          // Add to channels if not already there
          if (!channels.some(c => c.id === cc.id)) channels.unshift(compChan);
        }
      }
      setCompanyChannel(compChan);

      setChannels(channels as Conversation[]);
      setGroups(groups as Conversation[]);
      setDirectConvs(directs as Conversation[]);
      setConversations(withDetails as Conversation[]);

      if (selectedConversation) {
        const u = withDetails.find(c => c.id === selectedConversation.id);
        if (u) setSelectedConversation(u as Conversation);
      }
    } catch (err: any) { console.error('loadConversations:', err); toast.error('Failed to load conversations'); }
    finally { setIsLoadingConversations(false); }
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('user_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) { console.error('loadMessages:', err); }
    finally { setIsLoadingMessages(false); }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('user_messages').update({ is_read: true })
        .eq('conversation_id', conversationId).eq('is_read', false).neq('sender_id', currentUserId);
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
    } catch (err) { console.error('markMessagesAsRead:', err); }
  };

  const isFreeConversation = (conv: Conversation) => {
    if (conv.conversation_type !== 'direct') return true; // channels & groups are always free
    return conv.is_unlocked;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyMessage.trim() && !selectedFile) || !selectedConversation || !currentUserId) return;
    if (!isFreeConversation(selectedConversation)) { setShowUnlockModal(true); return; }
    setIsSending(true);

    // ── Optimistic UI: insert a temp message immediately ──
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId, conversation_id: selectedConversation.id, sender_id: currentUserId,
      content: replyMessage.trim(), is_read: false, read_at: null, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    const optimisticText = replyMessage;
    setReplyMessage('');

    try {
      let attachmentUrl: string | undefined, attachmentName: string | undefined, attachmentType: string | undefined;
      if (selectedFile) {
        setIsUploading(true);
        const fd = new FormData(); fd.append('file', selectedFile); fd.append('conversationId', selectedConversation.id);
        const upRes = await fetch('/api/messages/upload', { method: 'POST', body: fd });
        if (!upRes.ok) throw new Error((await upRes.json()).error || 'Upload failed');
        const upData = await upRes.json();
        attachmentUrl = upData.url; attachmentName = upData.name; attachmentType = upData.type;
        setIsUploading(false); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '';
      }
      const res = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConversation.id, content: optimisticText, ...(attachmentUrl && { attachmentUrl, attachmentName, attachmentType }) }),
      });
      if (res.status === 402) {
        // Optimistic message was wrong — remove it and show unlock
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setReplyMessage(optimisticText);
        setShowUnlockModal(true);
        return;
      }
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to send');
      const data = await res.json();
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message, created_at: m.created_at } : m));
      await loadConversations();
    } catch (err: any) {
      // On error, remove optimistic message and show the text again
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setReplyMessage(optimisticText);
      console.error('handleSendMessage:', err);
      toast.error(err.message || 'Failed to send message');
    }
    finally { setIsSending(false); setIsUploading(false); }
  };

  const handleUnlock = async () => {
    if (!selectedConversation || (tokenBalance ?? 0) < UNLOCK_COST) return;
    setIsUnlocking(true);
    try {
      const res = await fetch('/api/messages/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: selectedConversation.id }) });
      const data = await res.json();
      if (res.status === 402) return;
      if (!res.ok) throw new Error(data.error || 'Failed to unlock');
      setTokenBalance(data.tokenBalance);
      setShowUnlockModal(false);
      setSelectedConversation(prev => prev ? { ...prev, is_unlocked: true } : prev);
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, is_unlocked: true } : c));
      toast.success('Conversation unlocked! Message freely now. 🔓');
      await loadMessages(selectedConversation.id);
    } catch (err: any) { console.error('handleUnlock:', err); toast.error(err.message || 'Failed to unlock'); }
    finally { setIsUnlocking(false); }
  };

  const searchUsers = async () => {
    setIsSearching(true);
    try {
      const supabase = createClient();
      const q = `%${searchQuery}%`;
      const { data } = await supabase.from('profiles')
        .select('id, full_name, email, user_type, avatar_url')
        .neq('id', currentUserId!)
        .or(`full_name.ilike.${q},email.ilike.${q}`)
        .limit(10);
      setSearchResults(data || []);
    } finally { setIsSearching(false); }
  };

  const searchMembers = async () => {
    setIsMemberSearching(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('profiles').select('id, full_name, email, user_type, avatar_url')
        .neq('id', currentUserId!).ilike('full_name', `%${memberSearchQuery}%`).limit(10);
      setMemberSearchResults((data || []).filter(u => !selectedMembers.some(m => m.id === u.id)));
    } finally { setIsMemberSearching(false); }
  };

  const toggleSelectedMember = (u: UserProfile) => {
    setSelectedMembers(prev => prev.some(m => m.id === u.id) ? prev.filter(m => m.id !== u.id) : [...prev, u]);
    setMemberSearchResults(prev => prev.filter(m => m.id !== u.id));
    setMemberSearchQuery('');
  };

  const startConversation = async (otherUser: UserProfile) => {
    try {
      const supabase = createClient();
      const { data: convId, error } = await supabase.rpc('get_or_create_conversation', { user_one_id: currentUserId, user_two_id: otherUser.id });
      if (error) throw error;
      const { data: convData } = await supabase.from('user_conversations').select('*').eq('id', convId).single();
      if (convData) { setSelectedConversation({ ...convData, other_user: otherUser, unread_count: 0 } as Conversation); setShowNewConvModal(false); setSearchQuery(''); await loadConversations(); }
    } catch (err: any) { toast.error('Failed to start conversation'); }
  };

  const openOrCreateConversation = async (userId: string) => {
    const supabase = createClient();
    const { data: otherUser } = await supabase.from('profiles').select('id, full_name, email, user_type, avatar_url').eq('id', userId).single();
    if (!otherUser) { toast.error('Could not find that user.'); return; }
    await startConversation(otherUser as UserProfile);
  };

  const filtered = conversations.filter(c => c.other_user?.full_name?.toLowerCase().includes(convFilter.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-jakarta">
      <Navigation />
      <div className="flex-1 pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-500 text-sm mt-0.5">Connect with engineers and clients</p>
            </div>
            {tokenBalance !== null && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                <Zap className="w-4 h-4 text-[#FF6B35]" />
                <span className="font-bold text-gray-900">{tokenBalance.toLocaleString()}</span>
                <span className="text-gray-500 text-sm">tokens</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden" style={{ height: '72vh' }}>
            <div className="flex h-full">

              {/* Sidebar — Slack-style with sections */}
              <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0 bg-gray-50/50">
                {/* Header */}
                <div className="p-3 border-b border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-extrabold text-gray-900 text-sm">Messages</h2>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowNewConvModal(true)} title="New direct message"
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowCreateChannelModal(true)} title="Create channel"
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700">
                        <Hash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" value={convFilter} onChange={e => setConvFilter(e.target.value)} placeholder="Jump to..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] bg-white" />
                  </div>
                </div>

                {/* Conversation list with sections */}
                <div className="flex-1 overflow-y-auto">
                  {isLoadingConversations ? (
                    <div className="flex justify-center p-8"><Loader className="w-5 h-5 text-[#003D82] animate-spin" /></div>
                  ) : (
                    <>
                      {/* ── Company Channel ── */}
                      {userCompanyId && userCompanyName && (
                        <div className="px-3 py-2 border-b border-gray-100">
                          <div className="flex items-center gap-2 mb-1.5 px-1">
                            <Building2 className="w-3.5 h-3.5 text-[#FF6B35]" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">{userCompanyName}</span>
                          </div>
                          {companyChannel ? (
                            <motion.button
                              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                              onClick={() => setSelectedConversation(companyChannel)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                                selectedConversation?.id === companyChannel.id
                                  ? 'bg-[#003D82] text-white shadow-md'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${selectedConversation?.id === companyChannel.id ? 'text-white/80' : 'text-[#FF6B35]'}`} />
                              <span className="text-xs font-semibold truncate">General</span>
                              {companyChannel.unread_count > 0 && (
                                <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  selectedConversation?.id === companyChannel.id ? 'bg-white/20 text-white' : 'bg-[#FF6B35] text-white'
                                }`}>{companyChannel.unread_count}</span>
                              )}
                            </motion.button>
                          ) : (
                            <p className="text-xs text-gray-400 px-1">Loading...</p>
                          )}
                        </div>
                      )}

                      {/* ── Channels Section ── */}
                      <SidebarSection
                        title="Channels"
                        icon={<Hash className="w-3.5 h-3.5" />}
                        items={channels}
                        collapsed={collapsedSections['channels']}
                        onToggle={() => setCollapsedSections(prev => ({ ...prev, channels: !prev.channels }))}
                        selectedId={selectedConversation?.id}
                        currentUserId={currentUserId}
                        onSelect={setSelectedConversation}
                        filter={convFilter}
                      />

                      {/* ── Projects Section ── */}
                      <SidebarSection
                        title="Projects"
                        icon={<Briefcase className="w-3.5 h-3.5" />}
                        items={groups}
                        collapsed={collapsedSections['groups']}
                        onToggle={() => setCollapsedSections(prev => ({ ...prev, groups: !prev.groups }))}
                        selectedId={selectedConversation?.id}
                        currentUserId={currentUserId}
                        onSelect={setSelectedConversation}
                        filter={convFilter}
                      />

                      {/* ── Direct Messages Section ── */}
                      <SidebarSection
                        title="Direct Messages"
                        icon={<MessageSquare className="w-3.5 h-3.5" />}
                        items={directConvs}
                        collapsed={collapsedSections['dms']}
                        onToggle={() => setCollapsedSections(prev => ({ ...prev, dms: !prev.dms }))}
                        selectedId={selectedConversation?.id}
                        currentUserId={currentUserId}
                        onSelect={setSelectedConversation}
                        filter={convFilter}
                      />

                      {channels.length === 0 && groups.length === 0 && directConvs.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                          <p className="text-xs">No conversations yet</p>
                          <p className="text-xs mt-1 text-gray-300">Start a DM, create a channel, or accept a project</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Thread */}
              <div className="flex-1 flex flex-col min-w-0">
                {selectedConversation ? (
                  <>
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        {selectedConversation.conversation_type === 'channel' ? (
                          <div className="w-10 h-10 rounded-lg bg-[#003D82]/10 flex items-center justify-center">
                            <Hash className="w-5 h-5 text-[#003D82]" />
                          </div>
                        ) : selectedConversation.conversation_type === 'group' ? (
                          <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-[#FF6B35]" />
                          </div>
                        ) : (
                          <Avatar user={selectedConversation.other_user} size="md" />
                        )}
                        <div>
                          <h2 className="font-bold text-gray-900">
                            {selectedConversation.conversation_type === 'direct'
                              ? selectedConversation.other_user?.full_name
                              : selectedConversation.name || 'Unnamed'}
                          </h2>
                          <div className="flex items-center gap-2 mt-0.5">
                            {selectedConversation.conversation_type === 'direct' ? (
                              <>
                                <span className="text-xs text-gray-500 capitalize">{selectedConversation.other_user?.user_type}</span>
                                {selectedConversation.other_user?.id && (
                                  <Link href={`/profiles/${selectedConversation.other_user.id}`} className="text-xs text-[#003D82] hover:underline flex items-center gap-0.5">
                                    View Profile <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                  </Link>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 capitalize">{selectedConversation.conversation_type}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedConversation.conversation_type === 'direct' && selectedConversation.is_unlocked && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1"><Unlock className="w-3 h-3" /> Unlocked</span>
                        )}
                        {selectedConversation.conversation_type !== 'direct' && (
                          <>
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1">
                              {selectedConversation.conversation_type === 'channel' ? <Hash className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                              {selectedConversation.conversation_type === 'channel' ? 'Channel' : 'Project'}
                            </span>
                            {myChannelRole && ['owner', 'admin'].includes(myChannelRole) && (
                              <button onClick={() => { setRenameValue(selectedConversation.name || ''); setShowChannelSettings(true); loadChannelParticipants(selectedConversation.id); }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
                                title="Channel settings">
                                <Settings2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {isLoadingMessages ? <div className="flex justify-center items-center h-full"><Loader className="w-7 h-7 text-[#003D82] animate-spin" /></div>
                        : messages.length === 0 ? <div className="flex flex-col justify-center items-center h-full text-gray-400 gap-2"><MessageSquare className="w-12 h-12 text-gray-200" /><p className="text-sm">No messages yet — say hello!</p></div>
                        : <>
                          {messages.map(msg => {
                            const isOwn = msg.sender_id === currentUserId;
                            if (msg.is_system_message) {
                              const offer = parseRFQOfferMessage(msg);
                              if (offer) {
                                return (
                                  <div key={msg.id} className="flex justify-start my-3">
                                    <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#003D82]/15 bg-white shadow-sm">
                                      <div className="flex items-center gap-2 border-b border-[#003D82]/10 bg-[#003D82] px-4 py-2.5 text-white">
                                        <FileText className="h-4 w-4" />
                                        <span className="text-sm font-bold">New RFQ Offer</span>
                                      </div>
                                      <div className="space-y-3 p-4">
                                        <div>
                                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">RFQ</p>
                                          <p className="mt-0.5 text-sm font-semibold leading-snug text-gray-900">{offer.title}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 border-y border-gray-100 py-3">
                                          <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Submitted by</p>
                                            <p className="mt-0.5 text-sm font-semibold text-gray-800">{offer.vendorName}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Offer amount</p>
                                            <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-emerald-700"><DollarSign className="h-3.5 w-3.5" />{Number(offer.amount).toLocaleString()}</p>
                                          </div>
                                          {offer.deliveryDays && (
                                            <div>
                                              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Delivery</p>
                                              <p className="mt-0.5 text-sm font-semibold text-gray-800">{offer.deliveryDays} days</p>
                                            </div>
                                          )}
                                        </div>
                                        {offer.note && <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{offer.note}</p>}
                                      </div>
                                      <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
                                        <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                                        Unlock this conversation for 50 tokens to reply.
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              // Check if this is a company invite
                              const isInvite = msg.content?.includes('INVITE') && (msg.content?.includes('[Accept]') || msg.content?.includes('**[Accept]**'));
                              const isAccepted = msg.content?.includes('ACCEPTED');
                              const isDeclined = msg.content?.includes('DECLINED');
                              if (isInvite) {
                                return (
                                  <div key={msg.id} className="flex justify-center my-3">
                                    <div className="bg-white border-2 border-[#FF6B35]/30 rounded-2xl p-4 max-w-sm shadow-md text-center">
                                      <div className="text-2xl mb-2">📨</div>
                                      <p className="text-sm text-gray-700 leading-relaxed">
                                        {msg.content?.replace(/\*\*\[Accept\]\*\*|\*\*\[Decline\]\*\*|\[Accept\]|\[Decline\]/g, '')}
                                      </p>
                                      <div className="flex gap-3 mt-3 justify-center">
                                        <button
                                          onClick={async () => {
                                            // Find the company ID from the invite - extract from pendingInvites or content
                                            const companyName = msg.content?.match(/"([^"]+)"/)?.[1];
                                            const invite = pendingInvites.find(p => p.company_name === companyName);
                                            if (invite) await handleAcceptInvite(invite.company_id);
                                            else toast.error('Could not find invite');
                                          }}
                                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5">
                                          <Check className="w-4 h-4" /> Accept
                                        </button>
                                        <button
                                          onClick={async () => {
                                            const companyName = msg.content?.match(/"([^"]+)"/)?.[1];
                                            const invite = pendingInvites.find(p => p.company_name === companyName);
                                            if (invite) await handleDeclineInvite(invite.company_id);
                                            else toast.error('Could not find invite');
                                          }}
                                          className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                                          <X className="w-4 h-4" /> Decline
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div key={msg.id} className="flex justify-center my-2">
                                  <span className={`text-xs ${isAccepted || isDeclined ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-200'} text-gray-500 px-4 py-1.5 rounded-full border`}>
                                    {msg.content?.replace(/^\*\*(.*?)\*\*:/, '$1:')}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[68%] flex ${isOwn ? 'flex-col items-end' : 'flex-row items-end gap-2'}`}>
                                  {/* Sender avatar for non-own messages in channels/groups */}
                                  {!isOwn && selectedConversation?.conversation_type !== 'direct' && (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 mb-1">
                                      {(() => {
                                        const sender = channelParticipants.find(p => p.user_id === msg.sender_id);
                                        return sender?.profile?.full_name?.charAt(0)?.toUpperCase() || '?';
                                      })()}
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    {/* Sender name for non-own messages in channels/groups */}
                                    {!isOwn && selectedConversation?.conversation_type !== 'direct' && (
                                      <p className="text-[10px] font-semibold text-gray-500 mb-0.5 ml-0.5">
                                        {(() => {
                                          const sender = channelParticipants.find(p => p.user_id === msg.sender_id);
                                          return sender?.profile?.full_name || 'Unknown';
                                        })()}
                                      </p>
                                    )}
                                    <div className={`rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-[#003D82] text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                                      {msg.content && <MentionRenderer content={msg.content} isOwn={isOwn} />}
                                      <AttachmentDisplay msg={msg} isOwn={isOwn} />
                                    </div>
                                    <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${isOwn ? 'justify-end' : 'justify-start ml-0.5'}`}>
                                      <Clock className="w-3 h-3" />
                                      <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                                      {isOwn && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5" />)}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                          <div ref={messagesEnd} />
                        </>
                      }
                    </div>

                    {/* Typing indicator */}
                    {selectedConversation.conversation_type === 'direct' && typingUsers.size > 0 && (
                      <div className="px-5 py-1.5">
                        <p className="text-xs text-gray-400 italic">
                          {Array.from(typingUsers.values()).join(' and ')} typing{typingUsers.size > 1 ? '' : 's'}…
                        </p>
                      </div>
                    )}

                    {/* Compose or Lock bar */}
                    {isFreeConversation(selectedConversation) ? (
                      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-gray-50">
                        {selectedFile && (
                          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                            <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="truncate flex-1 text-blue-800 text-xs">{selectedFile.name}</span>
                            <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}><X className="w-4 h-4 text-blue-400 hover:text-red-500" /></button>
                          </div>
                        )}
                        <div className="flex items-end gap-2">
                          <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach file (images, PDFs, DXF/DWG)"
                            className="p-2.5 text-gray-400 hover:text-[#003D82] hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0">
                            <Paperclip className="w-5 h-5" />
                          </button>
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.dxf,.dwg"
                            onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                          <textarea value={replyMessage} onChange={e => { setReplyMessage(e.target.value); sendTypingIndicator(); }}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }}
                            placeholder="Type a message… (Enter to send)"
                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] resize-none text-sm"
                            rows={2} disabled={isSending || isUploading} />
                          <button type="submit" disabled={(!replyMessage.trim() && !selectedFile) || isSending || isUploading}
                            className="px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5 self-end">
                            {isSending || isUploading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-4 border-t border-gray-100 bg-amber-50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0"><Lock className="w-4 h-4 text-amber-600" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">Unlock this conversation</p>
                            <p className="text-gray-500 text-xs">50 tokens one-time · Free messaging forever after · Both parties can respond</p>
                          </div>
                          <button onClick={() => setShowUnlockModal(true)} className="px-4 py-2 bg-[#003D82] hover:bg-[#002960] text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors">
                            <Unlock className="w-3.5 h-3.5" /> Unlock
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                    <MessageSquare className="w-16 h-16 text-gray-200" />
                    <p className="text-sm">Select a conversation or start a new one</p>
                  </div>
                )}
              </div>

              {/* Right Sidebar — Company & Team */}
              <div className="w-64 border-l border-gray-100 flex flex-col flex-shrink-0 bg-gray-50/30">
                {userCompanyId && userCompanyName ? (
                  <>
                    {/* Company Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-[#FF6B35]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{userCompanyName}</p>
                          <p className="text-xs text-gray-500">Your Company</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/company/${userCompanyId}`}
                          className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 bg-[#003D82] hover:bg-[#002960] text-white text-xs font-semibold rounded-lg transition-colors">
                          <Settings2 className="w-3.5 h-3.5" /> Manage
                        </Link>
                        <button onClick={() => setShowInviteMemberModal(true)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-xs font-semibold rounded-lg transition-colors">
                          <UserPlus className="w-3.5 h-3.5" /> Invite
                        </button>
                      </div>
                    </div>

                    {/* Company Channel */}
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Team Channel</p>
                      {companyChannel ? (
                        <motion.button
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedConversation(companyChannel)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                            selectedConversation?.id === companyChannel.id
                              ? 'bg-[#003D82] text-white shadow-md'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${selectedConversation?.id === companyChannel.id ? 'text-white/80' : 'text-[#FF6B35]'}`} />
                          <span className="text-xs font-semibold truncate">General</span>
                          {companyChannel.unread_count > 0 && (
                            <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              selectedConversation?.id === companyChannel.id ? 'bg-white/20 text-white' : 'bg-[#FF6B35] text-white'
                            }`}>{companyChannel.unread_count}</span>
                          )}
                        </motion.button>
                      ) : (
                        <p className="text-xs text-gray-400 px-1">Loading...</p>
                      )}
                    </div>

                    {/* Team Members */}
                    <div className="flex-1 overflow-y-auto p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Team Members</p>
                      <div className="space-y-1">
                        {teamMembers.length === 0 ? (
                          <p className="text-xs text-gray-400 px-1 py-2">No members</p>
                        ) : (
                          teamMembers.map((tm: any) => (
                            <div key={tm.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                {tm.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-gray-900 truncate">{tm.profile?.full_name || 'Unknown'}</p>
                                <p className="text-[10px] text-gray-500 capitalize">{tm.role}</p>
                              </div>
                              {tm.role === 'owner' && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                      <Building2 className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="font-semibold text-gray-700 text-sm mb-1">No Company</p>
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">Create or claim your company to unlock team channels and free internal messaging.</p>
                    <Link href="/companies/create"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white text-xs font-semibold rounded-lg transition-colors">
                      <Building2 className="w-3.5 h-3.5" /> Create Company
                    </Link>
                    <Link href="/companies"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-[#003D82] hover:underline">
                      <Search className="w-3 h-3" /> Claim Existing
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unlock Modal */}
      <AnimatePresence>
        {showUnlockModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-gradient-to-r from-[#001f4d] via-[#003D82] to-[#005BB5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Unlock className="w-5 h-5 text-white" /></div>
                  <div><h3 className="text-xl font-bold text-white">Unlock Conversation</h3><p className="text-blue-100 text-sm">One-time fee · Free forever after</p></div>
                </div>
                <button onClick={() => { setShowUnlockModal(false); setPaywallSecret(null); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-[#FF6B35]" /><span className="text-sm text-gray-600">Your balance</span></div>
                  <span className="font-bold text-gray-900">{(tokenBalance ?? 0).toLocaleString()} tokens</span>
                </div>
                <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800 space-y-0.5">
                    <p className="font-semibold text-blue-900 text-sm mb-1">What you get</p>
                    <p>✓ Unlimited free messages in this thread</p>
                    <p>✓ Share files, specs, CAD drawings, PDFs</p>
                    <p>✓ The other person can reply freely too</p>
                    <p>✓ Filters spam — only serious contacts</p>
                  </div>
                </div>
                {(tokenBalance ?? 0) >= UNLOCK_COST ? (
                  <button onClick={handleUnlock} disabled={isUnlocking} className="w-full py-3 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isUnlocking ? <Loader className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />}
                    Unlock for {UNLOCK_COST} tokens
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">You need {UNLOCK_COST - (tokenBalance ?? 0)} more tokens. Top up:</p>
                    {paywallSecret ? (
                      <Elements stripe={stripePromise} options={{ clientSecret: paywallSecret }}>
                        <TokenPackPaymentForm
                          onSuccess={async (paymentIntentId) => {
                            await fetch('/api/messages/credit-tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId }) });
                            const supabase = createClient();
                            const { data: p } = await supabase.from('profiles').select('token_balance').eq('id', currentUserId).single();
                            const newBal = p?.token_balance ?? 0;
                            setTokenBalance(newBal);
                            setPaywallSecret(null);
                            if (newBal >= UNLOCK_COST) await handleUnlock();
                          }}
                          onBack={() => setPaywallSecret(null)}
                        />
                      </Elements>
                    ) : (
                      tokenPacks.map(pack => (
                        <TokenPackCard key={pack.id} pack={pack} onSelect={async () => {
                          const res = await fetch('/api/stripe/buy-tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId: pack.id }) });
                          const d = await res.json();
                          if (d.clientSecret) setPaywallSecret(d.clientSecret); else toast.error('Failed to start checkout');
                        }} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Conversation Modal */}
      <AnimatePresence>
        {showNewConvModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewConvModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">New Direct Message</h3>
                <p className="text-gray-500 text-sm mt-0.5">Connect with someone new</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Search by name or email</label>
                  <div className="relative mt-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Enter name or email..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                  </div>
                </div>
                {searchQuery.length >= 2 && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {isSearching ? (
                      <div className="flex justify-center py-3"><Loader className="w-4 h-4 text-[#003D82] animate-spin" /></div>
                    ) : searchResults.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-3">No users found</p>
                    ) : (
                      searchResults.map(u => (
                        <button key={u.id} type="button" onClick={() => startConversation(u)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left">
                          <Avatar user={u} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowNewConvModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="button" onClick={() => { setSearchQuery(''); setShowNewConvModal(false); }}
                    className="flex-1 px-4 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-lg transition-all">
                    <Plus className="w-4 h-4" /> New Message
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {showCreateChannelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">Create a New Channel</h3>
                <p className="text-gray-500 text-sm mt-0.5">Channels are for group messaging.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Channel Name</label>
                  <input type="text" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm resize-none" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Channel Type</label>
                  <div className="mt-1 flex gap-2">
                    <button type="button" onClick={() => setNewChannelType('channel')}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${newChannelType === 'channel' ? 'bg-[#003D82] text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                      <Hash className="w-4 h-4" /> Channel
                    </button>
                    <button type="button" onClick={() => setNewChannelType('group')}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${newChannelType === 'group' ? 'bg-[#003D82] text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                      <Users className="w-4 h-4" /> Group
                    </button>
                  </div>
                </div>
                {newChannelType === 'channel' && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="publicChannel" checked={newChannelPublic} onChange={e => setNewChannelPublic(e.target.checked)}
                      className="w-4 h-4 text-[#003D82] border-gray-300 rounded focus:ring-2 focus:ring-[#003D82]/30" />
                    <label htmlFor="publicChannel" className="text-sm text-gray-700 cursor-pointer">Make this channel public</label>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {newChannelType === 'group' ? 'Add Members' : 'Invite Members (optional)'}
                  </label>
                  {selectedMembers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedMembers.map(m => (
                        <span key={m.id} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-[#003D82]">
                          <Avatar user={m} size="sm" />{m.full_name}
                          <button type="button" onClick={() => setSelectedMembers(prev => prev.filter(x => x.id !== m.id))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative mt-2">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={memberSearchQuery} onChange={e => setMemberSearchQuery(e.target.value)}
                      placeholder="Search by name..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                  </div>
                  {memberSearchQuery.length >= 2 && (
                    <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {isMemberSearching ? (
                        <div className="flex justify-center py-3"><Loader className="w-4 h-4 text-[#003D82] animate-spin" /></div>
                      ) : memberSearchResults.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-3">No users found</p>
                      ) : (
                        memberSearchResults.map(u => (
                          <button key={u.id} type="button" onClick={() => toggleSelectedMember(u)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left">
                            <Avatar user={u} size="sm" />
                            <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p><p className="text-xs text-gray-500 truncate">{u.email}</p></div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCreateChannelModal(false); setSelectedMembers([]); setMemberSearchQuery(''); }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="button" onClick={async () => {
                    if (!newChannelName.trim()) { toast.error('Channel name is required'); return; }
                    const supabase = createClient();
                    const { data: newConvData, error } = await supabase.from('user_conversations').insert({
                      conversation_type: newChannelType, name: newChannelName.trim(), description: newChannelDesc.trim(),
                      is_public: newChannelType === 'group' ? false : newChannelPublic, created_at: new Date().toISOString(), last_message_at: new Date().toISOString(),
                    }).select().single();
                    if (error) { toast.error('Failed to create channel'); return; }
                    const participantRows = [
                      { conversation_id: newConvData.id, user_id: currentUserId, role: 'owner' },
                      ...selectedMembers.map(m => ({ conversation_id: newConvData.id, user_id: m.id, role: 'member' })),
                    ];
                    await supabase.from('conversation_participants').insert(participantRows);
                    const newConv = { ...(newConvData as any), other_user: null, unread_count: 0 } as Conversation;
                    if (newChannelType === 'channel') setChannels(prev => [...prev, newConv]);
                    else setGroups(prev => [...prev, newConv]);
                    setShowCreateChannelModal(false);
                    setNewChannelName(''); setNewChannelDesc(''); setNewChannelType('channel'); setNewChannelPublic(true);
                    setSelectedMembers([]); setMemberSearchQuery('');
                    toast.success(newChannelType === 'group' ? 'Group created!' : 'Channel created!');
                  }} className="flex-1 px-4 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-lg transition-all">
                    <Plus className="w-4 h-4" /> Create {newChannelType === 'group' ? 'Group' : 'Channel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel Settings Modal */}
      <AnimatePresence>
        {showChannelSettings && selectedConversation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-5 bg-gradient-to-r from-[#001f4d] via-[#003D82] to-[#005BB5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    {selectedConversation.conversation_type === 'channel' ? <Hash className="w-5 h-5 text-white" /> : <Briefcase className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedConversation.name || 'Channel'} Settings</h3>
                    <p className="text-blue-100 text-sm capitalize">{selectedConversation.conversation_type}</p>
                  </div>
                </div>
                <button onClick={() => setShowChannelSettings(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
              </div>
              <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">

                {/* Rename */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Edit3 className="w-4 h-4" /> Rename</label>
                  <div className="flex gap-2">
                    <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                    <button onClick={handleRenameChannel} disabled={isRenaming || !renameValue.trim()}
                      className="px-4 py-2 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-lg text-sm disabled:opacity-50">
                      {isRenaming ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Members */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Users className="w-4 h-4" /> Members ({channelParticipants.length})</label>
                    {myChannelRole && ['owner', 'admin'].includes(myChannelRole) && (
                      <button onClick={() => setShowAddMemberModal(true)}
                        className="text-xs text-[#003D82] hover:text-[#002960] font-semibold flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-1">
                    {channelParticipants.length === 0 ? (
                      <p className="text-xs text-gray-400 p-3 text-center">Loading members...</p>
                    ) : (
                      channelParticipants.map((p: any) => (
                        <div key={p.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                            {p.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{p.profile?.full_name || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-500 capitalize">{p.role}</p>
                          </div>
                          {p.role === 'owner' && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                          {myChannelRole === 'owner' && p.user_id !== currentUserId && (
                            <div className="flex items-center gap-1">
                              {p.role !== 'admin' && (
                                <button onClick={() => handleUpdateRole(p.user_id, 'admin', p.profile?.full_name || 'User')}
                                  className="p-1 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600" title="Promote to admin">
                                  <Shield className="w-3 h-3" />
                                </button>
                              )}
                              {p.role === 'admin' && (
                                <button onClick={() => handleUpdateRole(p.user_id, 'member', p.profile?.full_name || 'User')}
                                  className="p-1 hover:bg-amber-100 rounded text-gray-400 hover:text-amber-600" title="Demote to member">
                                  <UserMinus className="w-3 h-3" />
                                </button>
                              )}
                              <button onClick={() => handleRemoveMember(p.user_id, p.profile?.full_name || 'User')}
                                className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600" title="Remove">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Danger zone */}
                {myChannelRole === 'owner' && (
                  <div className="border-t border-red-100 pt-4">
                    <label className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-2"><Trash2 className="w-4 h-4" /> Danger Zone</label>
                    <button onClick={handleDeleteChannel}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" /> Delete this {selectedConversation.conversation_type === 'channel' ? 'Channel' : 'Project'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Member to Company Modal */}
      <AnimatePresence>
        {showInviteMemberModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#FF6B35]" /> Invite to Company</h3>
                <p className="text-gray-500 text-sm mt-0.5">They will get a DM with Accept/Decline buttons</p>
              </div>
              <div className="p-5">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={inviteMemberSearch} onChange={e => {
                    setInviteMemberSearch(e.target.value);
                    if (e.target.value.length >= 2) {
                      const supabase = createClient();
                      supabase.from('profiles').select('id, full_name, email, user_type, avatar_url')
                        .neq('id', currentUserId!).ilike('full_name', `%${e.target.value}%`).limit(10)
                        .then(({ data }) => setInviteMemberResults(data || []));
                    } else { setInviteMemberResults([]); }
                  }} placeholder="Search by name..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {inviteMemberResults.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">{inviteMemberSearch.length < 2 ? 'Type at least 2 characters' : 'No users found'}</p>
                  ) : (
                    inviteMemberResults.map(u => {
                      const alreadyInvited = invitedUserIds.has(u.id);
                      const isThisLoading = invitingUserId === u.id;
                      return (
                      <button key={u.id} type="button" onClick={() => !alreadyInvited && !isThisLoading && handleSendInvite(u)} disabled={alreadyInvited || isThisLoading}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left disabled:opacity-50 ${alreadyInvited ? 'bg-green-50' : 'hover:bg-blue-50'}`}>
                        <Avatar user={u} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        {alreadyInvited ? (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-4 h-4" /> Invited</span>
                        ) : isThisLoading ? (
                          <Loader className="w-4 h-4 animate-spin text-[#003D82]" />
                        ) : (
                          <UserPlus className="w-4 h-4 text-[#FF6B35] flex-shrink-0" />
                        )}
                      </button>
                    )})
                  )}
                </div>
                <button onClick={() => { setShowInviteMemberModal(false); setInviteMemberSearch(''); setInviteMemberResults([]); setInvitedUserIds(new Set()); }}
                  className="mt-3 w-full px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm">Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMemberModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Add Member</h3>
                <p className="text-gray-500 text-sm mt-0.5">Add someone to this {selectedConversation?.conversation_type === 'channel' ? 'channel' : 'project'}</p>
              </div>
              <div className="p-5">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={addMemberSearch} onChange={e => {
                    setAddMemberSearch(e.target.value);
                    if (e.target.value.length >= 2) {
                      const supabase = createClient();
                      supabase.from('profiles').select('id, full_name, email, user_type, avatar_url')
                        .neq('id', currentUserId!).ilike('full_name', `%${e.target.value}%`).limit(10)
                        .then(({ data }) => setAddMemberResults((data || []).filter(u => !channelParticipants.some(p => p.user_id === u.id))));
                    } else { setAddMemberResults([]); }
                  }} placeholder="Search by name..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {addMemberResults.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">{addMemberSearch.length < 2 ? 'Type at least 2 characters' : 'No users found'}</p>
                  ) : (
                    addMemberResults.map(u => (
                      <button key={u.id} type="button" onClick={() => handleAddMember(u)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left">
                        <Avatar user={u} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        <UserPlus className="w-4 h-4 text-[#003D82] ml-auto flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>
                <button onClick={() => { setShowAddMemberModal(false); setAddMemberSearch(''); setAddMemberResults([]); }}
                  className="mt-3 w-full px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

function SidebarSection({ title, icon, items, collapsed, onToggle, selectedId, currentUserId, onSelect, filter }: {
  title: string; icon: React.ReactNode; items: Conversation[]; collapsed: boolean; onToggle: () => void;
  selectedId?: string | null; currentUserId: string | null; onSelect: (c: Conversation) => void; filter: string;
}) {
  const filtered = items.filter(c => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (c.name?.toLowerCase().includes(q)) || (c.other_user?.full_name?.toLowerCase().includes(q));
  });
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 transition-colors text-left">
        {collapsed ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-[10px] text-gray-400">{filtered.length}</span>
      </button>
      {!collapsed && (
        <div className="pb-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 px-6 py-2">No {title.toLowerCase()}</p>
          ) : (
            filtered.map(c => (
              <motion.button key={c.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={() => onSelect(c)}
                className={`w-full flex items-center gap-2 px-4 py-1.5 text-left transition-all ${selectedId === c.id ? 'bg-[#003D82] text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                {c.conversation_type === 'direct' ? (
                  <Avatar user={c.other_user} size="sm" />
                ) : (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedId === c.id ? 'bg-white/20' : 'bg-[#003D82]/10'}`}>
                    {c.conversation_type === 'channel' ? <Hash className="w-3.5 h-3.5 text-[#003D82]" /> : <Users className="w-3.5 h-3.5 text-[#003D82]" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{c.conversation_type === 'direct' ? c.other_user?.full_name : c.name || 'Unnamed'}</p>
                  {c.last_message && <p className="text-[10px] text-gray-400 truncate">{messagePreview(c.last_message.content)}</p>}
                </div>
                {c.unread_count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${selectedId === c.id ? 'bg-white/20 text-white' : 'bg-[#003D82] text-white'}`}>{c.unread_count}</span>
                )}
              </motion.button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader className="w-8 h-8 text-[#003D82] animate-spin" /></div>}>
      <MessagesPageInner />
    </Suspense>
  );
}
