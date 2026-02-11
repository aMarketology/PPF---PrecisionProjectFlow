'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import { 
  FileText, 
  Upload, 
  Plus, 
  X, 
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Send
} from 'lucide-react'
import Link from 'next/link'

const engineeringCategories = [
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
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    quantity: '',
    budget: '',
    timeline: '',
    location: '',
    specifications: [] as File[],
    selectedSuppliers: [] as string[],
  })
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement RFQ submission to Supabase
    setSubmitted(true)
  }

  const nextStep = () => {
    if (step < 3) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg p-12 text-center"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              RFQ Submitted Successfully!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your request for quote has been sent to selected suppliers. You'll receive responses within 24-48 hours.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-bold text-gray-900 mb-2">What's Next?</h3>
              <ul className="text-left text-gray-700 space-y-2">
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Suppliers will review your requirements</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>You'll receive quotes via email and dashboard</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Compare quotes and select the best supplier</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Complete your order securely through our platform</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-[#003D82] hover:bg-[#0052A3] text-white rounded-lg font-semibold transition-colors"
              >
                View My RFQs
              </Link>
              <Link
                href="/marketplace"
                className="px-6 py-3 border-2 border-gray-300 hover:border-[#003D82] text-gray-700 hover:text-[#003D82] rounded-lg font-semibold transition-colors"
              >
                Browse Marketplace
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Request a Quote
          </h1>
          <p className="text-lg text-gray-600">
            Get quotes from multiple verified suppliers. It's free and takes just a few minutes.
          </p>
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
                  className="px-8 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-lg font-bold transition-colors flex items-center"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Submit RFQ
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
