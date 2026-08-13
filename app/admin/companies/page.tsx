'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Company {
  id: string; company_name: string; city: string; state: string
  industry: string | null; verified: boolean; is_claimed: boolean
  created_at: string
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClaimed, setFilterClaimed] = useState<'all' | 'claimed' | 'unclaimed'>('all')

  useEffect(() => { loadCompanies() }, [])

  const loadCompanies = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?action=data&tab=companies')
      const json = await res.json()
      setCompanies(json.data || [])
    } catch { }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this company permanently?')) return
    try {
      const res = await fetch(`/api/admin?action=delete&tab=companies&id=${id}`, { method: 'POST' })
      if (!res.ok) { toast.error('Delete failed'); return }
      toast.success('Deleted')
      setCompanies(prev => prev.filter(c => c.id !== id))
    } catch { toast.error('Failed') }
  }

  const filtered = companies.filter(c => {
    if (filterClaimed === 'claimed' && !c.is_claimed) return false
    if (filterClaimed === 'unclaimed' && c.is_claimed) return false
    if (!search) return true
    const q = search.toLowerCase()
    return c.company_name?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.state?.toLowerCase().includes(q)
  })

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#003D82]" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Management</h1>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search companies..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003D82]/30" />
        </div>
        <select value={filterClaimed} onChange={e => setFilterClaimed(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="all">All Companies</option>
          <option value="claimed">Claimed</option>
          <option value="unclaimed">Unclaimed</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} companies</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Industry</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No companies found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{c.company_name}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{c.industry || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {c.verified && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Verified</span>}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${c.is_claimed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_claimed ? 'Claimed' : 'Unclaimed'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}