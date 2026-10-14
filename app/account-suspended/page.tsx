'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, LogOut, HelpCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Navigation from '@/app/components/Navigation'
import Footer from '@/app/components/Footer'

export default function AccountSuspendedPage() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    // Use the browser client so sign-out works even when the middleware
    // is redirecting this account away from the rest of the app.
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      <Navigation />
      <div className="max-w-lg mx-auto px-4 pt-32 pb-24">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Account suspended</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            Your account has been suspended or deactivated by our team. You won't
            be able to sign in or use the marketplace while this suspension is active.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#003D82] hover:bg-[#002960] disabled:opacity-50 text-white font-bold rounded-xl transition-all"
            >
              {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Sign out
            </button>
            <a
              href="mailto:support@precisionprojectflow.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-bold rounded-xl transition-all"
            >
              <HelpCircle className="w-4 h-4" /> Contact support
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}