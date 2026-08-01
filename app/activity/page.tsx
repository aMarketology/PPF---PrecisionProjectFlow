'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import {
  TrendingUp, FileText, Award, MessageCircle, ShoppingCart, CheckCircle2,
  Building2, UserPlus, Hash, Search, ChevronDown, Plus, Loader, X, Loader2,
  ExternalLink, Clock,
} from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface SiteActivity {
  id: string; activity_type: string; actor_id: string; target_type: string | null; target_id: string | null;
  summary: string; metadata: Record<string, any>; previous_hash: string | null; row_hash: string;
  created_at: string; actor: { id: string; full_name: string; avatar_url: string | null; user_type: string } | null;
}

const ACTIVITY_TYPES = [
  { value: 'all',                 label: 'All Activity',     icon: TrendingUp },
  { value: 'rfq_posted',          label: 'RFQs Posted',     icon: FileText },
  { value: 'offer_submitted',     label: 'Offers',          icon: TrendingUp },
  { value: 'rfq_awarded',         label: 'Awarded',         icon: Award },
  { value: 'order_placed',        label: 'Orders',          icon: ShoppingCart },
  { value: 'company_joined',      label: 'New Companies',   icon: Building2 },
  { value: 'team_member_added',   label: 'Team Joins',      icon: UserPlus },
  { value: 'social_post_created', label: 'Community Posts', icon: MessageCircle },
] as const

function Avatar({ src, name }: { src?: string | null; name: string }) {
  if (src) return <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white" />
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#003D82] to-[#0066C0] text-white font-bold text-xs ring-2 ring-white">
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    rfq_posted:          <FileText className="w-4 h-4" />,
    rfq_awarded:         <Award className="w-4 h-4" />,
    offer_submitted:     <TrendingUp className="w-4 h-4" />,
    social_post_created: <MessageCircle className="w-4 h-4" />,
    order_placed:        <ShoppingCart className="w-4 h-4" />,
    order_completed:     <CheckCircle2 className="w-4 h-4" />,
    company_joined:      <Building2 className="w-4 h-4" />,
    team_member_added:   <UserPlus className="w-4 h-4" />,
  }
  return iconMap[type] || <FileText className="w-4 h-4" />
}

function iconBg(type: string): string {
  const map: Record<string, string> = {
    rfq_posted:          'bg-blue-100 text-blue-600',
    rfq_awarded:         'bg-emerald-100 text-emerald-600',
    offer_submitted:     'bg-rose-100 text-rose-600',
    social_post_created: 'bg-purple-100 text-purple-600',
    order_placed:        'bg-amber-100 text-amber-600',
    order_completed:     'bg-green-100 text-green-600',
    company_joined:      'bg-cyan-100 text-cyan-600',
    team_member_added:   'bg-rose-100 text-rose-600',
  }
  return map[type] || 'bg-gray-100 text-gray-600'
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<SiteActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalActivities, setTotalActivities] = useState(0)
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const realtimeRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    loadActivities(0, 'all', '')
    const supabase = createClient()
    const channel = supabase.channel('sa_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_activities' }, (payload) => {
        const a = payload.new as SiteActivity
        loadActorThenAdd(a)
      })
      .subscribe()
    realtimeRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadActorThenAdd = async (activity: SiteActivity) => {
    const supabase = createClient()
    const { data: actor } = await supabase.from('profiles').select('id, full_name, avatar_url, user_type').eq('id', activity.actor_id).single()
    setActivities(prev => [{ ...activity, actor }, ...prev])
    setTotalActivities(prev => prev + 1)
  }

  const loadActivities = async (p: number, type: string, search: string) => {
    if (p === 0) setIsLoading(true); else setIsLoadingMore(true)
    try {
      const res = await fetch(`/api/activities?page=${p}&type=${type}&search=${search}`)
      const data = await res.json()
      setActivities(p === 0 ? (data.activities ?? []) : prev => [...prev, ...(data.activities ?? [])])
      setHasMore(data.hasMore ?? false)
      setTotalActivities(data.total ?? 0)
      setPage(p)
    } catch (err) { console.error(err) }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(0); loadActivities(0, filterType, searchQuery) }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Hash className="w-4 h-4 text-[#FF6B35]" /> Blockchain Activity Feed
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Activity Feed</h1>
            <p className="text-blue-200 text-lg">Real-time platform activity — cryptographically chained</p>
            <p className="text-blue-300/70 text-sm mt-1">{totalActivities} total events on the ledger</p>
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5 overflow-x-auto flex-1">
              {ACTIVITY_TYPES.map(at => {
                const Icon = at.icon
                const isActive = filterType === at.value
                return (
                  <button key={at.value} onClick={() => { setFilterType(at.value); setPage(0); loadActivities(0, at.value, searchQuery) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#003D82] text-white border-[#003D82]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                    <Icon className="w-3 h-3" />{at.label}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg flex-shrink-0 ${showSearch ? 'bg-[#003D82] text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
              <Search className="w-4 h-4" />
            </button>
          </div>
          <AnimatePresence>
            {showSearch && (
              <motion.form onSubmit={handleSearch} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex gap-2 pt-2">
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search all activity..." autoFocus
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none" />
                  <button type="submit" className="px-4 py-2 bg-[#003D82] text-white font-semibold rounded-xl text-sm">Search</button>
                  {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); loadActivities(0, filterType, '') }} className="text-sm text-gray-500">Clear</button>}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
            <p className="text-gray-400 text-sm font-medium">Loading activity feed...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-700 mb-1">No activity found</p>
            <p className="text-sm text-gray-400 mb-4">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activities.map(a => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg(a.activity_type)}`}>
                        <ActivityIcon type={a.activity_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {a.actor && <span className="font-semibold text-gray-900 text-sm truncate">{a.actor.full_name}</span>}
                          <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{a.summary}</p>
                        {a.metadata?.budget && <p className="text-xs text-emerald-600 font-semibold mt-1">Budget: {a.metadata.budget}</p>}
                        {a.metadata?.location && <p className="text-xs text-gray-500 mt-0.5">📍 {a.metadata.location}</p>}
                        {a.metadata?.category && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-50 text-[#003D82] text-[10px] font-semibold rounded-full">{a.metadata.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                      <Hash className="w-3 h-3" />
                      <span className="truncate max-w-[120px]" title={a.row_hash}>{a.row_hash?.substring(0, 16) || 'pending'}...</span>
                    </div>
                    {a.target_type === 'rfq' && a.target_id && (
                      <Link href={`/rfq/${a.target_id}`} className="text-xs font-semibold text-[#003D82] hover:text-[#002960] flex items-center gap-1">
                        View RFQ <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-6">
                <button onClick={() => loadActivities(page + 1, filterType, searchQuery)} disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-3 text-[#003D82] font-semibold hover:bg-blue-50 rounded-xl disabled:opacity-50 text-sm">
                  {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />} Load more
                </button>
              </div>
            )}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600">🔗 SHA256 Hash Chain Ledger</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Every platform action is cryptographically chained to the previous one. Each entry&apos;s <code className="bg-gray-200 px-1 rounded">row_hash</code> = SHA256(id + type + actor + previous_hash). Immutable and verifiable.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}