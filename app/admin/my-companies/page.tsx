'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Loader2, MapPin, ExternalLink, Users, Shield, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, type AdminContext } from '@/lib/admin/context'

export default function MyCompaniesPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      setCtx(await loadAdminContext(supabase))
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
  if (!ctx) return null

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">My Companies</h1>
        <p className="text-sm text-gray-500 mt-1">Companies you belong to and the role you hold in each.</p>
      </div>

      {ctx.companies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-700 mb-1">You are not part of a company yet</p>
          <p className="text-sm text-gray-400 mb-5">Create a company profile or ask an owner to invite you.</p>
          <Link href="/companies/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition-all">
            <Building2 className="w-4 h-4" /> Create a Company
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ctx.companies.map(c => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col hover:shadow-md hover:border-[#003D82]/30 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#003D82]/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-7 h-7 text-[#003D82]" />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-gray-900 truncate">{c.company_name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {[c.city, c.state].filter(Boolean).join(', ') || c.industry || '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">
                  {c.role === 'owner' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {c.role}
                </span>
                {c.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
                {!c.is_claimed && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Unclaimed</span>
                )}
              </div>

              <div className="mt-auto flex gap-2 pt-4 border-t border-gray-100">
                <Link href={`/companies/${c.slug || c.id}`}
                  className="flex-1 text-center text-xs font-semibold bg-[#003D82] hover:bg-[#002960] text-white rounded-xl py-2.5 transition-all flex items-center justify-center gap-1">
                  View Page <ExternalLink className="w-3 h-3" />
                </Link>
                {(c.role === 'owner' || c.role === 'admin') && (
                  <Link href={`/dashboard/company/${c.id}`}
                    className="flex-1 text-center text-xs font-semibold border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white rounded-xl py-2.5 transition-all">
                    Manage Team
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
