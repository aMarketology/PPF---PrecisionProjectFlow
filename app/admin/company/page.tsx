'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Loader2, MapPin, ExternalLink, Users, Shield, CheckCircle2,
  UserPlus, Trash2, Crown, Search, X, MessageSquare, Mail, ArrowLeftRight, LogOut,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, can, type AdminContext } from '@/lib/admin/context'

interface CompanyMember {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  status: string
  profile: { full_name: string | null; email: string | null; avatar_url?: string | null; job_title?: string | null }
}

export default function MyCompanyPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'team'>('overview')

  const [members, setMembers] = useState<CompanyMember[]>([])
  const [companyCreatedAt, setCompanyCreatedAt] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState<any[]>([])
  const [inviteSearching, setInviteSearching] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)

  // Email invite (no account required) + ownership transfer state
  const [inviteMode, setInviteMode] = useState<'search' | 'email'>('search')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteAccountType, setInviteAccountType] = useState<'engineer' | 'client'>('engineer')
  const [sendingEmailInvite, setSendingEmailInvite] = useState(false)
  const [transferringId, setTransferringId] = useState<string | null>(null)
  const [transferTargetId, setTransferTargetId] = useState('')

  const company = ctx?.primaryCompany ?? null
  const canManage = ctx ? can(ctx, 'manage_company') : false
  const isOwner = ctx ? (ctx.primaryCompany?.role === 'owner' || ctx.isAdmin) : false

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const context = await loadAdminContext(supabase)
      setCtx(context)
      if (context?.primaryCompany) {
        await loadMembers(context.primaryCompany.id)
        // Company age (shown next to the team list).
        const { data: co } = await supabase
          .from('company_profiles')
          .select('created_at')
          .eq('id', context.primaryCompany.id)
          .maybeSingle()
        if (co?.created_at) setCompanyCreatedAt(co.created_at)
      }
      setLoading(false)
    })()
  }, [])

  const loadMembers = async (companyId: string) => {
    const supabase = createClient()
    const { data: mems } = await supabase
      .from('company_members')
      .select('id, user_id, role, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (!mems) return
    const withProfiles = await Promise.all(mems.map(async (m) => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, job_title')
        .eq('id', m.user_id)
        .single()
      return { ...m, profile: prof ?? { full_name: null, email: null, job_title: null } } as CompanyMember
    }))
    setMembers(withProfiles)
  }

  // Job title drives the per-title group chat (see JOB_TITLE_GROUP_CHATS.sql).
  const handleJobTitle = async (userId: string, jobTitle: string, name: string | null) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ job_title: jobTitle.trim() || null })
        .eq('id', userId)
      if (error) throw error
      toast.success(jobTitle.trim() ? `${name || 'Member'} → ${jobTitle.trim()}` : 'Job title cleared')
      if (company) await loadMembers(company.id)
    } catch (err: any) { toast.error(err.message || 'Failed to set job title') }
  }

  const searchUsers = useCallback(async () => {
    if (inviteSearch.length < 2) { setInviteResults([]); return }
    setInviteSearching(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, avatar_url')
        .ilike('full_name', `%${inviteSearch}%`)
        .neq('id', ctx?.userId ?? '')
        .limit(10)
      const existing = new Set(members.map(m => m.user_id))
      setInviteResults((data ?? []).filter(u => !existing.has(u.id)))
    } finally { setInviteSearching(false) }
  }, [inviteSearch, members, ctx?.userId])

  useEffect(() => { searchUsers() }, [inviteSearch, searchUsers])

  const handleInvite = async (targetUserId: string) => {
    if (!company) return
    setInviting(targetUserId)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('invite_company_member', {
        p_company_id: company.id,
        p_user_id: targetUserId,
        p_role: 'member',
      })
      if (error) throw error
      if (data === 'active') {
        toast.success('Team member added!')
        await loadMembers(company.id)
        setInviteSearch(''); setInviteResults([]); setShowInvite(false
        )
      } else {
        toast.error(data || 'Failed to invite')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite')
    } finally { setInviting(null) }
  }

  // Role changes and removals go through the server API, which authorizes the
  // caller and uses the service client (avoids the recursive RLS policy).
  const handleChangeRole = async (memberId: string, role: string, name: string | null) => {
    if (!company) return
    try {
      const res = await fetch(`/api/companies/${company.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update role')
      toast.success(`${name || 'Member'} is now ${role}`)
      await loadMembers(company.id)
    } catch (err: any) { toast.error(err.message || 'Failed to update role') }
  }

  const handleRemove = async (memberId: string, name: string | null) => {
    if (!company) return
    if (!confirm(`Remove ${name || 'this member'} from the team?`)) return
    try {
      const res = await fetch(`/api/companies/${company.id}/members?memberId=${memberId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove member')
      toast.success(`${name || 'Member'} removed`)
      await loadMembers(company.id)
    } catch (err: any) { toast.error(err.message || 'Failed to remove member') }
  }

  const handleEmailInvite = async () => {
    if (!company) return
    setSendingEmailInvite(true)
    try {
      const res = await fetch(`/api/companies/${company.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite-email',
          email: inviteEmail.trim(),
          role: inviteRole,
          accountType: inviteAccountType,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send invite')
      toast.success(json.message || `Invitation sent to ${inviteEmail.trim()}`)
      setInviteEmail(''); setInviteMode('search')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite')
    } finally { setSendingEmailInvite(false) }
  }

  const handleTransferOwnership = async (memberId: string) => {
    if (!company) return
    if (!confirm('Transfer ownership of this company to this member? You will become an admin.')) return
    setTransferringId(memberId)
    try {
      const res = await fetch(`/api/companies/${company.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer-ownership', memberId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to transfer ownership')
      toast.success(json.message || 'Ownership transferred')
      await loadMembers(company.id)
    } catch (err: any) { toast.error(err.message || 'Failed to transfer ownership') }
    finally { setTransferringId(null) }
  }

  const companyAge = (() => {
    if (!companyCreatedAt) return null
    const created = new Date(companyCreatedAt)
    const months = Math.max(0, Math.floor((Date.now() - created.getTime()) / (30.44 * 86400000)))
    if (months < 1) return 'Joined less than a month ago'
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`
    const years = Math.floor(months / 12)
    const rem = months % 12
    return rem === 0 ? `${years} year${years === 1 ? '' : 's'} old` : `${years}y ${rem}m old`
  })()

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
  if (!ctx) return null

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">My Company</h1>
        <p className="text-sm text-gray-500 mt-1">The company you belong to and the role you hold.</p>
      </div>

      {!company ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-700 mb-1">You are not part of a company yet</p>
          <p className="text-sm text-gray-400 mb-5">Create a company profile or ask an owner to invite you.</p>
          <Link href="/companies/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition-all">
            <Building2 className="w-4 h-4" /> Create a Company
          </Link>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => setTab('overview')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'overview' ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#003D82]/40 hover:text-[#003D82]'}`}>
              <Building2 className="w-4 h-4" /> Overview
            </button>
            <button onClick={() => setTab('team')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'team' ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#003D82]/40 hover:text-[#003D82]'}`}>
              <Users className="w-4 h-4" /> Team ({members.length})
            </button>
          </div>

          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-8 h-8 text-[#003D82]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-xl font-extrabold text-gray-900 truncate">{company.company_name}</h2>
                      {company.is_verified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {!company.is_claimed && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Unclaimed</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {[company.city, company.state].filter(Boolean).join(', ') || company.industry || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">
                    {company.role === 'owner' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    {company.role}
                  </span>
                  {company.industry && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      {company.industry}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-5 border-t border-gray-100">
                  <Link href={`/companies/${company.slug || company.id}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition-all">
                    View Public Page <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  {canManage && (
                    <Link href={`/companies/${company.slug || company.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl text-sm transition-all">
                      Edit Profile
                    </Link>
                  )}
                  <Link href="/messages"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-all">
                    <MessageSquare className="w-4 h-4" /> Team Chat
                  </Link>
                </div>

                {/* Team members (including you) */}
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#003D82]" /> Team Members
                      <span className="text-gray-400 font-medium">{members.length}</span>
                    </h3>
                    {companyAge && (
                      <span className="text-xs text-gray-400 font-medium">Company · {companyAge}</span>
                    )}
                  </div>

                  {members.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                      <p className="text-xs">No team members yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center gap-3 py-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {m.profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {m.profile.full_name || 'Unknown'}
                                {m.user_id === ctx?.userId && <span className="text-xs font-medium text-[#FF6B35]"> (you)</span>}
                              </p>
                              {m.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                              {m.role === 'admin' && <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {m.profile.email}
                              {m.profile.job_title ? ` · ${m.profile.job_title}` : ''}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            m.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            m.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-gray-50 text-gray-600 border border-gray-200'
                          }`}>{m.role}</span>

                          {/* Owner-only actions: transfer ownership, remove/fire */}
                          {isOwner && m.role !== 'owner' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleTransferOwnership(m.id)}
                                disabled={transferringId === m.id}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Transfer ownership">
                                {transferringId === m.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <ArrowLeftRight className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleRemove(m.id, m.profile.full_name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove member">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Non-owner managers can still remove members */}
                          {canManage && !isOwner && m.role !== 'owner' && (
                            <button
                              onClick={() => handleRemove(m.id, m.profile.full_name)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove member">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#003D82]/5 to-blue-50 border border-[#003D82]/15 rounded-2xl p-5 h-fit">
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">One company per account</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Accounts belong to a single company at a time. To move to a different company,
                  leave your current one, then accept a new invite.
                </p>
              </div>
            </div>
          )}

          {tab === 'team' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
                  <p className="text-sm text-gray-500">{members.length} active member{members.length !== 1 ? 's' : ''}</p>
                </div>
                {canManage && (
                  <button onClick={() => setShowInvite(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-xl transition-all text-sm">
                    <UserPlus className="w-4 h-4" /> Invite Member
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {m.profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm truncate">{m.profile.full_name || 'Unknown'}</p>
                        {m.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        {m.role === 'admin' && <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{m.profile.email}</p>
                      {/* Job title — drives the per-title group chat */}
                      {canManage ? (
                        <input
                          type="text"
                          defaultValue={m.profile.job_title ?? ''}
                          placeholder="Add job title…"
                          onBlur={e => {
                            const next = e.target.value.trim()
                            if (next !== (m.profile.job_title ?? '')) handleJobTitle(m.user_id, next, m.profile.full_name)
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          className="mt-1.5 w-full max-w-[220px] text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82]"
                        />
                      ) : (
                        m.profile.job_title && (
                          <span className="inline-block mt-1.5 text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-semibold">
                            {m.profile.job_title}
                          </span>
                        )
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      m.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      m.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>{m.role}</span>

                    {/* Owner-only actions: transfer ownership, remove/fire */}
                    {isOwner && m.role !== 'owner' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTransferOwnership(m.id)}
                          disabled={transferringId === m.id}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Transfer ownership">
                          {transferringId === m.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <ArrowLeftRight className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleRemove(m.id, m.profile.full_name)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Non-owner managers can still remove members */}
                    {canManage && !isOwner && m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemove(m.id, m.profile.full_name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm">No team members yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite modal */}
      {showInvite && company && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Invite Team Member</h3>
                <p className="text-gray-500 text-sm mt-0.5">Add a user to {company.company_name}</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setInviteMode('search')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    inviteMode === 'search' ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}>
                  <Search className="w-4 h-4" />
                  Invite by Name
                </button>
                <button onClick={() => setInviteMode('email')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    inviteMode === 'email' ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}>
                  <Building2 className="w-4 h-4" />
                  Invite by Email
                </button>
              </div>

              {inviteMode === 'search' && (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={inviteSearch} onChange={e => setInviteSearch(e.target.value)}
                      placeholder="Search by name..." autoFocus
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {inviteSearching ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#003D82] animate-spin" /></div>
                    ) : inviteResults.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-4">
                        {inviteSearch.length >= 2 ? 'No users found' : 'Type to search for users'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {inviteResults.map(u => (
                          <button key={u.id} onClick={() => handleInvite(u.id)} disabled={inviting === u.id}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-left transition-colors disabled:opacity-50">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#003D82] to-[#005BB5] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{u.full_name}</p>
                              <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            </div>
                            {inviting === u.id && <Loader2 className="w-4 h-4 animate-spin text-[#003D82] ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {inviteMode === 'email' && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Send an invite to a user by email address.</p>
                  <div className="flex gap-2">
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="Enter email address" autoFocus
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] text-sm" />
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-[#003D82]/30">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Account type pre-selection for signup */}
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account type they'll sign up as</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setInviteAccountType('engineer')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${inviteAccountType === 'engineer' ? 'bg-[#003D82] text-white border-[#003D82]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#003D82]/40'}`}>
                        Supplier
                      </button>
                      <button type="button" onClick={() => setInviteAccountType('client')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${inviteAccountType === 'client' ? 'bg-[#003D82] text-white border-[#003D82]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#003D82]/40'}`}>
                        Buyer
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button onClick={handleEmailInvite}
                      className="flex-1 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-lg transition-all text-sm flex items-center justify-center gap-2">
                      {sendingEmailInvite ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Send Invite
                        </>
                      )}
                    </button>
                    <button onClick={() => setInviteMode('search')}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-all text-sm flex items-center justify-center gap-2">
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isOwner && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Transfer company ownership.</p>
                  <div className="flex gap-2">
                    <select value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-[#003D82]/30">
                      <option value="">Select a member</option>
                      {members.filter(m => m.role !== 'owner').map(m => (
                        <option key={m.id} value={m.id}>
                          {m.profile.full_name} ({m.profile.email})
                        </option>
                      ))}
                    </select>
                    <button onClick={() => transferTargetId && handleTransferOwnership(transferTargetId)}
                      disabled={!transferTargetId || transferringId === transferTargetId}
                      className="flex-1 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-50 text-white font-semibold rounded-lg transition-all text-sm flex items-center justify-center gap-2">
                      {transferringId === transferTargetId
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : transferTargetId ? 'Transfer Now' : 'Select a member'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
