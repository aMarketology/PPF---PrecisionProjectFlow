'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Building2, Save, Mail, Phone, Globe, MapPin,
  BadgeCheck, ExternalLink, StickyNote, User, Shield, Users, Calendar,
  CheckCircle2, XCircle, Send,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Company {
  id: string
  company_name: string
  slug: string | null
  description: string | null
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  industry: string | null
  specialties: string[] | null
  certifications: string[] | null
  is_verified: boolean
  is_claimed: boolean
  owner_id: string | null
  source: string | null
  contact_name: string | null
  contact_title: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_mobile: string | null
  contact_linkedin: string | null
  notes: string | null
  outreach_status: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

interface Owner { id: string; full_name: string | null; email: string | null; user_type: string | null; is_admin: boolean }

const OUTREACH_STATUSES = [
  { value: 'new', label: 'New', cls: 'bg-gray-100 text-gray-600' },
  { value: 'contacted', label: 'Contacted', cls: 'bg-blue-100 text-blue-700' },
  { value: 'replied', label: 'Replied', cls: 'bg-amber-100 text-amber-700' },
  { value: 'meeting', label: 'Meeting', cls: 'bg-purple-100 text-purple-700' },
  { value: 'converted', label: 'Converted', cls: 'bg-emerald-100 text-emerald-700' },
  { value: 'dead', label: 'Dead', cls: 'bg-red-100 text-red-700' },
]

const SOURCE_LABELS: Record<string, string> = {
  tsv_import: 'TSV Import',
  outreach_listing: 'Outreach',
  seed: 'Seed',
}

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    company_name: '', description: '', website: '', email: '', phone: '',
    address: '', city: '', state: '', zip_code: '', industry: '',
    contact_name: '', contact_title: '', contact_email: '', contact_phone: '',
    contact_mobile: '', contact_linkedin: '',
    notes: '', outreach_status: 'new',
  })
  const [specialties, setSpecialties] = useState<string[]>([])
  const [certifications, setCertifications] = useState<string[]>([])
  const [specInput, setSpecInput] = useState('')
  const [certInput, setCertInput] = useState('')

  // Cold outreach compose state
  const [outreachOpen, setOutreachOpen] = useState(false)
  const [outreachTo, setOutreachTo] = useState('')
  const [outreachSubject, setOutreachSubject] = useState('')
  const [outreachMessage, setOutreachMessage] = useState('')
  const [outreachTemplateKey, setOutreachTemplateKey] = useState('cold_intro')
  const [outreachSending, setOutreachSending] = useState(false)
  const [sentLog, setSentLog] = useState<{ id: string; to_email: string; subject: string; template_key: string | null; sent_at: string }[]>([])

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?action=company-detail&id=${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setCompany(json.company)
      setOwner(json.owner)
      setMemberCount(json.memberCount || 0)

      const c = json.company
      setForm({
        company_name: c.company_name || '',
        description: c.description || '',
        website: c.website || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        zip_code: c.zip_code || '',
        industry: c.industry || '',
        contact_name: c.contact_name || '',
        contact_title: c.contact_title || '',
        contact_email: c.contact_email || '',
        contact_phone: c.contact_phone || '',
        contact_mobile: c.contact_mobile || '',
        contact_linkedin: c.contact_linkedin || '',
        notes: c.notes || '',
        outreach_status: c.outreach_status || 'new',
      })
      setSpecialties(c.specialties || [])
      setCertifications(c.certifications || [])

      // Prefill the outreach composer with the primary contact email.
      setOutreachTo(c.contact_email || c.email || '')

      // Load any emails already sent to this company.
      try {
        const outRes = await fetch(`/api/admin/outreach?companyId=${id}`)
        const outJson = await outRes.json()
        if (outRes.ok) setSentLog(outJson.sent || [])
      } catch {}
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  function addTag(type: 'spec' | 'cert') {
    const val = type === 'spec' ? specInput.trim() : certInput.trim()
    if (!val) return
    if (type === 'spec') { setSpecialties(p => p.includes(val) ? p : [...p, val]); setSpecInput('') }
    else { setCertifications(p => p.includes(val) ? p : [...p, val]); setCertInput('') }
  }

  function removeTag(type: 'spec' | 'cert', val: string) {
    if (type === 'spec') setSpecialties(p => p.filter(s => s !== val))
    else setCertifications(p => p.filter(c => c !== val))
  }

  async function handleSave() {
    if (!company) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin?action=update-company&id=${company.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, specialties, certifications }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      toast.success('Company updated')
      setCompany(json.company)
      // Refresh owner/member info too
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(status: string) {
    if (!company) return
    try {
      const res = await fetch(`/api/admin?action=update-company&id=${company.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreach_status: status,
          last_contacted_at: status === 'new' ? null : new Date().toISOString(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      setCompany(json.company)
      setForm(p => ({ ...p, outreach_status: status }))
      toast.success(`Status → ${status}`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  function openOutreach() {
    if (!company) return
    // Prefill the compose form on first open.
    setOutreachTo(company.contact_email || company.email || '')
    setOutreachSubject(`Precision Project Flow — ${company.company_name}`)
    setOutreachMessage(
      `Hi ${company.contact_name || 'there'},\n\n` +
      `I'm reaching out because ${company.company_name} is listed in the Precision Project Flow directory and I wanted to personally invite you to claim your company profile.\n\n` +
      `PPF is a B2B marketplace connecting commercial and industrial suppliers with buyers who post RFQs for parts, equipment, and technical services. Claiming your page lets you respond to those RFQs and get discovered by buyers actively sourcing.\n\n` +
      `It's free to join and free to list. Let me know if you'd like me to walk you through it.`
    )
    setOutreachOpen(true)
  }

  async function handleSendOutreach() {
    if (!company) return
    if (!outreachTo || !outreachSubject || !outreachMessage) {
      toast.error('Recipient, subject, and message are required')
      return
    }
    setOutreachSending(true)
    try {
      const res = await fetch('/api/admin/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          toEmail: outreachTo,
          subject: outreachSubject,
          message: outreachMessage,
          templateKey: outreachTemplateKey,
          contactName: company.contact_name,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      toast.success(json.message || 'Email sent')
      setOutreachMessage('')
      // Refresh the sent log + mark outreach status as contacted.
      const outRes = await fetch(`/api/admin/outreach?companyId=${company.id}`)
      const outJson = await outRes.json()
      if (outRes.ok) setSentLog(outJson.sent || [])
      await handleStatusChange('contacted')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setOutreachSending(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
  )

  if (!company) return (
    <div className="text-center py-20">
      <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">Company not found</p>
      <Link href="/admin/directory" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#003D82] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </Link>
    </div>
  )

  const statusMeta = OUTREACH_STATUSES.find(s => s.value === form.outreach_status) || OUTREACH_STATUSES[0]
  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))
  })

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] bg-white transition"
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href="/admin/directory" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[#003D82]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#003D82] flex-shrink-0" />
            {company.company_name}
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
            {company.industry && <span>{company.industry}</span>}
            {[company.city, company.state].filter(Boolean).join(', ') && (
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[company.city, company.state].filter(Boolean).join(', ')}</span>
            )}
            {company.source && <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded-full">{SOURCE_LABELS[company.source] || company.source}</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {company.slug && (
            <Link href={`/companies/${company.slug}`} target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#003D82] text-[#003D82] font-semibold rounded-lg text-sm hover:bg-blue-50 transition-colors">
              <ExternalLink className="w-4 h-4" /> View Public Page
            </Link>
          )}
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#003D82] hover:bg-[#002960] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          <button onClick={openOutreach}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-lg text-sm transition-colors">
            <Send className="w-4 h-4" /> Cold Outreach
          </button>
        </div>
      </div>

      {/* Status + quick facts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Outreach status card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Outreach Status</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {OUTREACH_STATUSES.map(s => (
              <button key={s.value} onClick={() => handleStatusChange(s.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${form.outreach_status === s.value ? `${s.cls} ring-2 ring-offset-1 ring-[#003D82]/40` : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
              {company.last_contacted_at ? `Last contacted ${new Date(company.last_contacted_at).toLocaleDateString()}` : 'Never contacted'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.cls}`}>{statusMeta.label}</span>
          </div>
        </div>

        {/* Claim / verification card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Ownership</p>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Claimed</span>
              <span className={`inline-flex items-center gap-1.5 font-semibold ${company.is_claimed ? 'text-emerald-600' : 'text-gray-400'}`}>
                {company.is_claimed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {company.is_claimed ? 'Claimed' : 'Unclaimed'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Verified</span>
              <span className={`inline-flex items-center gap-1.5 font-semibold ${company.is_verified ? 'text-blue-600' : 'text-gray-400'}`}>
                {company.is_verified ? <BadgeCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {company.is_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Team Members</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700"><Users className="w-4 h-4" />{memberCount}</span>
            </div>
            {owner && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Owner</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[#003D82]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{owner.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">{owner.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Primary Contact</p>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-gray-900">{company.contact_name || '—'}{company.contact_title ? ` · ${company.contact_title}` : ''}</p>
            {company.contact_email && (
              <a href={`mailto:${company.contact_email}`} className="flex items-center gap-2 text-[#003D82] hover:underline">
                <Mail className="w-4 h-4 flex-shrink-0" /> {company.contact_email}
              </a>
            )}
            {company.contact_phone && (
              <p className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 flex-shrink-0" /> {company.contact_phone}</p>
            )}
            {company.contact_mobile && (
              <p className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 flex-shrink-0" /> {company.contact_mobile} <span className="text-xs text-gray-400">(mobile)</span></p>
            )}
            {company.contact_linkedin && (
              <a href={company.contact_linkedin.startsWith('http') ? company.contact_linkedin : `https://${company.contact_linkedin}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#003D82] hover:underline">
                <ExternalLink className="w-4 h-4 flex-shrink-0" /> LinkedIn
              </a>
            )}
            {!company.contact_email && !company.contact_phone && !company.contact_mobile && (
              <p className="text-gray-400">No contact info on file</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Company info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Company Info</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Company Name</label>
              <input {...f('company_name')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea {...f('description')} rows={3} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Website</label>
                <input {...f('website')} className={inputCls} placeholder="example.com" />
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <input {...f('industry')} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email</label>
                <input {...f('email')} type="email" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input {...f('phone')} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input {...f('address')} className={inputCls} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input {...f('city')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input {...f('state')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>ZIP</label>
                <input {...f('zip_code')} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Contact + tags */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Contact Details</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Contact Name</label>
                  <input {...f('contact_name')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Title</label>
                  <input {...f('contact_title')} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Contact Email</label>
                  <input {...f('contact_email')} type="email" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contact Phone</label>
                  <input {...f('contact_phone')} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Mobile</label>
                  <input {...f('contact_mobile')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>LinkedIn</label>
                  <input {...f('contact_linkedin')} className={inputCls} placeholder="linkedin.com/in/..." />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Specialties & Certifications</p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Specialties</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {specialties.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                      {s}
                      <button onClick={() => removeTag('spec', s)} className="hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={specInput} onChange={e => setSpecInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('spec') } }}
                    placeholder="Add specialty..." className={inputCls} />
                  <button onClick={() => addTag('spec')} className="px-3 py-2 bg-[#003D82]/10 text-[#003D82] font-semibold rounded-xl text-sm hover:bg-[#003D82]/20">+</button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Certifications</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {certifications.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                      {c}
                      <button onClick={() => removeTag('cert', c)} className="hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={certInput} onChange={e => setCertInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('cert') } }}
                    placeholder="Add certification..." className={inputCls} />
                  <button onClick={() => addTag('cert')} className="px-3 py-2 bg-[#003D82]/10 text-[#003D82] font-semibold rounded-xl text-sm hover:bg-[#003D82]/20">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="w-5 h-5 text-[#FF6B35]" />
          <h2 className="text-lg font-extrabold text-gray-900">Internal Notes</h2>
          <span className="text-xs text-gray-400 font-mono ml-2">only visible to super admins</span>
        </div>
        <textarea {...f('notes')} rows={5}
          placeholder="Outreach history, call notes, follow-ups, pricing context, decision makers..."
          className={inputCls} />
        <p className="text-xs text-gray-400 mt-2">Saved with the rest of the company when you click <strong>Save Changes</strong>.</p>
      </div>

      {/* ── Cold Outreach compose popup (Gmail-style, bottom-right) ── */}
      {outreachOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            style={{ maxHeight: 'min(80vh, 640px)' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#001f4d] to-[#003D82] px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate">New Cold Outreach</p>
                <p className="text-blue-200 text-xs truncate">to {company.contact_email || company.email || 'no email on file'}</p>
              </div>
              <button onClick={() => setOutreachOpen(false)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
                <input value="info@amarketology.com" disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">To (testing → internal inbox)</label>
                <input value={outreachTo} onChange={e => setOutreachTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] outline-none" />
                <p className="text-[11px] text-gray-400 mt-1">Live sends go to your internal inboxes during testing.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
                <input value={outreachSubject} onChange={e => setOutreachSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Message (plain text)</label>
                <textarea value={outreachMessage} onChange={e => setOutreachMessage(e.target.value)} rows={9}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] outline-none resize-y" />
              </div>

              {/* Sent history */}
              {sentLog.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Previously sent</p>
                  <div className="space-y-1.5">
                    {sentLog.map(l => (
                      <div key={l.id} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-gray-700 truncate flex-1">{l.subject}</span>
                        <span className="text-gray-400 flex-shrink-0">{new Date(l.sent_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
              <button onClick={handleSendOutreach} disabled={outreachSending}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all">
                {outreachSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
              <button onClick={() => setOutreachOpen(false)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}