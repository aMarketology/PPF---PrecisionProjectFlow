'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Wrench, Loader2, ExternalLink, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, type AdminContext } from '@/lib/admin/context'

interface Product { id: string; name: string; price: number | null; category: string | null; is_active: boolean | null; company_id: string }
interface Service { id: string; title: string; price: number | null; category: string | null; active: boolean | null }

export default function MyListingsPage() {
  const [ctx, setCtx] = useState<AdminContext | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'products' | 'services'>('products')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const context = await loadAdminContext(supabase)
      setCtx(context)
      if (!context) { setLoading(false); return }

      const companyIds = context.companies.map(c => c.id)
      const [prodRes, svcRes] = await Promise.all([
        companyIds.length
          ? supabase.from('products').select('id, name, price, category, is_active, company_id').in('company_id', companyIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] } as any),
        supabase.from('services').select('id, title, price, category, active').eq('provider_id', context.userId).order('created_at', { ascending: false }),
      ])
      setProducts(prodRes.data ?? [])
      setServices(svcRes.data ?? [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
  if (!ctx) return null

  const rows = tab === 'products' ? products : services

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Listings</h1>
          <p className="text-sm text-gray-500 mt-1">Products and services you have listed on the marketplace.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/products/create"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#003D82] hover:bg-[#002960] text-white font-semibold rounded-xl text-sm transition-all">
            <Plus className="w-4 h-4" /> Product
          </Link>
          <Link href="/services/create"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 border-2 border-[#003D82] text-[#003D82] hover:bg-[#003D82] hover:text-white font-semibold rounded-xl text-sm transition-all">
            <Plus className="w-4 h-4" /> Service
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('products')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'products' ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#003D82]/40 hover:text-[#003D82]'}`}>
          <Package className="w-4 h-4" /> Products ({products.length})
        </button>
        <button onClick={() => setTab('services')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'services' ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#003D82]/40 hover:text-[#003D82]'}`}>
          <Wrench className="w-4 h-4" /> Services ({services.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            {tab === 'products' ? <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" /> : <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />}
            <p className="text-sm text-gray-500 font-medium">No {tab} listed yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-bold text-gray-700">Name</th>
                <th className="text-left px-5 py-3.5 font-bold text-gray-700 hidden md:table-cell">Category</th>
                <th className="text-left px-5 py-3.5 font-bold text-gray-700">Price</th>
                <th className="text-left px-5 py-3.5 font-bold text-gray-700">Status</th>
                <th className="text-right px-5 py-3.5 font-bold text-gray-700">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tab === 'products'
                ? products.map(p => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 max-w-[240px] truncate">{p.name}</td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{p.category || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 font-medium">{p.price != null ? `$${Number(p.price).toLocaleString()}` : '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/products/${p.id}`} className="inline-flex text-[#003D82] hover:text-[#002960]"><ExternalLink className="w-4 h-4" /></Link>
                    </td>
                  </tr>
                ))
                : services.map(s => (
                  <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 max-w-[240px] truncate">{s.title}</td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{s.category || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 font-medium">{s.price != null ? `$${Number(s.price).toLocaleString()}` : '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/marketplace/service/${s.id}`} className="inline-flex text-[#003D82] hover:text-[#002960]"><ExternalLink className="w-4 h-4" /></Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
