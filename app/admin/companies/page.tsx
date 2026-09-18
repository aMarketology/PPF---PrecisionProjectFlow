'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, RotateCcw, Trash2, Mail, ToggleLeft, ToggleRight, MessageSquare, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Company {
  id: string; company_name: string; city: string; state: string
  industry: string | null; verified: boolean; is_claimed: boolean
  email: string | null; contact_name: string | null; owner_id: string | null
  created_at: string
}

type SortKey = 'company_name' | 'location' | 'industry' | 'is_claimed'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 100

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClaimed, setFilterClaimed] = useState<'all' | 'claimed' | 'unclaimed'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('company_name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [inviteModal, setInviteModal] = useState<Company | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [messageModal, setMessageModal] = useState<{ company: Company } | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => { loadCompanies() }, [page])

  const loadCompanies = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?action=data&tab=companies&page=${page}&pageSize=${PAGE_SIZE}`)
      const json = await res.json()
      setCompanies(json.data || [])
      setTotal(json.total || 0)
      setTotalPages(json.totalPages || 1)
    } catch { }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this company permanently?')) return
    try {
      const res = await fetch(`/api/admin?action=delete&tab=companies&id=${id}`, { method: 'POST' })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Deleted')
      setCompanies(prev => prev.filter(c => c.id !== id))
    } catch { toast.error('Failed') }
  }

  const handleResetClaim = async (company: Company) => {
    if (!confirm(`Reset ${company.company_name} to unclaimed? This removes active team access and closes pending claims.`)) return
    try {
      const res = await fetch(`/api/admin?action=reset-company-claim&id=${company.id}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Reset failed'); return }
      toast.success(`${company.company_name} is ready to be claimed again`)
      setCompanies(previous => previous.map(item => item.id === company.id ? { ...item, is_claimed: false } : item))
    } catch { toast.error('Reset failed') }
  }

  const handleInviteClaim = (company: Company) => {
    setInviteModal(company)
    setInviteEmail(company.email || '')
  }

  const sendInvite = async () => {
    if (!inviteModal || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/admin?action=invite-claim&id=${inviteModal.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(json.message || `Invite sent to ${inviteEmail}`)
      setInviteModal(null)
      setInviteEmail('')
    } catch (e: any) { toast.error(e.message) }
    finally { setInviting(false) }
  }

  const handleToggleCompany = async (company: Company) => {
    try {
      const res = await fetch(`/api/admin?action=toggle&tab=companies&id=${company.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !company.is_claimed }),
      })
      if (!res.ok) { const j = await res.json(); toast.error(j.error || 'Toggle failed'); return }
      toast.success(company.is_claimed ? 'Company unclaimed' : 'Company claimed')
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_claimed: !c.is_claimed } : c))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleSendPlatformMessage = async () => {
    if (!messageModal || !messageText.trim()) return
    const targetId = messageModal.company.owner_id
    if (!targetId) { toast.error('Company has no owner to message'); return }
    setSendingMessage(true)
    try {
      const res = await fetch('/api/admin?action=platform-message&id=any', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetId, message: messageText.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Message sent to company owner')
      setMessageModal(null)
      setMessageText('')
    } catch (e: any) { toast.error(e.message) }
    finally { setSendingMessage(false) }
  }

  const filtered = companies.filter(c => {
    if (filterClaimed === 'claimed' && !c.is_claimed) return false
    if (filterClaimed === 'unclaimed' && c.is_claimed) return false
    if (!search) return true
    const q = search.toLowerCase()
    return c.company_name?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.state?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q)
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any, bVal: any
    switch (sortKey) {
      case 'company_name': aVal = a.company_name?.toLowerCase() ?? ''; bVal = b.company_name?.toLowerCase() ?? ''; break
      case 'location': aVal = [a.city, a.state].filter(Boolean).join(', ').toLowerCase(); bVal = [b.city, b.state].filter(Boolean).join(', ').toLowerCase(); break
      case 'industry': aVal = a.industry?.toLowerCase() ?? ''; bVal = b.industry?.toLowerCase() ?? ''; break
      case 'is_claimed': aVal = a.is_claimed ? 1 : 0; bVal = b.is_claimed ? 1 : 0; break
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const SortHeader = ({ label, k, className = '' }: { label: string; k: SortKey; className?: string }) => (
    <th className={`text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-[#003D82] ${className}`} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
      </span>
    </th>
  )

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Management</h1>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search companies..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30" />
        </div>
        <select value={filterClaimed} onChange={e => setFilterClaimed(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">All Companies</option>
          <option value="claimed">Claimed</option>
          <option value="unclaimed">Unclaimed</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{total.toLocaleString()} companies</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortHeader label="Name" k="company_name" />
              <SortHeader label="Location" k="location" className="hidden md:table-cell" />
              <SortHeader label="Industry" k="industry" className="hidden md:table-cell" />
              <SortHeader label="Status" k="is_claimed" />
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No companies found</td></tr>
            ) : sorted.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{c.company_name}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{c.industry || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {c.verified && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Verified</span>}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${c.is_claimed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_claimed ? 'Claimed' : 'Unclaimed'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!c.is_claimed && (
                      <button onClick={() => handleInviteClaim(c)} title="Send claim invitation"
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-[#003D82]">
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    {c.owner_id && (
                      <button onClick={() => { setMessageModal({ company: c }); setMessageText(''); }}
                        title="Message company owner"
                        className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleToggleCompany(c)}
                      title={c.is_claimed ? 'Unclaim company' : 'Claim company'}
                      className={`p-1.5 rounded-lg ${c.is_claimed ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}>
                      {c.is_claimed ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleResetClaim(c)} title="Reset company claim"
                      className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-gray-600 font-medium">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#FF6B35]" /> Send Claim Invite
              </h3>
              <button onClick={() => { setInviteModal(null); setInviteEmail(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Send an invitation to claim <strong>{inviteModal.company_name}</strong>.</p>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipient Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="contact@company.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setInviteModal(null); setInviteEmail(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}
                className="flex-1 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] disabled:opacity-50 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Message Modal */}
      {messageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#003D82]" /> Message Owner
              </h3>
              <button onClick={() => { setMessageModal(null); setMessageText(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Send a message to the owner of <strong>{messageModal.company.company_name}</strong>. This will appear as a DM from Precision Project Flow admin.
            </p>
            <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
              placeholder="Your message to the company owner..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setMessageModal(null); setMessageText(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleSendPlatformMessage} disabled={sendingMessage || !messageText.trim()}
                className="flex-1 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] disabled:opacity-50 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}