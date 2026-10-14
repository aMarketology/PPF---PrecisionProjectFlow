'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Send, Loader2, Building2, Mail, Search, MapPin, BadgeCheck,
  CheckCircle2, ExternalLink, Megaphone, History,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Company {
  id: string
  company_name: string
  city: string | null
  state: string | null
  industry: string | null
  is_claimed: boolean
  contact_name: string | null
  contact_email: string | null
  outreach_status: string | null
}

interface SentLog {
  id: string
  to_email: string
  subject: string
  template_key: string
  sent_at: string
}

const TEMPLATES = [
  {
    key: 'intro_supplier',
    label: 'Intro — Invite to join as Supplier',
    subject: 'Precision Project Flow — reach engineering buyers',
    message: `I'm reaching out because {company_name} is listed in the Precision Project Flow directory and I wanted to personally invite you to claim your company profile and list your products and services.\n\nPPF is a B2B marketplace connecting commercial and industrial suppliers with buyers who post RFQs for parts, equipment, and technical services. Claiming your page lets you respond to those RFQs and get discovered by buyers actively sourcing.\n\nIt's free to join and free to list.`,
  },
  {
    key: 'intro_buyer',
    label: 'Intro — Invite to join as Buyer',
    subject: 'Source suppliers on Precision Project Flow',
    message: `I'm reaching out to introduce Precision Project Flow, a B2B marketplace for commercial and industrial products and services.\n\nIf {company_name} is ever sourcing parts, equipment, or technical services, you can post an RFQ and receive quotes from multiple qualified suppliers — free.\n\nI'd love to show you how it works.`,
  },
]

export default function OutreachHubPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Company | null>(null)

  const [templateKey, setTemplateKey] = useState<string>('intro_supplier')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const [sentLog, setSentLog] = useState<SentLog[]>([])
  const [logLoading, setLogLoading] = useState(false)

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'data', tab: 'directory', page: '1', pageSize: '200', claimed: 'unclaimed' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      const rows: Company[] = json.data || []
      setCompanies(rows)

      // Auto-select a company if ?company=<id> was passed (from the directory
      // "Unclaimed" button).
      const companyId = new URLSearchParams(window.location.search).get('company')
      if (companyId) {
        const target = rows.find(c => c.id === companyId)
        if (target) selectCompany(target)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { loadCompanies() }, [loadCompanies])

  const selectCompany = async (c: Company) => {
    setSelected(c)
    const tpl = TEMPLATES.find(t => t.key === templateKey) ?? TEMPLATES[0]
    setSubject(tpl.subject)
    setMessage(tpl.message.replace(/\{company_name\}/g, c.company_name))
    // Load sent history for this company.
    setLogLoading(true)
    try {
      const res = await fetch(`/api/admin/outreach?companyId=${c.id}`)
      const json = await res.json()
      if (res.ok) setSentLog(json.sent || [])
    } catch { setSentLog([]) } finally { setLogLoading(false) }
  }

  const applyTemplate = (key: string) => {
    setTemplateKey(key)
    const tpl = TEMPLATES.find(t => t.key === key) ?? TEMPLATES[0]
    setSubject(tpl.subject)
    setMessage(tpl.message.replace(/\{company_name\}/g, selected?.company_name || ''))
  }

  const handleSend = async () => {
    if (!selected) return
    if (!subject.trim() || !message.trim()) { toast.error('Subject and message are required'); return }
    setSending(true)
    try {
      const res = await fetch('/api/admin/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selected.id,
          toEmail: selected.contact_email || 'contact@unknown.com',
          subject: subject.trim(),
          message: message.trim(),
          templateKey,
          contactName: selected.contact_name,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      toast.success(json.message || 'Email sent')
      // Refresh the log.
      const logRes = await fetch(`/api/admin/outreach?companyId=${selected.id}`)
      const logJson = await logRes.json()
      if (logRes.ok) setSentLog(logJson.sent || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return companies
    const q = search.toLowerCase()
    return companies.filter(c =>
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.contact_name || '').toLowerCase().includes(q)
    )
  }, [companies, search])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#FF6B35]" /> Cold Outreach Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">Send intro emails to unclaimed companies and track what's been sent.</p>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          Testing mode: emails deliver to your internal inbox only.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company picker */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search unclaimed companies..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-gray-50">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#003D82]" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm">No unclaimed companies match</p>
              </div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectCompany(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === c.id ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate flex-1">{c.company_name}</p>
                    {c.contact_email && <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                    {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    {c.industry && <span className="text-gray-300">·</span>}
                    {c.industry && <span className="truncate">{c.industry}</span>}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Composer + history */}
        <div className="space-y-4">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
              <Mail className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Select a company on the left to compose an email.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#003D82]/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#003D82]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-gray-900 truncate">{selected.company_name}</h2>
                      {selected.is_claimed
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Claimed</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Unclaimed</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {selected.contact_name || 'No contact'} · {selected.contact_email || 'no email on file'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Template</label>
                    <select value={templateKey} onChange={e => applyTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none bg-white">
                      {TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Message (plain text)</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={8}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30 outline-none resize-y font-mono" />
                  </div>
                  <button onClick={handleSend} disabled={sending}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Cold Email
                  </button>
                </div>
              </div>

              {/* Sent history */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#003D82]" />
                  <h3 className="font-bold text-gray-900 text-sm">Sent to this company</h3>
                </div>
                {logLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-[#003D82]" /></div>
                ) : sentLog.length === 0 ? (
                  <p className="text-center py-6 text-sm text-gray-400">No emails sent yet</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {sentLog.map(l => (
                      <div key={l.id} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <p className="text-sm font-semibold text-gray-900 truncate">{l.subject}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {l.template_key} · {new Date(l.sent_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
