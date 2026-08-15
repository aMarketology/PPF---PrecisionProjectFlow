'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Clock, Loader2, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'

interface NotificationItem {
  id: string
  conversationId: string
  content: string
  createdAt: string
  senderName: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNotifications = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?redirect=/notifications')
        return
      }

      try {
        const { data: conversations, error: conversationError } = await supabase
          .from('user_conversations')
          .select('id')
          .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
        if (conversationError) throw conversationError

        const conversationIds = conversations?.map(conversation => conversation.id) || []
        if (conversationIds.length === 0) return

        const { data: messages, error: messageError } = await supabase
          .from('user_messages')
          .select('id, conversation_id, sender_id, content, created_at')
          .in('conversation_id', conversationIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100)
        if (messageError) throw messageError

        const senderIds = Array.from(new Set((messages || []).map(message => message.sender_id)))
        const { data: senders } = senderIds.length
          ? await supabase.from('profiles').select('id, full_name').in('id', senderIds)
          : { data: [] }
        const senderNames = new Map((senders || []).map(sender => [sender.id, sender.full_name]))

        setNotifications((messages || []).map(message => ({
          id: message.id,
          conversationId: message.conversation_id,
          content: message.content || 'New message',
          createdAt: message.created_at,
          senderName: senderNames.get(message.sender_id) || 'Someone',
        })))
      } catch (error) {
        console.error('loadNotifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [router])

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Bell className="h-5 w-5 text-[#FF6B35]" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Notifications</h1>
              <p className="text-sm text-blue-200">Unread messages and responses</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm sm:rounded-2xl">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#003D82]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <CheckCheck className="mb-3 h-12 w-12 text-emerald-300" />
              <h2 className="font-bold text-gray-900">You are all caught up</h2>
              <p className="mt-1 text-sm text-gray-500">New messages will appear here.</p>
              <Link href="/messages" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#003D82] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002960]">
                <MessageSquare className="h-4 w-4" /> Open Messages
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(notification => (
                <Link
                  key={notification.id}
                  href={`/messages?conversation=${notification.conversationId}`}
                  className="flex gap-3 px-4 py-4 transition-colors hover:bg-blue-50/60 sm:px-5"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#003D82] text-sm font-bold text-white">
                    {notification.senderName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-bold text-gray-900">{notification.senderName}</p>
                      <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{notification.content}</p>
                  </div>
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#FF6B35]" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}