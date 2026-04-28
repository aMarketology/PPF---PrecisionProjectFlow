'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  User,
  Lock,
  Bell,
  Shield,
  Save,
  Loader2,
  Camera,
  MapPin,
  Building2,
  FileText,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  Settings,
} from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  email: string
  company_name: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  user_type: string
  token_balance: number
  created_at: string
}

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'security',      label: 'Security',      icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy',       label: 'Privacy',       icon: Shield },
] as const
type TabId = typeof TABS[number]['id']

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<TabId>('profile')

  // Profile form state
  const [fullName, setFullName]         = useState('')
  const [companyName, setCompanyName]   = useState('')
  const [bio, setBio]                   = useState('')
  const [location, setLocation]         = useState('')
  const [avatarUrl, setAvatarUrl]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Security form state
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [savingPw, setSavingPw]     = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !data) { router.push('/login'); return }

    setProfile(data)
    setFullName(data.full_name ?? '')
    setCompanyName(data.company_name ?? '')
    setBio(data.bio ?? '')
    setLocation(data.location ?? '')
    setAvatarUrl(data.avatar_url ?? '')
    setLoading(false)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        company_name: companyName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile updated!')
      setProfile(prev => prev ? { ...prev, full_name: fullName, company_name: companyName, bio, location, avatar_url: avatarUrl } : prev)
    }
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }

    setUploadingAvatar(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(publicUrl)
    setUploadingAvatar(false)
    toast.success('Avatar uploaded — click Save to apply')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    if (newPw.length < 8)    { toast.error('Password must be at least 8 characters'); return }

    setSavingPw(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated!')
      setNewPw(''); setConfirmPw('')
    }
    setSavingPw(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-jakarta flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
      </div>
    )
  }

  const displayName = profile?.company_name || profile?.full_name || 'User'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] pt-28 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.4) 39px,rgba(255,255,255,.4) 40px)' }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 flex items-center gap-6">
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <span className="text-white text-3xl font-extrabold">{initial}</span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-blue-200" />
              <span className="text-blue-200 text-sm font-semibold uppercase tracking-wide">Account Settings</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">{displayName}</h1>
            <p className="text-blue-200 text-sm mt-0.5 capitalize">{profile?.user_type} · {profile?.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 pb-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sticky top-24">
              {TABS.map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all mb-1 last:mb-0 ${
                      active
                        ? 'bg-[#003D82] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#003D82]'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"
              >

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>

                    {/* Avatar upload */}
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar"
                            className="w-20 h-20 rounded-2xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-[#003D82]/10 border border-[#003D82]/20 flex items-center justify-center">
                            <span className="text-[#003D82] text-2xl font-extrabold">{initial}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#003D82] rounded-full flex items-center justify-center shadow-md hover:bg-[#002960] transition"
                        >
                          {uploadingAvatar
                            ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                            : <Camera className="w-3.5 h-3.5 text-white" />
                          }
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 text-sm">Profile Photo</p>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP · max 2 MB</p>
                        {avatarUrl && (
                          <button type="button" onClick={() => setAvatarUrl('')}
                            className="text-xs text-red-500 hover:underline mt-1">Remove photo</button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          <User className="inline w-3.5 h-3.5 mr-1 text-gray-400" />Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] transition"
                          placeholder="Your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          <Building2 className="inline w-3.5 h-3.5 mr-1 text-gray-400" />Company Name
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] transition"
                          placeholder="Your company (optional)"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          <MapPin className="inline w-3.5 h-3.5 mr-1 text-gray-400" />Location
                        </label>
                        <input
                          type="text"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] transition"
                          placeholder="e.g. Los Angeles, CA"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          <FileText className="inline w-3.5 h-3.5 mr-1 text-gray-400" />Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={e => setBio(e.target.value)}
                          rows={4}
                          maxLength={500}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] transition resize-none"
                          placeholder="Tell clients about your expertise and services…"
                        />
                        <p className="text-xs text-gray-400 text-right mt-1">{bio.length}/500</p>
                      </div>
                    </div>

                    {/* Read-only info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
                        <p className="text-sm text-gray-700">{profile?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Account Type</p>
                        <p className="text-sm text-gray-700 capitalize">{profile?.user_type}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Token Balance</p>
                        <p className="text-sm text-gray-700">🪙 {profile?.token_balance ?? 0} tokens</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Member Since</p>
                        <p className="text-sm text-gray-700">
                          {profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving…' : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                )}

                {/* SECURITY TAB */}
                {activeTab === 'security' && (
                  <div className="space-y-8">
                    <h2 className="text-xl font-bold text-gray-900">Security</h2>

                    <form onSubmit={handleChangePassword} className="space-y-5">
                      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Change Password</h3>

                      {([
                        { label: 'New Password',     value: newPw,     setter: setNewPw },
                        { label: 'Confirm Password', value: confirmPw, setter: setConfirmPw },
                      ] as { label: string; value: string; setter: (v: string) => void }[]).map(({ label, value, setter }) => (
                        <div key={label}>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                          <div className="relative">
                            <input
                              type={showPw ? 'text' : 'password'}
                              value={value}
                              onChange={e => setter(e.target.value)}
                              required
                              minLength={8}
                              className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] transition"
                              placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPw(s => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={savingPw}
                          className="flex items-center gap-2 px-6 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
                        >
                          {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                          {savingPw ? 'Updating…' : 'Update Password'}
                        </button>
                      </div>
                    </form>

                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">Active Session</h3>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Current Session</p>
                          <p className="text-xs text-gray-500 mt-0.5">Active now</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Active</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="font-semibold text-red-500 text-sm uppercase tracking-wide mb-4">Danger Zone</h3>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure? This cannot be undone.')) {
                            toast.error('Account deletion — contact support')
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-semibold rounded-xl text-sm transition"
                      >
                        <Trash2 className="w-4 h-4" />Delete Account
                      </button>
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
                    <p className="text-sm text-gray-500">Email notification settings (persistence coming soon).</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Order Updates',    desc: 'Status changes on your orders' },
                        { label: 'New Messages',     desc: 'Alerts for incoming messages' },
                        { label: 'Marketing Emails', desc: 'Promotions and product news' },
                        { label: 'Weekly Digest',    desc: 'Summary of your activity' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                            <p className="text-xs text-gray-500">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#003D82] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRIVACY TAB */}
                {activeTab === 'privacy' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Privacy</h2>
                    <div className="space-y-3">
                      {[
                        { label: 'Public Profile', desc: 'Make your profile visible to everyone' },
                        { label: 'Show Email',     desc: 'Display email on your public profile' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                            <p className="text-xs text-gray-500">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#003D82] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      {[
                        { label: 'Privacy Policy',   href: '/privacy-policy' },
                        { label: 'Terms of Service', href: '/terms-of-service' },
                      ].map(link => (
                        <a key={link.label} href={link.href}
                          className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition">
                          {link.label}
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
