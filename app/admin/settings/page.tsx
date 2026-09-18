'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Shield, UserPlus, UserMinus, Loader2, Mail, Building2, X } from 'lucide-react'

interface AdminProfile { id: string; full_name: string | null; email: string | null }
interface UnclaimedCompany { id: string; company_name: string; contact_name: string | null; contact_email: string | null; city: string | null; state: string | null }

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [promoteEmail, setPromoteEmail] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [demotingId, setDemotingId] = useState<string | null>(null)
  const [unclaimed, setUnclaimed] = useState<UnclaimedCompany[]>([])
  const [unclaimedLoading, setUnclaimedLoading] = useState(true)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [inviteModal, setInviteModal] = useState<UnclaimedCompany | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => { loadAdmins(); loadUnclaimed(); }, [])

  async function loadAdmins() {
    try {
      const res = await fetch('/api/admin?action=admins')
      const data = await res.json()
      if (res.ok) setAdmins(data.admins || [])
    } catch (e) { console.error(e) }
    finally { setAdminsLoading(false) }
  }

  async function loadUnclaimed() {
    try {
      const res = await fetch('/api/admin?action=data&tab=companies')
      const json = await res.json()
      if (res.ok) setUnclaimed((json.data || []).filter((c: any) => !c.is_claimed))
    } catch (e) { console.error(e) }
    finally { setUnclaimedLoading(false) }
  }

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault()
    if (!promoteEmail.trim()) return
    setPromoting(true)
    try {
      const res = await fetch('/api/admin?action=promote&id=any', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: promoteEmail.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(json.message)
      setPromoteEmail('')
      await loadAdmins()
    } catch (e: any) { toast.error(e.message) }
    finally { setPromoting(false) }
  }

  async function handleDemote(admin: AdminProfile) {
    if (!admin.email) return
    if (!confirm(`Remove super admin access from ${admin.full_name || admin.email}?`)) return
    setDemotingId(admin.id)
    try {
      const res = await fetch('/api/admin?action=demote&id=any', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin.email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(json.message)
      await loadAdmins()
    } catch (e: any) { toast.error(e.message) }
    finally { setDemotingId(null) }
  }

  async function handleInviteUnclaimed(company: UnclaimedCompany) {
    setInviteModal(company)
    setInviteEmail(company.contact_email || '')
  }

  async function sendInvite() {
    if (!inviteModal || !inviteEmail.trim()) return
    setInvitingId(inviteModal.id)
    try {
      const res = await fetch(`/api/admin?action=invite-claim&id=${inviteModal.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(json.method === 'dm' ? `📨 DM sent to ${json.message.split(' ').pop()}` : json.message)
      setUnclaimed(prev => prev.filter(c => c.id !== inviteModal.id))
      setInviteModal(null)
      setInviteEmail('')
    } catch (e: any) { toast.error(e.message) }
    finally { setInvitingId(null) }
  }

return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Manage platform administrators and send claim invitations to unclaimed companies.</p>
      </div>

      {/* Super Admin Management */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#003D82]" />
          <h2 className="text-lg font-extrabold text-gray-900">Platform Administrators</h2>
          <span className="text-xs text-gray-400 font-mono ml-2">profiles.is_admin</span>
        </div>

        <form onSubmit={handlePromote} className="flex gap-3 mb-4">
          <input type="email" value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)}
            placeholder="user@company.com" required
            className="flex-1 max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none" />
          <button type="submit" disabled={promoting || !promoteEmail.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
            {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add Admin
          </button>
        </form>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {adminsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#003D82]" /></div>
          ) : admins.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No super admins configured.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-semibold text-gray-700">Admin</th><th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Email</th><th className="text-right px-4 py-3 font-semibold text-gray-700">Action</th></tr></thead>
              <tbody className="divide-y">{admins.map(admin => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#003D82] flex items-center justify-center text-white text-xs font-bold">{admin.full_name?.charAt(0)?.toUpperCase() || '?'}</div><span className="font-semibold text-gray-900">{admin.full_name || 'Unknown'}</span></div></td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{admin.email}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDemote(admin)} disabled={demotingId === admin.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      {demotingId === admin.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />} Remove
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </section>

      {/* Unclaimed Companies Outreach */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-[#FF6B35]" />
          <h2 className="text-lg font-extrabold text-gray-900">Unclaimed Companies</h2>
          <span className="text-xs text-gray-400 font-mono ml-2">{unclaimed.length} ready for outreach</span>
        </div>

        {unclaimedLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#003D82]" /></div>
        ) : unclaimed.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><Building2 className="w-8 h-8 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">All companies are claimed.</p></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-semibold text-gray-700">Company</th><th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Contact</th><th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Location</th><th className="text-right px-4 py-3 font-semibold text-gray-700">Invite</th></tr></thead>
              <tbody className="divide-y">{unclaimed.slice(0, 15).map(company => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-semibold text-gray-900">{company.company_name}</p></td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{company.contact_name || '—'}{company.contact_email && <span className="text-xs text-gray-400 block">{company.contact_email}</span>}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{[company.city, company.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleInviteUnclaimed(company)} disabled={invitingId === company.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003D82] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50">
                      {invitingId === company.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Send Invite
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#FF6B35]" /> Send Claim Invite
              </h3>
              <button onClick={() => { setInviteModal(null); setInviteEmail(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Send an invitation to claim <strong>{inviteModal.company_name}</strong>.
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipient Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="contact@company.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setInviteModal(null); setInviteEmail(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button onClick={sendInvite} disabled={invitingId === inviteModal.id || !inviteEmail.trim()}
                className="flex-1 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] disabled:opacity-50 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                {invitingId === inviteModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
