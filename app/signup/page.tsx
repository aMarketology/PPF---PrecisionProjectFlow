'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import {
  User, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  MapPin, Briefcase, Building2, CheckCircle2, Loader2,
  Star, Shield, Users, TrendingUp, ChevronRight, Phone,
  Globe, DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Schemas ───────────────────────────────────────────────────────────────────
const accountSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  userType: z.enum(['client', 'engineer']),
  terms: z.boolean().refine(v => v === true, 'You must agree to the terms'),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

const engineerSchema = z.object({
  companyName: z.string().min(2, 'Company or display name is required'),
  category: z.string().min(1, 'Select your primary engineering category'),
  location: z.string().min(2, 'Location is required'),
  bio: z.string().min(20, 'Bio must be at least 20 characters'),
  phone: z.string().optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  hourlyRate: z.string().optional(),
})

const clientSchema = z.object({
  companyName: z.string().optional(),
  companySize: z.string().min(1, 'Select your company size'),
  location: z.string().min(2, 'Location is required'),
  primaryNeed: z.string().min(1, 'Select your primary need'),
})

type AccountData   = z.infer<typeof accountSchema>
type EngineerData  = z.infer<typeof engineerSchema>
type ClientData    = z.infer<typeof clientSchema>

// ── Constants ─────────────────────────────────────────────────────────────────
const ENGINEERING_CATEGORIES = [
  'Structural Engineering', 'Mechanical Engineering', 'Electrical Engineering',
  'Civil Engineering', 'HVAC & MEP', 'Geotechnical Engineering',
  'Environmental Engineering', 'Controls & Automation', 'Industrial Manufacturing',
  'Project Management', 'Design & Drafting', 'Testing & Inspection', 'Other',
]

const SPECIALTY_TAGS = [
  'CAD / BIM', 'FEA Analysis', 'HVAC Design', 'PLC Programming',
  'Structural Steel', 'Concrete Design', 'Seismic Engineering', 'Green Building',
  'ISO 9001', 'ASME Certified', 'PE Licensed', 'Six Sigma',
  'Lean Manufacturing', 'Piping & Pipelines', 'Electrical Systems', 'Fire Protection',
]

const COMPANY_SIZES = ['1 (Solo)', '2–10', '11–50', '51–200', '201–500', '500+']

const PRIMARY_NEEDS = [
  'Find engineering vendors', 'Post RFQs for quotes', 'Hire project engineers',
  'Source materials & equipment', 'Manage ongoing projects', 'Other',
]

// ── Password strength ─────────────────────────────────────────────────────────
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-400' }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-amber-400' }
  if (score <= 4) return { score, label: 'Good',   color: 'bg-blue-400' }
  return { score, label: 'Strong', color: 'bg-emerald-500' }
}

// ── Reusable field wrapper ────────────────────────────────────────────────────
function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}

const inputCls     = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#003D82] focus:border-[#003D82] transition-all text-sm"
const iconInputCls = "w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#003D82] focus:border-[#003D82] transition-all text-sm"

