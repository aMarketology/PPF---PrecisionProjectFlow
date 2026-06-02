'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import {
  ArrowLeft, Wrench, DollarSign, MapPin, Clock, Tag, Award, Image as ImageIcon,
  Plus, X, CheckCircle2, Sparkles, Upload, Loader2, Trash2,
} from 'lucide-react'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { createClient } from '@/lib/supabase/client'

// Categories — kept aligned with the seed data and signup specialty list
const CATEGORIES = [
  'Structural Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'MEP / Building Systems',
  'Industrial / Manufacturing',
  'Controls & Automation',
  'Construction Services',
  'Project Management',
  'Engineering Analysis (FEA / CFD)',
  'CAD / Drafting',
  'Consulting Services',
  'Surveying & Site Work',
  'Architecture & Design',
  'Other',
]

const SERVICE_AREAS = [
  'Nationwide (Remote)',
  'Local — On-site only',
  'Regional (multi-state)',
  'Hybrid — Remote + On-site',
  'Custom (specify in description)',
]

const DELIVERY_OPTIONS = [
  '24–48 hours',
  '3–5 business days',
  '5–10 business days',
  '10–15 business days',
  '2–4 weeks',
  '1–2 months',
  'Custom timeline',
]

interface ChipInputProps {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
  icon: React.ReactNode
  max?: number
}

function ChipInput({ label, values, onChange, placeholder, icon, max = 12 }: ChipInputProps) {
  const [draft, setDraft] = useState('')
  function add() {
    const v = draft.trim()
    if (!v || values.includes(v) || values.length >= max) return
    onChange([...values, v])
    setDraft('')
  }
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        {icon}{label} <span className="text-xs text-gray-400 font-normal">({values.length}/{max})</span>
      </label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm"
        />
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

export default function CreateServicePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [certifications, setCertifications] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [active, setActive] = useState(true)
  const imageInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(file: File) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Only image files allowed'); return }
    setUploadingImage(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('service-images').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('service-images').getPublicUrl(path)
      setImageUrl(publicUrl)
      toast.success('Image uploaded!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  function validate(): string | null {
    if (!title.trim() || title.trim().length < 8) return 'Title must be at least 8 characters'
    if (!description.trim() || description.trim().length < 40) return 'Description must be at least 40 characters'
    const priceNum = parseFloat(price)
    if (!priceNum || priceNum < 1) return 'Price must be a positive number'
    if (!category) return 'Pick a category'
    if (!deliveryTime) return 'Pick a delivery time'
    if (!serviceArea) return 'Pick a service area'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { toast.error(err); return }

    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('You must be logged in'); router.push('/login'); return }

    const payload = {
      provider_id: user.id,
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
    }

    const { data, error } = await supabase.from('services').insert(payload).select('id').single()
    setSubmitting(false)

    if (error) {
      console.error(error)
      toast.error(error.message || 'Failed to create service')
      return
    }

    toast.success('Service created!')
    setTimeout(() => router.push(`/marketplace/service/${data.id}`), 600)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Toaster position="top-center" />
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-24 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <Link href="/dashboard/engineer" className="inline-flex items-center gap-2 text-blue-200 hover:text-white text-sm font-semibold mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B35] flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-sm font-medium">New Listing</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Add a Service</h1>
            </div>
          </div>
          <p className="text-blue-100 text-base max-w-2xl">
            List a service so clients can discover and purchase your engineering expertise. The more detail you provide, the higher you'll rank in search.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 relative z-10 pb-20">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 sm:p-8 space-y-7"
        >
          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Wrench className="w-4 h-4 text-[#003D82]" />Service Title
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Structural Engineering Plan Review & Stamped Drawings"
              maxLength={120}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{title.length}/120 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Tag className="w-4 h-4 text-[#003D82]" />Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what's included, your process, deliverables, applicable codes (IBC, ASCE, NFPA, etc.), and what makes you different. Min 40 characters."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">{description.length} characters · aim for 200+ for best results</p>
          </div>

          {/* Price + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 text-[#003D82]" />Starting Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="2500"
                  min="1"
                  step="any"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Clients can request quotes for custom scopes</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Wrench className="w-4 h-4 text-[#003D82]" />Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm bg-white"
              >
                <option value="">Select a category…</option>
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
              <select
                value={deliveryTime}
                onChange={e => setDeliveryTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm bg-white"
              >
                <option value="">Select delivery time…</option>
                {DELIVERY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-[#003D82]" />Service Area
              </label>
              <select
                value={serviceArea}
                onChange={e => setServiceArea(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#003D82] focus:ring-2 focus:ring-[#003D82]/10 outline-none text-sm bg-white"
              >
                <option value="">Select service area…</option>
                {SERVICE_AREAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          <ChipInput
            label="Tags / Skills"
            values={tags}
            onChange={setTags}
            placeholder="e.g. PE Stamped, ASCE 7-22, Seismic"
            icon={<Tag className="w-4 h-4 text-[#003D82]" />}
            max={10}
          />

          {/* Certifications */}
          <ChipInput
            label="Certifications & Licenses"
            values={certifications}
            onChange={setCertifications}
            placeholder="e.g. PE Licensed (TX), LEED AP, ASHRAE Member"
            icon={<Award className="w-4 h-4 text-[#003D82]" />}
            max={6}
          />

          {/* Cover Image Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4 text-[#003D82]" />Cover Image <span className="text-xs text-gray-400 font-normal">(optional · max 5 MB)</span>
            </label>
            {imageUrl ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Service cover" className="w-full max-h-56 object-cover rounded-xl border border-gray-100" />
                <button type="button" onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <p className="text-xs text-gray-400 mt-1.5">Hover image and click 🗑 to replace</p>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f) }}
                className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${dragOver ? 'border-[#003D82] bg-blue-50' : 'border-gray-200 hover:border-[#003D82] hover:bg-blue-50/40'}`}>
                {uploadingImage ? (
                  <><Loader2 className="w-8 h-8 text-[#003D82] animate-spin" /><p className="text-sm text-gray-500">Uploading…</p></>
                ) : (
                  <><Upload className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600">Click or drag & drop to upload</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WEBP · max 5 MB · 16:9 or square works best</p></>
                )}
              </div>
            )}
            <input ref={imageInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-900">Publish immediately</p>
              <p className="text-xs text-gray-500">Inactive listings stay private until you turn them on.</p>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative w-12 h-6 rounded-full transition-colors ${active ? 'bg-[#003D82]' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/dashboard/engineer"
              className="flex-1 sm:flex-none px-6 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-sm text-center transition-all">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-all shadow-lg"
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" />Publish Service</>
              )}
            </button>
          </div>
        </motion.form>

        {/* Tips card */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <h3 className="font-bold text-[#003D82] text-sm flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" />Tips for great listings
          </h3>
          <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
            <li>Lead with the deliverable: "PE-Stamped Structural Drawings" beats "Engineering Help"</li>
            <li>Mention specific codes (IBC 2021, ASCE 7-22, NFPA 96) — clients search for these</li>
            <li>Include 5+ tags so your listing surfaces in more filters</li>
            <li>Add certifications — verified credentials boost click-through by 3×</li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  )
}
