'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, CheckCheck, Clock, Loader2, MessageSquare, Trash2, Filter, ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { notificationStyle } from '@/lib/notifications'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
  actor: { id: string; full_name: string; avatar_url: string | null } | null
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
] as const

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const realtimeRef = useRef<RealtimeChannel | null>(null)
  const LIMIT = 20

  const load = useCallback(async (nextOffset: number, nextFilter: 'all' | 'unread', append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const res = await fetch(
        `/api/notifications?limit=${LIMIT}&offset=${nextOffset}&unreadOnly=${nextFilter === 'unread'}`
      )
      if (res.status === 401) {
        router.replace('/login?redirect=/notifications')
        return
      }
      const data = await res.json()
      const items: NotificationItem[] = data.notifications ?? []
      setNotifications(prev => (append ? [...prev, ...items] : items))
      setUnreadCount(data.unreadCount ?? 0)
      setHasMore(data.hasMore ?? false)
      setOffset(nextOffset)
    } catch (error) {
      console.error('loadNotifications:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [router])

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?redirect=/notifications')
        return
      }
      await load(0, 'all', false)

      channel = supabase
        .channel('notifications-page')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
          () => { load(0, 'all', false) }
        )
        .subscribe()
      realtimeRef.current = channel
    }
    init()
    return () => { if (channel) createClient().removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeFilter = (next: 'all' | 'unread') => {
    setFilter(next)
    load(0, next, false)
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (filter === 'unread') load(0, 'unread', false)
    } catch (e) { console.error(e) }
  }

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
    } catch (e) { console.error(e) }
  }

  const remove = async (id: string) => {
    const target = notifications.find(n => n.id === id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (target && !target.is_read) setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    } catch (e) { console.error(e) }
  }

  const clearAll = async () => {
    setNotifications([])
    setUnreadCount(0)
    setHasMore(false)
    try {
      await fetch('/api/notifications?all=true', { method: 'DELETE' })
    } catch (e) { console.error(e) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)',
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
              <Bell className="h-6 w-6 text-[#FF6B35]" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Notifications</h1>
              <p className="text-sm text-blue-200">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'} · personal activity inbox
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => changeFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filter === f.value
                    ? 'bg-[#003D82] text-white border-[#003D82]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {f.label}
                {f.value === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-[#FF6B35] text-white text-[10px] rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#003D82] hover:text-[#002960] px-2 py-1.5 rounded-lg hover:bg-blue-50"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#003D82]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <CheckCheck className="mb-3 h-12 w-12 text-emerald-300" />
              <h2 className="font-bold text-gray-900">
                {filter === 'unread' ? 'No unread notifications' : 'You are all caught up'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'unread'
                  ? 'Everything has been read.'
                  : 'New RFQs, offers, orders and team updates will appear here.'}
              </p>
              <div className="mt-5 flex items-center gap-2">
                <Link
                  href="/activity"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003D82] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002960]"
                >
                  Browse Activity Feed
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#003D82] px-4 py-2.5 text-sm font-semibold text-[#003D82] hover:bg-blue-50"
                >
                  <MessageSquare className="h-4 w-4" /> Messages
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence initial={false}>
                {notifications.map(n => {
                  const style = notificationStyle(n.type)
                  const Icon = style.icon
                  const row = (
                    <div className={`flex items-start gap-3 px-4 py-4 sm:px-5 transition-colors ${n.is_read ? 'hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50'}`}>
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${style.chip}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">{n.title}</p>
                            {!n.is_read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#FF6B35]" />}
                          </div>
                          <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {n.body && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{n.body}</p>}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="inline-block rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                            {style.label}
                          </span>
                          {n.actor?.full_name && (
                            <span className="text-[11px] text-gray-400">by {n.actor.full_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )

                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="group relative"
                    >
                      {n.link ? (
                        <Link href={n.link} onClick={() => markRead(n.id)} className="block">
                          {row}
                        </Link>
                      ) : (
                        <button onClick={() => markRead(n.id)} className="block w-full text-left">
                          {row}
                        </button>
                      )}
                      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => markRead(n.id)}
                            className="rounded-lg bg-white/90 p-1.5 text-gray-400 shadow-sm hover:text-[#003D82]"
                            title="Open"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <button
                          onClick={() => remove(n.id)}
                          className="rounded-lg bg-white/90 p-1.5 text-gray-400 shadow-sm hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-6">
            <button
              onClick={() => load(offset + LIMIT, filter, true)}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-[#003D82] hover:bg-blue-50 disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Load more
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}