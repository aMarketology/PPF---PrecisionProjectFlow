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
  Upload, 
  Plus, 
  X, 
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
  Shield,
  Zap,
  Package,
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
    nda_required: false,
    is_asap: false,
    inventoryStatus: '' as '' | 'in_stock' | 'out_of_stock' | 'back_order',
    leadTimeDays: '',
    estimatedShipDate: '',
    lineItems: [] as {
      part: string;
      qty: string;
      material: string;
      tolerance: string;
      finish: string;
      notes: string;
    }[],
    specifications: [] as File[],
    selectedSuppliers: [] as string[],
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rfqId, setRfqId] = useState<string | null>(null)
  const [rfqSlug, setRfqSlug] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target
    const name = target.name
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setFormData(prev => ({ ...prev, specifications: [...prev.specifications, ...files] }))
    }
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }))
  }

  // ── Line items (parts list) ──
  const updateLineItem = (index: number, field: keyof typeof formData.lineItems[number], value: string) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { part: '', qty: '', material: '', tolerance: '', finish: '', notes: '' }]
    }))
  }

  const removeLineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }))
  }

  const lineItemsForDb = () => formData.lineItems
    .filter(li => li.part.trim() !== '')
    .map(li => ({
      part: li.part.trim(),
      qty: li.qty.trim() !== '' ? Number(li.qty) : null,
      material: li.material.trim() || null,
      tolerance: li.tolerance.trim() || null,
      finish: li.finish.trim() || null,
      notes: li.notes.trim() || null,
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error('You must be signed in to submit an RFQ')
        router.push('/login?next=/rfq/create')
        return
      }

      const { data, error } = await supabase
        .from('rfqs')
        .insert({
          client_id: user.id,
          title: formData.title,
          category: formData.category,
          description: formData.description,
          quantity: formData.quantity || null,
          budget: formData.budget || null,
          timeline: formData.timeline || null,
          location: formData.location || null,
          material: formData.material || null,
          nda_required: formData.nda_required,
          is_asap: formData.is_asap,
          inventory_status: formData.inventoryStatus || null,
          lead_time_days: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : null,
          estimated_ship_date: formData.estimatedShipDate || null,
          line_items: lineItemsForDb().length > 0 ? lineItemsForDb() : null,
          slug: formData.title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '-' + crypto.randomUUID().substring(0, 8),
          status: 'open',
        })
        .select('id, slug')
        .single()

      if (error) throw error

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
      toast.error('Failed to submit RFQ. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
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
                        <option value="urgent">Urgent (1-2 weeks)</option>
                        <option value="1-month">1 Month</option>
                        <option value="2-3-months">2-3 Months</option>
                        <option value="3-6-months">3-6 Months</option>
                        <option value="6-months-plus">6+ Months</option>
                        <option value="flexible">Flexible</option>
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

                  {/* ── NDA & ASAP Toggles ── */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <label className={`flex items-center gap-3 px-5 py-3.5 border-2 rounded-xl cursor-pointer transition-all flex-1 ${
                      formData.nda_required
                        ? 'border-[#003D82] bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        name="nda_required"
                        checked={formData.nda_required}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.nda_required ? 'border-[#003D82] bg-[#003D82]' : 'border-gray-300'
                      }`}>
                        {formData.nda_required && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold text-gray-900 text-sm">NDA Required</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">Vendors must sign before viewing details</p>
                      </div>
                    </label>

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
                          <span className="font-semibold text-gray-900 text-sm">ASAP / Next Day Air</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">Need this right away — urgent turnaround required</p>
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
                  Additional Requirements
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
                      <select
                        name="budget"
                        value={formData.budget}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                      >
                        <option value="">Select budget...</option>
                        <option value="under-10k">Under $10,000</option>
                        <option value="10k-25k">$10,000 - $25,000</option>
                        <option value="25k-50k">$25,000 - $50,000</option>
                        <option value="50k-100k">$50,000 - $100,000</option>
                        <option value="100k-250k">$100,000 - $250,000</option>
                        <option value="250k-plus">$250,000+</option>
                        <option value="to-be-discussed">To be discussed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Upload Specifications (Optional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#003D82] transition-colors">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.dwg,.dxf,.zip"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, DWG, DXF, ZIP (max 50MB)
                        </p>
                      </label>
                    </div>

                    {formData.specifications.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {formData.specifications.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                            <div className="flex items-center">
                              <FileText className="w-5 h-5 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-700">{file.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Inventory & Shipping ── */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-[#003D82]" />
                      Inventory &amp; Shipping
                    </h3>

                    {/* Inventory Status — radio buttons */}
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Inventory Status</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { value: 'in_stock', label: 'In Stock', desc: 'Items available now', icon: '🟢' },
                          { value: 'out_of_stock', label: 'Out of Stock', desc: 'Currently unavailable', icon: '🔴' },
                          { value: 'back_order', label: 'Back Order', desc: 'Accepting orders, delayed fulfillment', icon: '🟡' },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className={`flex-1 min-w-[140px] cursor-pointer rounded-xl border-2 p-4 transition-all ${
                              formData.inventoryStatus === opt.value
                                ? 'border-[#003D82] bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="inventoryStatus"
                              value={opt.value}
                              checked={formData.inventoryStatus === opt.value}
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <div className="flex flex-col items-center text-center gap-1">
                              <span className="text-xl">{opt.icon}</span>
                              <span className="font-semibold text-gray-900 text-sm">{opt.label}</span>
                              <span className="text-[10px] text-gray-500 leading-tight">{opt.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Lead Time */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Clock className="w-4 h-4 inline mr-1 text-gray-400" />
                          Lead Time (days)
                        </label>
                        <input
                          type="number"
                          name="leadTimeDays"
                          value={formData.leadTimeDays}
                          onChange={handleInputChange}
                          min="0"
                          placeholder="e.g. 14"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of days to manufacture/procure before shipping</p>
                      </div>

                      {/* Estimated Ship Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1 text-gray-400" />
                          Estimated Ship Date
                        </label>
                        <input
                          type="date"
                          name="estimatedShipDate"
                          value={formData.estimatedShipDate}
                          onChange={handleInputChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent text-gray-700"
                        />
                        <p className="text-xs text-gray-500 mt-1">Select the date you expect the order to ship</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Line Items (Parts List) ── */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#003D82]" />
                        Line Items / Parts List
                        {formData.lineItems.length > 0 && (
                          <span className="text-xs font-medium bg-blue-50 text-[#003D82] px-2 py-0.5 rounded-full">
                            {formData.lineItems.length} {formData.lineItems.length === 1 ? 'item' : 'items'}
                          </span>
                        )}
                      </h3>
                      <button
                        type="button"
                        onClick={addLineItem}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#003D82] hover:bg-[#002960] text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Line Item
                      </button>
                    </div>

                    {formData.lineItems.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                        <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">No line items yet</p>
                        <p className="text-xs text-gray-400 max-w-md mx-auto">
                          Add each part you need quoted separately — vendors can then price each line
                          accurately and quote the whole job in one offer.
                        </p>
                        <button
                          type="button"
                          onClick={addLineItem}
                          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#003D82] border-2 border-[#003D82] rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Add First Line Item
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.lineItems.map((item, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <Package className="w-3.5 h-3.5" /> Item {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold"
                              >
                                <X className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div className="lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Part Name / Description *</label>
                                <input
                                  type="text"
                                  value={item.part}
                                  onChange={e => updateLineItem(idx, 'part', e.target.value)}
                                  placeholder="e.g., Mounting Bracket — P/N BR-102"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={e => updateLineItem(idx, 'qty', e.target.value)}
                                  min="1"
                                  placeholder="e.g., 250"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                                <input
                                  type="text"
                                  value={item.material}
                                  onChange={e => updateLineItem(idx, 'material', e.target.value)}
                                  placeholder="e.g., 6061-T6 Aluminum"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tolerance</label>
                                <input
                                  type="text"
                                  value={item.tolerance}
                                  onChange={e => updateLineItem(idx, 'tolerance', e.target.value)}
                                  placeholder="e.g., ±0.005&quot;"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Finish</label>
                                <input
                                  type="text"
                                  value={item.finish}
                                  onChange={e => updateLineItem(idx, 'finish', e.target.value)}
                                  placeholder="e.g., Clear anodize"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent text-sm"
                                />
                              </div>
                              <div className="lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Drawing Ref</label>
                                <input
                                  type="text"
                                  value={item.notes}
                                  onChange={e => updateLineItem(idx, 'notes', e.target.value)}
                                  placeholder="e.g., Per DWG-MB-102 Rev C — deburr all edges"
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-transparent text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addLineItem}
                          className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-500 hover:border-[#003D82] hover:text-[#003D82] transition-colors"
                        >
                          <Plus className="w-4 h-4 inline mr-1" /> Add Another Line Item
                        </button>
                      </div>
                    )}
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

                    {formData.inventoryStatus && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Inventory</h3>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            formData.inventoryStatus === 'in_stock' ? 'bg-emerald-100 text-emerald-700' :
                            formData.inventoryStatus === 'out_of_stock' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {formData.inventoryStatus === 'in_stock' ? '🟢 In Stock' :
                             formData.inventoryStatus === 'out_of_stock' ? '🔴 Out of Stock' : '🟡 Back Order'}
                          </span>
                        </div>
                        {formData.leadTimeDays && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Lead Time</h3>
                            <p className="text-gray-900">{formData.leadTimeDays} days</p>
                          </div>
                        )}
                        {formData.estimatedShipDate && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Ship Date</h3>
                            <p className="text-gray-900">{new Date(formData.estimatedShipDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {formData.nda_required && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                          <Shield className="w-3.5 h-3.5" />
                          NDA Required
                        </span>
                      )}
                      {formData.is_asap && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-semibold">
                          <Zap className="w-3.5 h-3.5" />
                          ASAP / Next Day Air
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                      <p className="text-gray-900 whitespace-pre-wrap">{formData.description}</p>
                    </div>

                    {formData.specifications.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Attached Files</h3>
                        <div className="space-y-1">
                          {formData.specifications.map((file, idx) => (
                            <div key={idx} className="flex items-center text-sm text-gray-700">
                              <FileText className="w-4 h-4 mr-2" />
                              {file.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Line Items Review ── */}
                    {formData.lineItems.filter(li => li.part.trim()).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Line Items / Parts List
                          <span className="text-xs font-medium bg-blue-50 text-[#003D82] px-2 py-0.5 rounded-full">
                            {formData.lineItems.filter(li => li.part.trim()).length} items
                          </span>
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Part</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Qty</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Material</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Tolerance</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Finish</th>
                                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {formData.lineItems.filter(li => li.part.trim()).map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-gray-900">{item.part}</td>
                                  <td className="px-4 py-3 text-gray-700">{item.qty || '—'}</td>
                                  <td className="px-4 py-3 text-gray-700">{item.material || '—'}</td>
                                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">{item.tolerance || '—'}</td>
                                  <td className="px-4 py-3 text-gray-700">{item.finish || '—'}</td>
                                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{item.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
