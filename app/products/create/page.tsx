'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Package, DollarSign, FileText, ArrowLeft, Loader, Save, Tag, Zap, Upload, X, ImagePlus, Clock, MapPin, Award, CheckCircle, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'
import { toast } from 'react-hot-toast'

// ─── Schema ──────────────────────────────────────────────────────────────────
const serviceSchema = z.object({
  title: z.string().min(3, 'Required'),
  description: z.string().min(20, 'Must be at least 20 characters'),
  price: z.number().min(1, 'Minimum $1'),
  category: z.string().min(1, 'Required'),
  tags: z.string().optional(),
  delivery_time: z.string().optional(),
  service_area: z.enum(['remote', 'on-site', 'both']).optional(),
  certifications: z.string().optional(),
})
type ServiceFormData = z.infer<typeof serviceSchema>

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    emoji: '⚡',
    label: 'Electrical Design',
    category: 'Electrical Engineering',
    suggestedPrice: 2500,
    title: 'Electrical Panel & Load Design',
    description: 'Complete electrical panel design and load calculation for commercial or residential projects. Includes single-line diagrams, panel schedules, load calculations per NEC code, and stamped drawings ready for permit.',
    tags: 'electrical, panel design, load calc, NEC, permit',
  },
  {
    emoji: '🏗️',
    label: 'Structural Analysis',
    category: 'Structural Engineering',
    suggestedPrice: 3500,
    title: 'Structural Analysis & Engineering Report',
    description: 'Full structural analysis for your project including load path review, beam and column sizing, foundation recommendations, and a stamped PE report suitable for building permits and inspections.',
    tags: 'structural, analysis, PE stamp, beams, foundation',
  },
  {
    emoji: '❄️',
    label: 'HVAC System Design',
    category: 'Mechanical Engineering',
    suggestedPrice: 4000,
    title: 'HVAC System Design & Load Calculations',
    description: 'Comprehensive HVAC system design including Manual J/S/D calculations, equipment selection, duct layout drawings, and energy compliance documentation. Suitable for new construction and major renovations.',
    tags: 'HVAC, mechanical, duct design, Manual J, energy code',
  },
  {
    emoji: '💧',
    label: 'Plumbing Design',
    category: 'Civil Engineering',
    suggestedPrice: 1800,
    title: 'Plumbing System Design & Drawings',
    description: 'Full plumbing system design for commercial or residential projects. Includes supply and drain/waste/vent (DWV) drawings, fixture unit calculations, water heater sizing, and permit-ready documentation.',
    tags: 'plumbing, DWV, supply, fixture units, permit',
  },
  {
    emoji: '⚙️',
    label: 'CNC & Machining',
    category: 'Mechanical Engineering',
    suggestedPrice: 1200,
    title: 'Custom CNC Machining & Fabrication',
    description: 'Custom CNC machining services for precision parts. Provide your CAD files (STEP/IGES/DWG) and we produce to spec. Tolerances to ±0.001". Materials include aluminum, steel, titanium, and plastics. Small to mid-volume runs.',
    tags: 'CNC, machining, fabrication, precision, custom parts',
  },
  {
    emoji: '📐',
    label: 'CAD Drafting',
    category: 'Design Services',
    suggestedPrice: 750,
    title: 'Professional CAD Drafting & As-Builts',
    description: 'Accurate CAD drafting and as-built documentation services. We convert sketches, PDFs, or field measurements into professional AutoCAD or Revit drawings, ready for permit submittal or construction.',
    tags: 'CAD, AutoCAD, Revit, as-built, drafting',
  },
  {
    emoji: '🔬',
    label: 'Inspection & Testing',
    category: 'Analysis & Testing',
    suggestedPrice: 900,
    title: 'On-Site Inspection & Engineering Assessment',
    description: 'On-site engineering inspection and assessment report for existing structures, systems, or installations. Includes deficiency identification, code compliance review, photos, and written recommendations.',
    tags: 'inspection, assessment, compliance, report, on-site',
  },
  {
    emoji: '📋',
    label: 'Project Management',
    category: 'Project Management',
    suggestedPrice: 5000,
    title: 'Engineering Project Management Services',
    description: 'End-to-end project management for engineering and construction projects. Includes schedule development, subcontractor coordination, RFI/submittal management, progress reporting, and owner representation.',
    tags: 'project management, scheduling, coordination, construction',
  },
]

