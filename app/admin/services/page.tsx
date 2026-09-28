'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Loader2, Trash2, Eye, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Wrench, ExternalLink, MessageSquare } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Service {
  id: string
  title: string
  description: string | null
  price: number
  category: string | null
  delivery_time: string | null
  service_area: string | null
  certifications: string[] | null
  active: boolean
  provider_id: string
  created_at: string
  provider: { id: string; full_name: string | null; location: string | null } | null
}

type SortKey = 'title' | 'price' | 'category' | 'active'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { loadServices() }, [page])

  const loadServices = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?action=data&tab=services&page=${page}&pageSize=${PAGE_SIZE}`)
      const json = await res.json()
      setServices(json.data || [])
      setTotal(json.total || 0)
      setTotalPages(json.totalPages || 1)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = services.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) || s.provider?.full_name?.toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any, bVal: any
    switch (sortKey) {
      case 'title': aVal = a.title?.toLowerCase() ?? ''; bVal = b.title?.toLowerCase() ?? ''; break
      case 'price': aVal = Number(a.price); bVal = Number(b.price); break
      case 'category': aVal = a.category?.toLowerCase() ?? ''; bVal = b.category?.toLowerCase() ?? ''; break
      case 'active': aVal = a.active ? 1 : 0; bVal = b.active ? 1 : 0; break
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const handleToggle = async (service: Service) => {
    try {
      const res = await fetch(`/api/admin?action=toggle&tab=services&id=${service.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !service.active }),
      })
      if (!res.ok) { const j = await res.json(); toast.error(j.error || 'Toggle failed'); return }
      toast.success(service.active ? 'Service deactivated' : 'Service activated')
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, active: !s.active } : s))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service permanently?')) return
    try {
      const res = await fetch(`/api/admin?action=delete&tab=services&id=${id}`, { method: 'POST' })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Deleted')
      setServices(prev => prev.filter(s => s.id !== id))
      setTotal(t => Math.max(0, t - 1))
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
          <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review and moderate all marketplace service listings.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search services..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30" />
        </div>
        <span className="text-sm text-gray-500 ml-auto">{total.toLocaleString()} services</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <SortHeader label="Service" k="title" />
                <SortHeader label="Category" k="category" />
                <th className="text-left px-4 py-3 font-semibold">Provider</th>
                <SortHeader label="Price" k="price" />
                <SortHeader label="Status" k="active" />
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No services found</td></tr>
              ) : sorted.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-[#003D82] flex-shrink-0">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 max-w-[260px] truncate">{s.title}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[260px]">{s.delivery_time || 'No delivery time set'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.category || '-'}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 font-medium">{s.provider?.full_name || 'Unknown'}</p>
                    {s.provider?.location && <p className="text-xs text-gray-400">{s.provider.location}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">${Number(s.price).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/marketplace/service/${s.id}`} title="View service page"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#003D82]">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {s.provider?.id && (
                        <Link href={`/messages?with=${s.provider.id}`} title={`Message ${s.provider.full_name || 'provider'}`}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#003D82]">
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                      )}
                      <button onClick={() => handleToggle(s)} title={s.active ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg ${s.active ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
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

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Showing {total === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
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
