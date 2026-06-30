'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MessageSquare, Send, Loader, User, Clock, Search, X, Plus,
  CheckCheck, Check, Lock, Unlock, DollarSign, ShieldCheck,
  Paperclip, FileText, Download, ExternalLink, Zap,
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
const UNLOCK_COST = 100;

interface UserProfile { id: string; full_name: string; email: string; user_type: string; avatar_url?: string | null; }
interface Conversation {
  id: string; participant_one_id: string; participant_two_id: string;
  last_message_at: string; created_at: string; is_unlocked: boolean;
  other_user: UserProfile; last_message?: { content: string; sender_id: string; created_at: string } | null;
  unread_count: number;
}
interface Message {
  id: string; conversation_id: string; sender_id: string; content: string;
  is_read: boolean; read_at: string | null; created_at: string; is_system_message?: boolean;
  attachment_url?: string | null; attachment_name?: string | null; attachment_type?: 'image' | 'pdf' | 'file' | null;
}

function Avatar({ user, size = 'md' }: { user: UserProfile | null; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base';
  if (user?.avatar_url) return <img src={user.avatar_url} alt={user.full_name} className={`${sz} rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm`} />;
  return <div className={`${sz} rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold flex-shrink-0`}>{user?.full_name?.charAt(0)?.toUpperCase() || 'U'}</div>;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { initializeUser(); }, []);
  useEffect(() => { if (currentUserId) loadConversations(); }, [currentUserId]);
  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation.id);
    markMessagesAsRead(selectedConversation.id);
    setupRealtime(selectedConversation.id);
    return () => { if (realtimeRef.current) { createClient().removeChannel(realtimeRef.current); realtimeRef.current = null; } };
  }, [selectedConversation?.id]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    const withId = searchParams.get('with');
    if (!withId || !currentUserId || isLoadingConversations) return;
    if (withId === currentUserId) return;
    const existing = conversations.find(c => c.other_user?.id === withId);
    if (existing) setSelectedConversation(existing); else openOrCreateConversation(withId);
  }, [searchParams, currentUserId, isLoadingConversations]);
  useEffect(() => { if (searchQuery.length >= 2) searchUsers(); else setSearchResults([]); }, [searchQuery]);

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
      .subscribe();
    realtimeRef.current = channel;
  }, [currentUserId]);

  const initializeUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('token_balance').eq('id', user.id).single();
      if (profile) setTokenBalance(profile.token_balance ?? 0);
      setTokenPacks([
        { id: 'starter', name: 'Starter', tokens: 100, price_cents: 1000, unlocks: 1 },
        { id: 'pro', name: 'Pro', tokens: 500, price_cents: 4500, unlocks: 5 },
        { id: 'business', name: 'Business', tokens: 1200, price_cents: 9900, unlocks: 12 },
      ]);
    } catch (err: any) { console.error('initializeUser:', err); toast.error('Failed to load profile'); }
  };

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const supabase = createClient();
      const { data: convData, error } = await supabase.from('user_conversations').select('*')
        .or(`participant_one_id.eq.${currentUserId},participant_two_id.eq.${currentUserId}`)
        .order('last_message_at', { ascending: false });
      if (error) { if ((error as any)?.code === '42P01') { setConversations([]); return; } throw error; }
      const withDetails = await Promise.all((convData || []).map(async (conv) => {
        const otherId = conv.participant_one_id === currentUserId ? conv.participant_two_id : conv.participant_one_id;
        const [{ data: otherUser }, { data: lastMsg }, { count }] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email, user_type, avatar_url').eq('id', otherId).single(),
          supabase.from('user_messages').select('content, sender_id, created_at').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1).single(),
          supabase.from('user_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('is_read', false).neq('sender_id', currentUserId),
        ]);
        return { ...conv, other_user: otherUser, last_message: lastMsg, unread_count: count || 0 };
      }));
      setConversations(withDetails as Conversation[]);
      if (selectedConversation) { const u = withDetails.find(c => c.id === selectedConversation.id); if (u) setSelectedConversation(u as Conversation); }
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

  const isFreeConversation = (conv: Conversation) => conv.is_unlocked;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyMessage.trim() && !selectedFile) || !selectedConversation || !currentUserId) return;
    if (!isFreeConversation(selectedConversation)) { setShowUnlockModal(true); return; }
    setIsSending(true);
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
        body: JSON.stringify({ conversationId: selectedConversation.id, content: replyMessage.trim(), ...(attachmentUrl && { attachmentUrl, attachmentName, attachmentType }) }),
      });
      if (res.status === 402) { setShowUnlockModal(true); return; }
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to send');
      const data = await res.json();
      setMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message]);
      setReplyMessage('');
      await loadConversations();
    } catch (err: any) { console.error('handleSendMessage:', err); toast.error(err.message || 'Failed to send message'); }
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
      const { data } = await supabase.from('profiles').select('id, full_name, email, user_type, avatar_url').neq('id', currentUserId!).ilike('full_name', `%${searchQuery}%`).limit(10);
      setSearchResults(data || []);
    } finally { setIsSearching(false); }
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

              {/* Sidebar */}
              <div className="w-80 border-r border-gray-100 flex flex-col flex-shrink-0">
                <div className="p-3 border-b border-gray-100 space-y-2">
                  <button onClick={() => setShowNewConvModal(true)} className="w-full flex items-center justify-center gap-2 bg-[#003D82] hover:bg-[#002960] text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm">
                    <Plus className="w-4 h-4" /> New Message
                  </button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={convFilter} onChange={e => setConvFilter(e.target.value)} placeholder="Filter conversations..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82]" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {isLoadingConversations ? <div className="flex justify-center p-8"><Loader className="w-6 h-6 text-[#003D82] animate-spin" /></div>
                    : filtered.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                        <p className="text-sm">{convFilter ? 'No matches' : 'No conversations yet'}</p>
                      </div>
                    ) : filtered.map(conv => (
                      <motion.button key={conv.id} onClick={() => setSelectedConversation(conv)} whileHover={{ x: 2 }}
                        className={`w-full p-3 text-left border-b border-gray-50 hover:bg-blue-50/60 transition-colors ${selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-2 border-l-[#003D82]' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar user={conv.other_user} size="md" />
                            {conv.is_unlocked && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"><Unlock className="w-2 h-2 text-white" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-semibold text-gray-900 truncate text-sm">{conv.other_user?.full_name || 'Unknown'}</span>
                              {conv.unread_count > 0 && <span className="ml-1 px-1.5 py-0.5 bg-[#003D82] text-white text-xs font-bold rounded-full">{conv.unread_count}</span>}
                            </div>
                            <span className={`inline-block px-1.5 py-0.5 text-xs rounded font-medium mb-1 ${conv.is_unlocked ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                              {conv.is_unlocked ? '🔓 Unlocked' : '🔒 Locked'}
                            </span>
                            {conv.last_message && <p className="text-xs text-gray-500 truncate">{conv.last_message.sender_id === currentUserId ? 'You: ' : ''}{conv.last_message.content || '[attachment]'}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </motion.button>
                    ))
                  }
                </div>
              </div>

              {/* Thread */}
              <div className="flex-1 flex flex-col min-w-0">
                {selectedConversation ? (
                  <>
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        <Avatar user={selectedConversation.other_user} size="md" />
                        <div>
                          <h2 className="font-bold text-gray-900">{selectedConversation.other_user?.full_name}</h2>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 capitalize">{selectedConversation.other_user?.user_type}</span>
                            {selectedConversation.other_user?.id && (
                              <Link href={`/profiles/${selectedConversation.other_user.id}`} className="text-xs text-[#003D82] hover:underline flex items-center gap-0.5">
                                View Profile <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedConversation.is_unlocked && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1"><Unlock className="w-3 h-3" /> Unlocked</span>}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {isLoadingMessages ? <div className="flex justify-center items-center h-full"><Loader className="w-7 h-7 text-[#003D82] animate-spin" /></div>
                        : messages.length === 0 ? <div className="flex flex-col justify-center items-center h-full text-gray-400 gap-2"><MessageSquare className="w-12 h-12 text-gray-200" /><p className="text-sm">No messages yet — say hello!</p></div>
                        : <>
                          {messages.map(msg => {
                            const isOwn = msg.sender_id === currentUserId;
                            if (msg.is_system_message) return (
                              <div key={msg.id} className="flex justify-center my-2">
                                <span className="text-xs bg-gray-100 text-gray-500 px-4 py-1.5 rounded-full border border-gray-200">{msg.content}</span>
                              </div>
                            );
                            return (
                              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[68%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                  <div className={`rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-[#003D82] text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                                    {msg.content && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
                                    <AttachmentDisplay msg={msg} isOwn={isOwn} />
                                  </div>
                                  <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                                    {isOwn && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5" />)}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                          <div ref={messagesEnd} />
                        </>
                      }
                    </div>

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
                          <textarea value={replyMessage} onChange={e => setReplyMessage(e.target.value)}
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
                            <p className="text-gray-500 text-xs">100 tokens (~$10) one-time · Free messaging forever after · Both parties can respond</p>
                          </div>
                          <button onClick={() => setShowUnlockModal(true)} className="px-4 py-2 bg-[#003D82] hover:bg-[#002960] text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors flex-shrink-0">
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">New Message</h3>
                <button onClick={() => setShowNewConvModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search engineers or clients..." autoFocus
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-80">
                {isSearching ? <div className="flex justify-center py-8"><Loader className="w-6 h-6 text-[#003D82] animate-spin" /></div>
                  : searchResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <User className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      <p className="text-sm">{searchQuery.length >= 2 ? 'No users found' : 'Start typing to search'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map(u => (
                        <motion.button key={u.id} onClick={() => startConversation(u)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                          className="w-full p-3 border border-gray-200 rounded-xl hover:border-[#003D82] hover:bg-blue-50 transition-all text-left">
                          <div className="flex items-center gap-3">
                            <Avatar user={u} size="md" />
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{u.full_name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">{u.user_type === 'engineer' ? 'Engineer' : 'Client'}</span>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )
                }
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-[#003D82]" /></div>}>
      <MessagesPageInner />
    </Suspense>
  );
}