// ── Left value-prop panel ─────────────────────────────────────────────────────
function ValuePanel({ userType }: { userType: 'client' | 'engineer' }) {
  const engineerPoints = [
    { icon: <TrendingUp className="w-5 h-5" />, text: 'Get discovered by 1,200+ active buyers' },
    { icon: <Star className="w-5 h-5" />,       text: 'Build a verified profile that wins trust' },
    { icon: <DollarSign className="w-5 h-5" />, text: 'No commissions — keep every dollar' },
    { icon: <Shield className="w-5 h-5" />,     text: 'Respond to live RFQs in your category' },
  ]
  const clientPoints = [
    { icon: <Users className="w-5 h-5" />,      text: '500+ verified engineering firms ready' },
    { icon: <Star className="w-5 h-5" />,        text: 'Post RFQs and get quotes in 24 hrs' },
    { icon: <Shield className="w-5 h-5" />,      text: 'All vendors are background-checked' },
    { icon: <TrendingUp className="w-5 h-5" />,  text: 'Token-based messaging — no spam' },
  ]
  const points = userType === 'engineer' ? engineerPoints : clientPoints

  return (
    <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] rounded-2xl p-10 relative overflow-hidden min-h-[600px]">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }}
      />
      <div className="relative z-10">
        <div className="w-12 h-12 bg-[#FF6B35] rounded-xl flex items-center justify-center mb-6">
          {userType === 'engineer' ? <Briefcase className="w-6 h-6 text-white" /> : <Building2 className="w-6 h-6 text-white" />}
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">
          {userType === 'engineer' ? 'Grow your engineering business' : 'Find the right engineering partner'}
        </h2>
        <p className="text-blue-200 text-sm mb-8">
          {userType === 'engineer'
            ? 'PPF connects you with qualified clients actively searching for your expertise.'
            : 'PPF connects you with verified engineers, vendors, and suppliers — fast.'}
        </p>
        <div className="space-y-4">
          {points.map((p, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-[#FF6B35]">
                {p.icon}
              </div>
              <p className="text-sm text-blue-100 pt-2">{p.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-xs text-blue-300">Trusted by engineering teams at</p>
          <p className="text-sm font-bold text-white mt-1">AECOM · Bechtel · Fluor · Jacobs · HDR</p>
        </div>
      </div>
    </div>
  )
}

// ── Main signup content ───────────────────────────────────────────────────────
function SignUpContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const urlType      = searchParams.get('type')

  const [step, setStep]               = useState(1)
  const [userType, setUserType]       = useState<'client' | 'engineer'>(urlType === 'client' ? 'client' : 'engineer')
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showPw, setShowPw]           = useState(false)
  const [showCPw, setShowCPw]         = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [pwValue, setPwValue]         = useState('')

  const strength = passwordStrength(pwValue)

  const accountForm  = useForm<AccountData>({ resolver: zodResolver(accountSchema), defaultValues: { userType, terms: false } })
  const engineerForm = useForm<EngineerData>({ resolver: zodResolver(engineerSchema) })
  const clientForm   = useForm<ClientData>({  resolver: zodResolver(clientSchema) })

  const watchedType = accountForm.watch('userType')
  useEffect(() => { setUserType(watchedType) }, [watchedType])

  const STEPS = ['Account', userType === 'engineer' ? 'Your Profile' : 'Your Needs', 'Done']

  // ── Step 1 ──
  const onAccountSubmit: SubmitHandler<AccountData> = (data) => {
    setAccountData(data)
    setUserType(data.userType)
    setStep(2)
  }

  // ── Step 2 engineer ──
  const onEngineerSubmit: SubmitHandler<EngineerData> = async (data) => {
    if (!accountData) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: { data: { full_name: accountData.fullName, user_type: 'engineer' } },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      await new Promise(r => setTimeout(r, 600))

      await supabase.from('profiles').update({
        full_name: accountData.fullName,
        email: accountData.email,
        user_type: 'engineer',
        company_name: data.companyName,
        bio: data.bio,
        location: data.location,
      }).eq('id', authData.user.id)

      toast.success('Welcome to PPF! 🎉')
      setStep(3)
      setTimeout(() => router.push('/dashboard/engineer'), 2500)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2 client ──
  const onClientSubmit: SubmitHandler<ClientData> = async (data) => {
    if (!accountData) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: { data: { full_name: accountData.fullName, user_type: 'client' } },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      await new Promise(r => setTimeout(r, 600))

      await supabase.from('profiles').update({
        full_name: accountData.fullName,
        email: accountData.email,
        user_type: 'client',
        company_name: data.companyName || null,
        location: data.location,
      }).eq('id', authData.user.id)

      toast.success('Welcome to PPF! 🎉')
      setStep(3)
      setTimeout(() => router.push('/dashboard/client'), 2500)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 6 ? [...prev, tag] : prev)

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Step progress */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 mb-6">
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => {
              const n    = i + 1
              const done = step > n
              const active = step === n
              return (
                <div key={n} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${done ? 'bg-emerald-500 text-white' : active ? 'bg-[#003D82] text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : n}
                  </div>
                  <span className={`ml-1.5 text-xs font-semibold hidden sm:block ${active ? 'text-[#003D82]' : done ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${step > n ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-start">
          <ValuePanel userType={userType} />

          <AnimatePresence mode="wait">

            {/* STEP 1 */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Create your account</h1>
                <p className="text-sm text-gray-500 mb-7">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[#003D82] font-semibold hover:underline">Sign in</Link>
                </p>

                {/* User type selector */}
                <div className="grid grid-cols-2 gap-3 mb-7">
                  {([
                    ['engineer', 'Vendor / Engineer', 'List services & respond to RFQs', Briefcase] as const,
                    ['client',   'Client / Buyer',     'Post RFQs & hire engineers',       Building2] as const,
                  ]).map(([val, title, desc, Icon]) => (
                    <button key={val} type="button"
                      onClick={() => { accountForm.setValue('userType', val); setUserType(val) }}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${userType === val ? 'border-[#003D82] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${userType === val ? 'bg-[#003D82] text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${userType === val ? 'text-[#003D82]' : 'text-gray-700'}`}>{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-tight">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
                  <Field label="Full Name" error={accountForm.formState.errors.fullName?.message}>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input {...accountForm.register('fullName')} className={iconInputCls} placeholder="Jane Smith" />
                    </div>
                  </Field>

                  <Field label="Email Address" error={accountForm.formState.errors.email?.message}>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input {...accountForm.register('email')} type="email" className={iconInputCls} placeholder="you@company.com" />
                    </div>
                  </Field>

                  <Field label="Password" error={accountForm.formState.errors.password?.message}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...accountForm.register('password')}
                        type={showPw ? 'text' : 'password'}
                        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#003D82] focus:border-[#003D82] transition-all"
                        placeholder="Min. 8 characters"
                        onChange={e => { accountForm.register('password').onChange(e); setPwValue(e.target.value) }}
                      />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwValue && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${strength.score >= 4 ? 'text-emerald-600' : strength.score >= 2 ? 'text-amber-500' : 'text-red-500'}`}>
                          {strength.label}
                        </span>
                      </div>
                    )}
                  </Field>

                  <Field label="Confirm Password" error={accountForm.formState.errors.confirmPassword?.message}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...accountForm.register('confirmPassword')}
                        type={showCPw ? 'text' : 'password'}
                        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#003D82] focus:border-[#003D82] transition-all"
                        placeholder="Repeat password"
                      />
                      <button type="button" onClick={() => setShowCPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>

                  <div className="flex items-start gap-3 pt-1">
                    <input {...accountForm.register('terms')} type="checkbox" id="terms"
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 text-[#003D82] focus:ring-[#003D82]" />
                    <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed">
                      I agree to the{' '}
                      <a href="/terms-of-service" target="_blank" className="text-[#003D82] font-semibold hover:underline">Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy-policy" target="_blank" className="text-[#003D82] font-semibold hover:underline">Privacy Policy</a>
                    </label>
                  </div>
                  {accountForm.formState.errors.terms && (
                    <p className="text-xs text-red-500 font-medium">{accountForm.formState.errors.terms.message}</p>
                  )}

                  <button type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl transition-all mt-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 2 — Engineer */}
            {step === 2 && accountData?.userType === 'engineer' && (
              <motion.div key="step2-eng" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Build your vendor profile</h2>
                <p className="text-sm text-gray-500 mb-7">This is what clients see when they find you — make it count.</p>

                <form onSubmit={engineerForm.handleSubmit(onEngineerSubmit)} className="space-y-5">
                  <Field label="Company or Display Name *" error={engineerForm.formState.errors.companyName?.message}>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input {...engineerForm.register('companyName')} className={iconInputCls} placeholder="Apex Structural Engineering" />
                    </div>
                  </Field>

                  <Field label="Primary Category *" error={engineerForm.formState.errors.category?.message}>
                    <select {...engineerForm.register('category')} className={inputCls}>
                      <option value="">Select your main engineering discipline…</option>
                      {ENGINEERING_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>

                  <Field label="Location *" error={engineerForm.formState.errors.location?.message} hint="City, State — e.g. Dallas, TX">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input {...engineerForm.register('location')} className={iconInputCls} placeholder="Dallas, TX" />
                    </div>
                  </Field>

                  <Field label="Bio / About *" error={engineerForm.formState.errors.bio?.message} hint="What makes you the right choice? Clients read this first.">
                    <textarea {...engineerForm.register('bio')} rows={4} className={inputCls}
                      placeholder="We are a licensed structural engineering firm specializing in commercial and industrial projects. 10+ years of experience, PE licensed in 5 states…" />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone (optional)" error={engineerForm.formState.errors.phone?.message}>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input {...engineerForm.register('phone')} type="tel" className={iconInputCls} placeholder="(555) 000-0000" />
                      </div>
                    </Field>
                    <Field label="Hourly Rate (optional)">
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input {...engineerForm.register('hourlyRate')} className={iconInputCls} placeholder="150 / hr" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Website (optional)" error={engineerForm.formState.errors.website?.message}>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input {...engineerForm.register('website')} type="url" className={iconInputCls} placeholder="https://yourfirm.com" />
                    </div>
                  </Field>

                  {/* Specialty tags */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Specialty Tags <span className="text-gray-400 font-normal">(pick up to 6)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALTY_TAGS.map(tag => (
                        <button key={tag} type="button" onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedTags.includes(tag) ? 'bg-[#003D82] text-white border-[#003D82]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-gray-300 transition-all text-sm">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button type="submit" disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-60 text-white font-bold rounded-xl transition-all text-sm">
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Profile…</> : <>Complete Setup <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 2 — Client */}
            {step === 2 && accountData?.userType === 'client' && (
              <motion.div key="step2-cli" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Tell us about your needs</h2>
                <p className="text-sm text-gray-500 mb-7">We'll personalise your marketplace experience.</p>

                <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-5">
                  <Field label="Company Name (optional)">
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input {...clientForm.register('companyName')} className={iconInputCls} placeholder="ACME Construction Inc." />
                    </div>
                  </Field>

                  <Field label="Company Size *" error={clientForm.formState.errors.companySize?.message}>
                    <select {...clientForm.register('companySize')} className={inputCls}>
                      <option value="">Select company size…</option>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                    </select>
                  </Field>

                  <Field label="Location *" error={clientForm.formState.errors.location?.message} hint="City, State — e.g. Houston, TX">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input {...clientForm.register('location')} className={iconInputCls} placeholder="Houston, TX" />
                    </div>
                  </Field>

                  <Field label="What brings you to PPF? *" error={clientForm.formState.errors.primaryNeed?.message}>
                    <select {...clientForm.register('primaryNeed')} className={inputCls}>
                      <option value="">Select your primary need…</option>
                      {PRIMARY_NEEDS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-gray-300 transition-all text-sm">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button type="submit" disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#003D82] hover:bg-[#002960] disabled:opacity-60 text-white font-bold rounded-xl transition-all text-sm">
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account…</> : <>Get Started <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3 — Success */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Welcome to PPF! 🎉</h2>
                <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
                  {accountData?.userType === 'engineer'
                    ? 'Your vendor profile is live. Head to your dashboard to add services and start responding to RFQs.'
                    : 'Your account is ready. Browse verified engineers or post your first RFQ to get quotes fast.'}
                </p>
                <div className="bg-[#F8FAFC] rounded-xl p-5 text-left mb-6">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Suggested next steps</p>
                  <ul className="space-y-2.5">
                    {(accountData?.userType === 'engineer' ? [
                      ['Upload a profile photo', '/settings'],
                      ['Add your first service listing', '/dashboard/engineer'],
                      ['Browse open RFQs', '/dashboard/engineer'],
                    ] : [
                      ['Browse the marketplace', '/marketplace'],
                      ['Post your first RFQ', '/rfq/create'],
                      ['Explore engineer profiles', '/profiles'],
                    ]).map(([label, href]) => (
                      <li key={label}>
                        <Link href={href} className="flex items-center gap-2 text-sm text-[#003D82] font-semibold hover:underline">
                          <ChevronRight className="w-3.5 h-3.5" /> {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-gray-400">Redirecting to your dashboard…</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}
