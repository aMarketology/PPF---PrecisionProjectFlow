'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import {
  ArrowLeft, Wrench, DollarSign, MapPin, Clock, Tag, Award, Image as ImageIcon,
  Plus, X, CheckCircle2, Save, Trash2, AlertTriangle,
} from 'lucide-react'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  'Structural Engineering','Civil Engineering','Mechanical Engineering','Electrical Engineering',
  'MEP / Building Systems','Industrial / Manufacturing','Controls & Automation','Construction Services',
  'Project Management','Engineering Analysis (FEA / CFD)','CAD / Drafting','Consulting Services',
  'Surveying & Site Work','Architecture & Design','Other',
]

const SERVICE_AREAS = [
  'Nationwide (Remote)','Local — On-site only','Regional (multi-state)',
  'Hybrid — Remote + On-site','Custom (specify in description)',
]

const DELIVERY_OPTIONS = [
  '24–48 hours','3–5 business days','5–10 business days','10–15 business days',
  '2–4 weeks','1–2 months','Custom timeline',
]

function ChipInput({
  label, values, onChange, placeholder, icon, max = 12,
}: {
  label: string; values: string[]; onChange: (next: string[]) => void;
  placeholder: string; icon: React.ReactNode; max?: number
}) {
  const [draft, setDraft] = useState('')
  function add() {
    const v = draft.trim()
    if (!v || values.includes(v) || values.length >= max) return
    onChange([...values, v]); setDraft('')
  }
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        {icon}{label} <span className="text-xs text-gray-400 font-normal">({values.length}/{max})</span>
      </label>
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm" />
        <button type="button" onClick={add}
          className="px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white rounded-xl text-sm font-semibold flex items-center gap-1 transition-all">
          <Plus className="w-4 h-4" />Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {values.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-[#003D82] border border-blue-100 rounded-full text-xs font-semibold">
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EditServicePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [certifications, setCertifications] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [active, setActive] = useState(true)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase.from('services').select('*').eq('id', id).single()
    if (error || !data) { toast.error('Service not found'); router.push('/dashboard/engineer'); return }
    if (data.provider_id !== user.id) {
      toast.error('You can only edit your own services')
      router.push('/dashboard/engineer'); return
    }

    setTitle(data.title || '')
    setDescription(data.description || '')
    setPrice(String(data.price ?? ''))
    setCategory(data.category || '')
    setDeliveryTime(data.delivery_time || '')
    setServiceArea(data.service_area || '')
    setTags(Array.isArray(data.tags) ? data.tags : [])
    setCertifications(Array.isArray(data.certifications) ? data.certifications : [])
    setImageUrl(Array.isArray(data.images) && data.images[0] ? data.images[0] : '')
    setActive(!!data.active)
    setLoading(false)
  }

  function validate(): string | null {
    if (!title.trim() || title.trim().length < 8) return 'Title must be at least 8 characters'
    if (!description.trim() || description.trim().length < 40) return 'Description must be at least 40 characters'
    const p = parseFloat(price); if (!p || p < 1) return 'Price must be a positive number'
    if (!category) return 'Pick a category'
    if (!deliveryTime) return 'Pick a delivery time'
    if (!serviceArea) return 'Pick a service area'
    return null
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const err = validate(); if (err) { toast.error(err); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('services').update({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      tags: tags.length > 0 ? tags : null,
      delivery_time: deliveryTime,
      service_area: serviceArea,
      certifications: certifications.length > 0 ? certifications : null,
      images: imageUrl.trim() ? [imageUrl.trim()] : null,
      active,
    }).eq('id', id)
    setSaving(false)
    if (error) { toast.error(error.message || 'Failed to save'); return }
    toast.success('Service updated!')
    setTimeout(() => router.push(`/marketplace/service/${id}`), 600)
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('services').delete().eq('id', id)
    setDeleting(false)
    if (error) { toast.error(error.message || 'Failed to delete'); return }
    toast.success('Service deleted')
    setTimeout(() => router.push('/dashboard/engineer'), 500)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#003D82]/20 border-t-[#003D82] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Toaster position="top-center" />
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <Link href="/dashboard/engineer" className="inline-flex items-center gap-2 text-blue-200 hover:text-white text-sm font-semibold mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B35] flex items-center justify-center shadow-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-sm font-medium">Edit Listing</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Edit Service</h1>
            </div>
          </div>
          <p className="text-blue-100 text-base max-w-2xl">Update pricing, scope, or visibility. Changes go live immediately.</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 relative z-10 pb-20">
        <motion.form onSubmit={handleSave}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 sm:p-8 space-y-7">
          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Wrench className="w-4 h-4 text-[#003D82]" />Service Title
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm" />
            <p className="text-xs text-gray-400 mt-1">{title.length}/120 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Tag className="w-4 h-4 text-[#003D82]" />Description
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm resize-y" />
            <p className="text-xs text-gray-400 mt-1">{description.length} characters</p>
          </div>

          {/* Price + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 text-[#003D82]" />Starting Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="1" step="any"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Wrench className="w-4 h-4 text-[#003D82]" />Category
              </label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm bg-white">
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Delivery + Service Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 text-[#003D82]" />Delivery Time
              </label>
              <select value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm bg-white">
                <option value="">Select…</option>
                {DELIVERY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-[#003D82]" />Service Area
              </label>
              <select value={serviceArea} onChange={e => setServiceArea(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm bg-white">
                <option value="">Select…</option>
                {SERVICE_AREAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <ChipInput label="Tags / Skills" values={tags} onChange={setTags}
            placeholder="e.g. PE Stamped, ASCE 7-22" icon={<Tag className="w-4 h-4 text-[#003D82]" />} max={10} />

          <ChipInput label="Certifications & Licenses" values={certifications} onChange={setCertifications}
            placeholder="e.g. PE Licensed (TX)" icon={<Award className="w-4 h-4 text-[#003D82]" />} max={6} />

          {/* Image URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4 text-[#003D82]" />Cover Image URL
            </label>
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm" />
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="preview" className="mt-3 w-full max-h-56 object-cover rounded-xl border border-gray-100"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-900">Listing visible to clients</p>
              <p className="text-xs text-gray-500">Toggle off to temporarily hide without deleting.</p>
            </div>
            <button type="button" onClick={() => setActive(!active)}
              className={`relative w-12 h-6 rounded-full transition-colors ${active ? 'bg-[#003D82]' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/dashboard/engineer"
              className="px-6 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-sm text-center transition-all">
              Cancel
            </Link>
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="px-6 py-3 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
              <Trash2 className="w-4 h-4" />Delete
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-all shadow-lg">
              {saving ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>)
                      : (<><Save className="w-4 h-4" />Save Changes</>)}
            </button>
          </div>
        </motion.form>
      </main>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Delete this service?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              This permanently removes the listing. Existing orders are kept. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-all">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                {deleting ? 'Deleting…' : (<><Trash2 className="w-4 h-4" />Delete</>)}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  )
}
