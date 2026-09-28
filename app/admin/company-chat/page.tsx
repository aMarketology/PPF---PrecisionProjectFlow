'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Loader2, Hash, Users, ArrowRight, Image as ImageIcon,
  ShieldCheck, Coins, Briefcase,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, type AdminContext } from '@/lib/admin/context'

interface ChatItem {
  id: string
  name: string | null
  description: string | null
  type: 'channel' | 'group'
  memberCount: number
  isMine: boolean
}

export default function CompanyChatPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null)
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const context = await loadAdminContext(supabase)
      setCtx(context)
      if (!context?.primaryCompany) { setLoading(false); return }

      const companyId = context.primaryCompany.id

      // Ensure the General channel exists.
      const { data: general } = await supabase
        .from('user_conversations')
        .select('id, name, description')
        .eq('company_id', companyId)
        .eq('conversation_type', 'channel')
        .eq('name', 'General')
        .maybeSingle()

      if (!general) {
        await supabase.rpc('ensure_company_channel', {
          p_company_id: companyId,
          p_user_id: context.userId,
        })
      }

      // All company conversations (General channel + job-title groups).
      const { data: convs } = await supabase
        .from('user_conversations')
        .select('id, name, description, conversation_type')
        .eq('company_id', companyId)
        .in('conversation_type', ['channel', 'group'])
        .order('conversation_type', { ascending: true })
        .order('name', { ascending: true })

      const list = convs ?? []

      // Participant counts + which ones the current user is in.
      const withCounts: ChatItem[] = await Promise.all(list.map(async (c: any) => {
        const { count } = await supabase
          .from('conversation_participants')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
        const { data: mine } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('conversation_id', c.id)
          .eq('user_id', context.userId)
          .maybeSingle()
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.conversation_type,
          memberCount: count ?? 0,
          isMine: !!mine,
        }
      }))

      setChats(withCounts)
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
  if (!ctx) return null

  const company = ctx.primaryCompany

  if (!company) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-700 mb-1">No company chat available</p>
          <p className="text-sm text-gray-400">Join a company to get a free team group chat.</p>
        </div>
      </div>
    )
  }

  const general = chats.find(c => c.type === 'channel')
  const groups = chats.filter(c => c.type === 'group')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Company Chat</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your team's chats for {company.company_name}.
        </p>
      </div>

      {/* General channel */}
      {general && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
              <Hash className="w-7 h-7 text-[#003D82]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-gray-900">{general.name || 'General'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {general.description || 'Company-wide announcements and discussion'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> {general.memberCount} member{general.memberCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Everyone in the company
                </span>
              </div>
            </div>
          </div>
          <Link href={`/messages?conversation=${general.id}`}
            className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all text-sm">
            <MessageSquare className="w-4 h-4" /> Open #General <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Job-title group chats */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#003D82]" /> Job Title Groups
        </h2>
        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600 text-sm mb-1">No job-title groups yet</p>
            <p className="text-xs text-gray-400">
              Owners and admins can set a member's job title in the Team tab - a group chat is created automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map(g => (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{g.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {g.memberCount} member{g.memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Link href={`/messages?conversation=${g.id}`}
                  className="mt-auto w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl transition-all text-xs">
                  Open Group <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What's included */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <ImageIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="font-bold text-gray-900 text-sm mb-1">Free inside your team</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Messages, photos, and files between company members are always free.
            Media is stored securely in Supabase for up to 14 days.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center mb-3">
            <Coins className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <p className="font-bold text-gray-900 text-sm mb-1">Tokens outside your team</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Messaging people outside your company costs tokens. Your balance is{' '}
            <strong>{ctx.profile?.token_balance ?? 0}</strong>.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#003D82]/5 to-blue-50 border border-[#003D82]/15 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-1.5">How team messaging works</h3>
        <ul className="text-xs text-gray-600 leading-relaxed space-y-1.5">
          <li>• Every company gets a <strong>#General</strong> channel with all active members.</li>
          <li>• Each job title gets its own group chat, created automatically when a title is set.</li>
          <li>• Messages and media inside company chats never cost tokens.</li>
          <li>• Direct messages to people outside your company are token-gated.</li>
        </ul>
      </div>
    </div>
  )
}
