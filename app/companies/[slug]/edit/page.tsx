'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2, ArrowLeft, Save, Loader2, Plus, X,
  Globe, Mail, Phone, MapPin, Tag, ShieldCheck
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Company {
  id: string
  company_name: string
  description: string | null
  website: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  country: string | null
  specialties: string[] | null
  certifications: string[] | null
  contact_name: string | null
  contact_title: string | null
  contact_email: string | null
  contact_phone: string | null
  logo_url: string | null
  owner_id: string | null
  slug: string
}

export default function EditCompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()

  const [company, setCompany]     = useState<Company | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [authorized, setAuth]     = useState(false)

  // Form fields
  const [form, setForm] = useState({
    company_name: '',
    description: '',
    website: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    country: '',
    contact_name: '',
    contact_title: '',
    contact_email: '',
    contact_phone: '',
  })
  const [specialties, setSpecialties]       = useState<string[]>([])
  const [certifications, setCertifications] = useState<string[]>([])
  const [specInput, setSpecInput]   = useState('')
  const [certInput, setCertInput]   = useState('')

  useEffect(() => { load() }, [slug])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: co, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !co) { toast.error('Company not found'); setLoading(false); return }

    if (co.owner_id !== user.id) {
      setAuth(false)
      setLoading(false)
      return
    }

    setAuth(true)
    setCompany(co as Company)
    setForm({
      company_name:  co.company_name || '',
      description:   co.description || '',
      website:       co.website || '',
      email:         co.email || '',
      phone:         co.phone || '',
      city:          co.city || '',
      state:         co.state || '',
      country:       co.country || '',
      contact_name:  co.contact_name || '',
      contact_title: co.contact_title || '',
      contact_email: co.contact_email || '',
      contact_phone: co.contact_phone || '',
    })
    setSpecialties(co.specialties || [])
    setCertifications(co.certifications || [])
    setLoading(false)
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
      const supabase = createClient()
      const { error } = await supabase
        .from('company_profiles')
        .update({ ...form, specialties, certifications })
        .eq('id', company.id)
      if (error) throw error
      toast.success('Profile updated!')
      router.push(`/companies/${slug}`)
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))
  })

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] bg-white transition"

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
      </div>
      <Footer />
    </div>
  )

  if (!authorized) return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="text-center max-w-md">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Not Authorized</h1>
          <p className="text-gray-500 text-sm mb-6">You must be the verified owner of this company to edit it.</p>
          <Link href={`/companies/${slug}`} className="inline-flex items-center gap-2 text-[#003D82] font-semibold text-sm hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Company Profile
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link href={`/companies/${slug}`} className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Edit Company Profile</h1>
              <p className="text-blue-200 text-sm">{company?.company_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Company Name</label>
              <input {...f('company_name')} className={inputCls} placeholder="Acme Precision Inc." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
              <textarea {...f('description')} rows={4} className={inputCls + ' resize-none'}
                placeholder="What does your company do? Specialties, capabilities, industries served..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1"><Globe className="w-3 h-3" /> Website</label>
              <input {...f('website')} className={inputCls} placeholder="https://yourcompany.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1"><Mail className="w-3 h-3" /> Business Email</label>
              <input {...f('email')} type="email" className={inputCls} placeholder="info@yourcompany.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</label>
              <input {...f('phone')} className={inputCls} placeholder="+1 (555) 000-0000" />
            </div>
          </div>
        </motion.div>

        {/* Location */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#003D82]" /> Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">City</label>
              <input {...f('city')} className={inputCls} placeholder="Detroit" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">State</label>
              <input {...f('state')} className={inputCls} placeholder="MI" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Country</label>
              <input {...f('country')} className={inputCls} placeholder="USA" />
            </div>
          </div>
        </motion.div>

        {/* Contact Person */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Primary Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Contact Name</label>
              <input {...f('contact_name')} className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Title</label>
              <input {...f('contact_title')} className={inputCls} placeholder="Sales Manager" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Contact Email</label>
              <input {...f('contact_email')} type="email" className={inputCls} placeholder="jane@yourcompany.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Contact Phone</label>
              <input {...f('contact_phone')} className={inputCls} placeholder="+1 (555) 000-0000" />
            </div>
          </div>
        </motion.div>

        {/* Specialties */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2"><Tag className="w-4 h-4 text-[#003D82]" /> Specialties</h2>
          <p className="text-xs text-gray-400 mb-4">Manufacturing capabilities, materials, processes, industries</p>
          <div className="flex gap-2 mb-3">
            <input value={specInput} onChange={e => setSpecInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('spec') } }}
              className={inputCls + ' flex-1'} placeholder="e.g. CNC Machining, Aerospace, Titanium" />
            <button onClick={() => addTag('spec')}
              className="px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white rounded-xl text-sm font-semibold flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {specialties.map(s => (
                <span key={s} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-full">
                  {s}
                  <button onClick={() => removeTag('spec', s)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Certifications */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#003D82]" /> Certifications</h2>
          <p className="text-xs text-gray-400 mb-4">ISO, AS9100, ITAR, NADCAP, etc.</p>
          <div className="flex gap-2 mb-3">
            <input value={certInput} onChange={e => setCertInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('cert') } }}
              className={inputCls + ' flex-1'} placeholder="e.g. ISO 9001:2015, AS9100D" />
            <button onClick={() => addTag('cert')}
              className="px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white rounded-xl text-sm font-semibold flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {certifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {certifications.map(c => (
                <span key={c} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full">
                  {c}
                  <button onClick={() => removeTag('cert', c)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Save button */}
        <div className="flex gap-3 pb-8">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 sm:flex-none sm:px-10 py-3 bg-[#003D82] hover:bg-[#002960] disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href={`/companies/${slug}`}
            className="px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors text-sm">
            Cancel
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