export default function CreateServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Image upload state
  const [images, setImages] = useState<{ file: File; preview: string; uploading: boolean; url?: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  })

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'engineer') {
      toast.error('Only vendors can create services')
      router.push('/dashboard/client')
      return
    }
    setUserId(user.id)
  }

  // ─── Image Handlers ────────────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    const allowed = arr.filter(f => f.type.startsWith('image/'))
    const remaining = 5 - images.length
    const toAdd = allowed.slice(0, remaining)
    if (!toAdd.length) return
    const newItems = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }))
    setImages(prev => [...prev, ...newItems])
  }, [images.length])

  function removeImage(index: number) {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadImages(): Promise<string[]> {
    if (!userId || images.length === 0) return []
    const supabase = createClient()
    const urls: string[] = []
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (img.url) { urls.push(img.url); continue }
      setImages(prev => prev.map((item, idx) => idx === i ? { ...item, uploading: true } : item))
      const ext = img.file.name.split('.').pop()
      const path = `${userId}/${Date.now()}-${i}.${ext}`
      const { data, error } = await supabase.storage.from('service-images').upload(path, img.file, { upsert: true })
      if (error) { console.error('Image upload error:', error); continue }
      const { data: { publicUrl } } = supabase.storage.from('service-images').getPublicUrl(data.path)
      urls.push(publicUrl)
      setImages(prev => prev.map((item, idx) => idx === i ? { ...item, uploading: false, url: publicUrl } : item))
    }
    return urls
  }

  function applyTemplate(index: number) {
    const t = TEMPLATES[index]
    setSelectedTemplate(index)
    setShowForm(true)
    setValue('title', t.title)
    setValue('description', t.description)
    setValue('price', t.suggestedPrice)
    setValue('category', t.category)
    setValue('tags', t.tags)
    // Scroll to form
    setTimeout(() => document.getElementById('service-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function startBlank() {
    setSelectedTemplate(null)
    setShowForm(true)
    reset()
    setTimeout(() => document.getElementById('service-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  async function onSubmit(data: ServiceFormData) {
    if (!userId) { toast.error('Not authenticated'); return }
    setLoading(true)
    try {
      const supabase = createClient()

      // Upload images first
      const imageUrls = await uploadImages()

      const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      const certsArray = data.certifications ? data.certifications.split(',').map(c => c.trim()).filter(Boolean) : []

      const { data: inserted, error } = await supabase.from('services').insert([{
        provider_id: userId,
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        tags: tagsArray,
        images: imageUrls,
        delivery_time: data.delivery_time || null,
        service_area: data.service_area || 'remote',
        certifications: certsArray.length > 0 ? certsArray : null,
        active: true,
      }]).select('id').single()
      if (error) throw error
      toast.success('Service listed! Clients can now find and purchase it.')

      // Auto-post new service listing to the feed
      if (inserted?.id) {
        fetch('/api/feed/auto-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'service_listed', serviceId: inserted.id, vendorId: userId }),
        }).catch(() => {})
      }

      router.push('/dashboard/engineer')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create service')
    } finally {
      setLoading(false)
    }
  }

  const watchPrice = watch('price')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link href="/dashboard/engineer" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">List a New Service</h1>
            <p className="text-gray-500 mt-1">Pick a template to pre-fill the form, then adjust pricing and publish.</p>
          </motion.div>

          {/* ── Template Grid ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-800">Quick-fill templates</h2>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">click any to auto-fill</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {TEMPLATES.map((t, i) => (
                <motion.button
                  key={i}
                  onClick={() => applyTemplate(i)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedTemplate === i
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="text-2xl mb-2">{t.emoji}</div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-1">${t.suggestedPrice.toLocaleString()}</p>
                </motion.button>
              ))}
              {/* Blank / custom */}
              <motion.button
                onClick={startBlank}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`text-left p-4 rounded-xl border-2 border-dashed transition-all ${
                  showForm && selectedTemplate === null
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-2">✏️</div>
                <p className="text-sm font-semibold text-gray-900">Custom</p>
                <p className="text-xs text-gray-500 mt-1">Start blank</p>
              </motion.button>
            </div>
          </motion.div>

          {/* ── Form ── */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                id="service-form"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl shadow-xl p-8 mt-6"
              >
                {selectedTemplate !== null && (
                  <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-xl">{TEMPLATES[selectedTemplate].emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Template: {TEMPLATES[selectedTemplate].label}</p>
                      <p className="text-xs text-blue-600">All fields pre-filled — add photos, set your price and hit publish</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                  {/* ── Photo Upload ── */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ImagePlus className="w-4 h-4 text-blue-500" />
                      Service Photos
                      <span className="font-normal text-gray-400 text-xs">(up to 5 — drag & drop or click)</span>
                    </label>

                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
                      onClick={() => images.length < 5 && fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                        dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40'
                      } ${images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                            <Upload className="w-6 h-6 text-blue-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">Drop photos here or click to browse</p>
                          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — up to 5 images. Show your work, equipment, or deliverables.</p>
                        </div>
                      ) : (
                        <div className="p-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {images.map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                              <img src={img.preview} alt="" className="w-full h-full object-cover" />
                              {img.uploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <Loader className="w-4 h-4 text-white animate-spin" />
                                </div>
                              )}
                              {i === 0 && (
                                <div className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[10px] text-center py-0.5 font-medium">
                                  Cover
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); removeImage(i) }}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                          {images.length < 5 && (
                            <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-blue-300 transition-colors">
                              <ImagePlus className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => e.target.files && addFiles(e.target.files)}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Title *</label>
                    <input
                      type="text"
                      {...register('title')}
                      placeholder="e.g., Structural Analysis Report for Commercial Build"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                    />
                    {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Description * <span className="font-normal text-gray-400 text-xs">— what's included, deliverables, your process</span>
                    </label>
                    <textarea
                      {...register('description')}
                      rows={5}
                      placeholder="Describe exactly what clients receive, your process, deliverables, and turnaround time. Be specific — clients in this industry want details."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none text-sm"
                    />
                    {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
                  </div>

                  {/* Price + Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (USD) *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          {...register('price', { valueAsNumber: true })}
                          placeholder="500"
                          className="w-full pl-7 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                        />
                      </div>
                      {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
                      {watchPrice > 0 && (
                        <p className="mt-1 text-xs text-green-600 font-medium">
                          You receive: ${(watchPrice * 0.9).toFixed(2)} after 10% platform fee
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                      <select
                        {...register('category')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                      >
                        <option value="">Select category</option>
                        {['Structural Engineering','Mechanical Engineering','Electrical Engineering','Civil Engineering','Software Engineering','Consulting Services','Design Services','Analysis & Testing','Project Management','Other Services'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
                    </div>
                  </div>

                  {/* Delivery Time + Service Area */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Delivery / Turnaround
                      </label>
                      <select
                        {...register('delivery_time')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                      >
                        <option value="">Select timeframe</option>
                        <option value="1-2 days">1–2 business days</option>
                        <option value="3-5 days">3–5 business days</option>
                        <option value="1-2 weeks">1–2 weeks</option>
                        <option value="2-4 weeks">2–4 weeks</option>
                        <option value="1-2 months">1–2 months</option>
                        <option value="2+ months">2+ months</option>
                        <option value="Project-based">Project-based (quote)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        Service Area
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['remote', 'on-site', 'both'] as const).map(area => (
                          <label key={area} className="cursor-pointer">
                            <input type="radio" {...register('service_area')} value={area} className="sr-only peer" />
                            <div className="text-center py-2.5 px-2 rounded-xl border-2 border-gray-200 text-xs font-medium text-gray-600 transition-all peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 hover:border-blue-200 capitalize">
                              {area === 'on-site' ? 'On-Site' : area.charAt(0).toUpperCase() + area.slice(1)}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Certifications */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-gray-400" />
                      Credentials & Certifications
                      <span className="font-normal text-gray-400 text-xs">(optional, comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      {...register('certifications')}
                      placeholder="PE License, OSHA 30, PMP, LEED AP, AWS D1.1..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-400">Certs and licenses are shown as badges on your listing — builds trust with buyers</p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Search Tags <span className="font-normal text-gray-400">(optional, comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      {...register('tags')}
                      placeholder="structural, CAD, AutoCAD, permit, seismic..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-400">Help buyers find your listing by adding relevant keywords</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !userId}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {loading
                        ? <><Loader className="w-4 h-4 animate-spin" /> {images.some(i => i.uploading) ? 'Uploading photos...' : 'Publishing...'}</>
                        : <><CheckCircle className="w-4 h-4" /> Publish Service</>
                      }
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
      <Footer />
    </div>
  )
}
