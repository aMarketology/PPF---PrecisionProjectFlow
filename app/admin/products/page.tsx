'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Trash2, Eye, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  category: string | null
  delivery_time_days: number | null
  is_active: boolean
  image_url: string | null
  company_id: string
  created_at: string
}

type SortKey = 'name' | 'price' | 'category' | 'is_active'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { loadProducts() }, [page])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?action=data&tab=products&page=${page}&pageSize=${PAGE_SIZE}`)
      const json = await res.json()
      setProducts(json.data || [])
      setTotal(json.total || 0)
      setTotalPages(json.totalPages || 1)
    } catch { }
    finally { setLoading(false) }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = products.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any, bVal: any
    switch (sortKey) {
      case 'name': aVal = a.name?.toLowerCase() ?? ''; bVal = b.name?.toLowerCase() ?? ''; break
      case 'price': aVal = Number(a.price); bVal = Number(b.price); break
      case 'category': aVal = a.category?.toLowerCase() ?? ''; bVal = b.category?.toLowerCase() ?? ''; break
      case 'is_active': aVal = a.is_active ? 1 : 0; bVal = b.is_active ? 1 : 0; break
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const handleToggle = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin?action=toggle&tab=products&id=${product.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.is_active }),
      })
      if (!res.ok) { const j = await res.json(); toast.error(j.error || 'Toggle failed'); return }
      toast.success(product.is_active ? 'Product deactivated' : 'Product activated')
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product permanently?')) return
    try {
      const res = await fetch(`/api/admin?action=delete&tab=products&id=${id}`, { method: 'POST' })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Deleted')
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch { toast.error('Failed') }
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-[#003D82]" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
      </span>
    </th>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review and moderate all marketplace products.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30" />
        </div>
        <span className="text-sm text-gray-500 ml-auto">{total.toLocaleString()} products</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <SortHeader label="Product" k="name" />
                <SortHeader label="Category" k="category" />
                <SortHeader label="Price" k="price" />
                <SortHeader label="Status" k="is_active" />
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No products found</td></tr>
              ) : sorted.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">P</div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 max-w-[250px] truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.currency?.toUpperCase() || 'USD'}{p.delivery_time_days ? ` · ${p.delivery_time_days} days` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">${Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggle(p)} title={p.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg ${p.is_active ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-gray-600 font-medium">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
