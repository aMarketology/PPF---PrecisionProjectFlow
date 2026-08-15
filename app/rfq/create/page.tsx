'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Plus, 
  Trash2,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  BookOpen,
  Info,
  Zap,
  Package,
  Plane,
} from 'lucide-react'
import Link from 'next/link'

const engineeringCategories = [
  'CNC Machining',
  'Industrial Parts & Replacement',
  'Sheet Metal & Fabrication',
  '3D Printing / Additive Manufacturing',
  'Injection Molding & Tooling',
  'Electrical & Controls',
  'Welding & Assembly',
  'Quality & Inspection',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Structural Engineering',
  'HVAC Systems',
  'Plumbing & Piping',
  'Fire Protection',
  'Controls & Automation',
  'Industrial Manufacturing',
  'Material Handling',
  'Other'
]

interface RFQLineItem {
  part: string
  qty: string
  material: string
  tolerance: string
  finish: string
  notes: string
}

const emptyLineItem = (): RFQLineItem => ({
  part: '', qty: '', material: '', tolerance: '', finish: '', notes: '',
})

export default function CreateRFQPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    quantity: '',
    budget: '',
    timeline: '',
    location: '',
    material: '',
    is_asap: false,
    is_next_day_air: false,
    selectedSuppliers: [] as string[],
  })
  const [lineItems, setLineItems] = useState<RFQLineItem[]>([emptyLineItem()])
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rfqId, setRfqId] = useState<string | null>(null)
  const [rfqSlug, setRfqSlug] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target
    const name = target.name
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const updateLineItem = (index: number, field: keyof RFQLineItem, value: string) => {
    setLineItems(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))
  }

  const removeLineItem = (index: number) => {
    setLineItems(items => items.length === 1 ? [emptyLineItem()] : items.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error('You must be signed in to submit an RFQ')
        router.push('/login?next=/rfq/create')
        return
      }

      const populatedLineItems = lineItems
        .filter(item => item.part.trim())
        .map(item => ({
          part: item.part.trim(),
          qty: item.qty ? Number(item.qty) : null,
          material: item.material.trim() || null,
          tolerance: item.tolerance.trim() || null,
          finish: item.finish.trim() || null,
          notes: item.notes.trim() || null,
        }))

      const payload = {
        client_id: user.id,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        quantity: formData.quantity.trim() || null,
        budget: formData.budget.trim() || null,
        timeline: formData.timeline || null,
        location: formData.location.trim() || null,
        material: formData.material.trim() || null,
        nda_required: false,
        is_asap: formData.is_asap,
        is_next_day_air: formData.is_next_day_air,
        line_items: populatedLineItems,
        slug: formData.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-' + crypto.randomUUID().substring(0, 8),
        status: 'open',
      }

      let { data, error } = await supabase.from('rfqs').insert(payload).select('id, slug').single()

      const nextDayColumnMissing = error?.message?.includes('is_next_day_air') || error?.details?.includes('is_next_day_air')
      if (nextDayColumnMissing && !formData.is_next_day_air) {
        const { is_next_day_air: _unused, ...compatiblePayload } = payload
        const retry = await supabase.from('rfqs').insert(compatiblePayload).select('id, slug').single()
        data = retry.data
        error = retry.error
      }

      if (error) {
        if (nextDayColumnMissing && formData.is_next_day_air) {
          throw new Error('Next Day Air is not enabled in the database yet. Run supabase/RFQ_NEXT_DAY_AIR.sql, then submit again.')
        }
        throw new Error(error.message || error.details || error.hint || 'The database rejected this RFQ')
      }
      if (!data) throw new Error('The RFQ was not created. No record was returned by the database.')

      setRfqId(data.id)
      setRfqSlug(data.slug)
      setSubmitted(true)
      toast.success('RFQ submitted successfully!')

      // Fire-and-forget: notify matching engineers (non-blocking)
      fetch('/api/rfq/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfqId: data.id }),
      }).catch(e => console.error('[rfq notify]', e))
    } catch (err: any) {
      console.error('RFQ submit error:', err)
      const message = err?.message || 'Failed to submit RFQ. Please review the form and try again.'
      setSubmitError(message)
      toast.error(message, { duration: 7000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.title.trim()) return toast.error('Enter a project title before continuing.')
      if (!formData.category) return toast.error('Select an RFQ category before continuing.')
      if (!formData.description.trim()) return toast.error('Describe the project before continuing.')
      if (!formData.location.trim()) return toast.error('Enter the project location before continuing.')
      if (!formData.timeline) return toast.error('Select a project timeline before continuing.')
    }
    if (step === 2) {
      const incompletePart = lineItems.find(item => (item.qty || item.material || item.tolerance || item.finish || item.notes) && !item.part.trim())
      if (incompletePart) return toast.error('Every part with details needs a part name or part number.')
    }
    setSubmitError(null)
    if (step < 3) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">RFQ Submitted!</h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Your request has been posted. Verified engineering vendors can now view and respond to it.
            </p>
            <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-5 mb-8 text-left">
              <h3 className="font-bold text-gray-900 mb-3">What happens next?</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  'Vendors browse open RFQs and contact you directly',
                  'You\'ll receive messages through your dashboard',
                  'Compare responses and select the best fit',
                  'Complete your order securely through PPF',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/client"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl transition-all"
              >
                Go to My Dashboard
              </Link>
              <Link
                href="/profiles"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 hover:border-[#003D82] text-gray-700 hover:text-[#003D82] font-semibold rounded-xl transition-all"
              >
                Browse Engineers
              </Link>
              <Link
                href={`/rfq/${rfqSlug || rfqId}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-all"
              >
                View Your RFQ <FileText className="w-4 h-4" />
              </Link>
              <Link
                href="/rfq"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                Browse RFQ Marketplace
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Request a Quote
              </h1>
              <p className="text-lg text-gray-600">
                Get quotes from multiple verified suppliers. It's free and takes just a few minutes.
              </p>
            </div>
            <Link
              href="/docs/MANIFESTO.md"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl transition-all text-sm flex-shrink-0"
            >
              <BookOpen className="w-4 h-4" /> Our Manifesto
            </Link>
          </div>
        </div>

        {/* What makes a great RFQ? */}
        <div className="mb-8 bg-gradient-to-r from-[#001f4d] via-[#003D82] to-[#005BB5] rounded-2xl p-6 text-white">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-200 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg mb-2">What makes a great RFQ?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-100">
                <div>
                  <p className="font-semibold text-white mb-1">📐 Be Specific</p>
                  <p>Include materials, tolerances, quantities, finishes, and any certifications required (ISO, ASME, etc.)</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">📎 Attach Files</p>
                  <p>CAD files, drawings, specs, and reference images help vendors quote accurately</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">⏱️ Set Realistic Timelines</p>
                  <p>Clear deadlines help vendors assess capacity and prioritize your project</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  s <= step 
                    ? 'border-[#003D82] bg-[#003D82] text-white' 
                    : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  <span className="font-bold">{s}</span>
                </div>
                <div className={`flex-1 h-1 mx-4 ${
                  s < 3 ? (s < step ? 'bg-[#003D82]' : 'bg-gray-300') : 'hidden'
                }`}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-sm ${step >= 1 ? 'text-[#003D82] font-medium' : 'text-gray-500'}`}>
              Project Details
            </span>
            <span className={`text-sm ${step >= 2 ? 'text-[#003D82] font-medium' : 'text-gray-500'}`}>
              Requirements
            </span>
            <span className={`text-sm ${step >= 3 ? 'text-[#003D82] font-medium' : 'text-gray-500'}`}>
              Review & Submit
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Step 1: Project Details */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Tell us about your project
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., Structural Steel Fabrication for Office Building"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                      required
                    >
                      <option value="">Select a category...</option>
                      {engineeringCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder="Describe your project requirements, scope of work, technical specifications, and any special considerations..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Be as detailed as possible to receive accurate quotes
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Project Location *
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="City, State"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Timeline *
                      </label>
                      <select
                        name="timeline"
                        value={formData.timeline}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                        required
                      >
                        <option value="">Select timeline...</option>
                        <option value="Urgent (1-2 weeks)">Urgent (1-2 weeks)</option>
                        <option value="1 month">1 Month</option>
                        <option value="2-3 months">2-3 Months</option>
                        <option value="3-6 months">3-6 Months</option>
                        <option value="6+ months">6+ Months</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material / Specifications
                    </label>
                    <input
                      type="text"
                      name="material"
                      value={formData.material}
                      onChange={handleInputChange}
                      placeholder="e.g., 6061-T6 Aluminum, A36 Steel, ABS Plastic, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Specify materials, grades, finishes, or any special requirements
                    </p>
                  </div>

                  {/* ── Urgency Toggles ── */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <label className={`flex items-center gap-3 px-5 py-3.5 border-2 rounded-xl cursor-pointer transition-all flex-1 ${
                      formData.is_asap
                        ? 'border-[#FF6B35] bg-orange-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        name="is_asap"
                        checked={formData.is_asap}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.is_asap ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-gray-300'
                      }`}>
                        {formData.is_asap && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span className="font-semibold text-gray-900 text-sm">ASAP</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">Expedited production or turnaround is required</p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 px-5 py-3.5 border-2 rounded-xl cursor-pointer transition-all flex-1 ${
                      formData.is_next_day_air
                        ? 'border-[#003D82] bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        name="is_next_day_air"
                        checked={formData.is_next_day_air}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.is_next_day_air ? 'border-[#003D82] bg-[#003D82]' : 'border-gray-300'
                      }`}>
                        {formData.is_next_day_air && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Plane className="w-4 h-4 text-[#003D82]" />
                          <span className="font-semibold text-gray-900 text-sm">Next Day Air</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">Quote expedited next-day shipping separately</p>
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Requirements */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Quote Requirements
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="text"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        placeholder="e.g., 500 units, 10,000 sq ft"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Budget Range
                      </label>
                      <input type="text" name="budget" value={formData.budget} onChange={handleInputChange}
                        placeholder="e.g., $18,000 - $28,000 or To be discussed"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent" />
                    </div>
                  </div>

                  {/* ── Part Line Items ── */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Package className="w-5 h-5 text-[#003D82]" /> Parts to Quote</h3>
                        <p className="mt-1 text-xs text-gray-500">Add each unique part number exactly as vendors should quote it.</p>
                      </div>
                      <button type="button" onClick={() => setLineItems(items => [...items, emptyLineItem()])}
                        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#003D82] px-3 py-2 text-xs font-semibold text-white hover:bg-[#002960]">
                        <Plus className="w-3.5 h-3.5" /> Add Part
                      </button>
                    </div>
                    <div className="space-y-4">
                      {lineItems.map((item, index) => (
                        <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-900">Part {index + 1}</p>
                            <button type="button" onClick={() => removeLineItem(index)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remove part"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-gray-600">Part Name / Part Number</label><input value={item.part} onChange={e => updateLineItem(index, 'part', e.target.value)} placeholder="e.g., Mounting Bracket - P/N MB-001 Rev C" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#003D82]" /></div>
                            <div><label className="mb-1 block text-xs font-semibold text-gray-600">Quantity</label><input type="number" min="1" value={item.qty} onChange={e => updateLineItem(index, 'qty', e.target.value)} placeholder="250" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#003D82]" /></div>
                            <div><label className="mb-1 block text-xs font-semibold text-gray-600">Material</label><input value={item.material} onChange={e => updateLineItem(index, 'material', e.target.value)} placeholder="6061-T6 Aluminum" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#003D82]" /></div>
                            <div><label className="mb-1 block text-xs font-semibold text-gray-600">Tolerance</label><input value={item.tolerance} onChange={e => updateLineItem(index, 'tolerance', e.target.value)} placeholder={'e.g., +/-0.005"'} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#003D82]" /></div>
                            <div><label className="mb-1 block text-xs font-semibold text-gray-600">Finish</label><input value={item.finish} onChange={e => updateLineItem(index, 'finish', e.target.value)} placeholder="Clear anodize, MIL-A-8625 Type II" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#003D82]" /></div>
                            <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-gray-600">Drawing / Manufacturing Notes</label><textarea value={item.notes} onChange={e => updateLineItem(index, 'notes', e.target.value)} rows={2} placeholder="Drawing revision, hole pattern, inspection, deburring, labeling, or packaging notes" className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#003D82]" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-1">Pro Tips for Better Quotes:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          <li>Include technical drawings or CAD files if available</li>
                          <li>Specify material requirements and quality standards</li>
                          <li>Mention any certifications or compliance requirements</li>
                          <li>Provide reference images or examples</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Review Your RFQ
                </h2>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Project Title</h3>
                      <p className="text-lg font-semibold text-gray-900">{formData.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
                        <p className="text-gray-900">{formData.category}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                        <p className="text-gray-900">{formData.location}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Timeline</h3>
                        <p className="text-gray-900">{formData.timeline || 'Not specified'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Budget</h3>
                        <p className="text-gray-900">{formData.budget || 'To be discussed'}</p>
                      </div>
                    </div>

                    {lineItems.some(item => item.part.trim()) && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Parts to Quote</h3>
                        <div className="space-y-2">
                          {lineItems.filter(item => item.part.trim()).map((item, index) => (
                            <div key={index} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-gray-900">{item.part}</p>{item.qty && <span className="flex-shrink-0 text-xs font-semibold text-gray-600">Qty {item.qty}</span>}</div>
                              <p className="mt-1 text-xs text-gray-500">{[item.material, item.tolerance, item.finish].filter(Boolean).join(' | ')}</p>
                              {item.notes && <p className="mt-1 text-xs text-gray-600">{item.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {formData.is_asap && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-semibold">
                          <Zap className="w-3.5 h-3.5" />
                          ASAP
                        </span>
                      )}
                      {formData.is_next_day_air && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                          <Plane className="w-3.5 h-3.5" />
                          Next Day Air
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                      <p className="text-gray-900 whitespace-pre-wrap">{formData.description}</p>
                    </div>

                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <CheckCircle2 className="w-6 h-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">Your RFQ will be sent to:</h3>
                        <ul className="text-sm text-gray-700 space-y-2">
                          <li className="flex items-center">
                            <Building2 className="w-4 h-4 mr-2 text-green-600" />
                            All verified suppliers in <strong className="mx-1">{formData.category}</strong>
                          </li>
                          <li className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-green-600" />
                            Suppliers serving <strong className="mx-1">{formData.location}</strong>
                          </li>
                          <li className="flex items-center">
                            <Send className="w-4 h-4 mr-2 text-green-600" />
                            <span>Estimated <strong className="mx-1">5-10 qualified suppliers</strong> will receive your RFQ</span>
                          </li>
                        </ul>
                        <p className="text-sm text-gray-600 mt-3">
                          You'll start receiving quotes within 24-48 hours via email and your dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            {submitError && (
              <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-bold text-red-800">RFQ could not be submitted</p>
                    <p className="mt-1 text-sm text-red-700">{submitError}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  step === 1
                    ? 'invisible'
                    : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Previous
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 bg-[#003D82] hover:bg-[#0052A3] text-white rounded-lg font-semibold transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
                  ) : (
                    <><Send className="w-5 h-5" /> Submit RFQ</>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  )
}
