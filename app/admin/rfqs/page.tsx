'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, FileText, Loader2, MessageSquare, Search } from 'lucide-react'

interface RFQ {
  id: string
  client_id: string
  slug?: string | null
  title: string
  category: string | null
  budget: string | null
  location: string | null
  status: string
  created_at: string
  client?: { full_name?: string | null; email?: string | null }
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_review: 'bg-amber-100 text-amber-700 border-amber-200',
  awarded: 'bg-blue-100 text-blue-700 border-blue-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function AdminRFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    async function loadRFQs() {
      try {
        const response = await fetch('/api/admin?action=data&tab=rfqs')
        const json = await response.json()
        setRfqs(json.data || [])
      } catch (error) {
        console.error('Failed to load RFQs:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRFQs()
  }, [])

  const filteredRFQs = rfqs.filter((rfq) => {
    if (statusFilter !== 'all' && rfq.status !== statusFilter) return false
    if (!search) return true
    const query = search.toLowerCase()
    return [rfq.title, rfq.category, rfq.location, rfq.client?.full_name, rfq.client?.email]
      .some((value) => value?.toLowerCase().includes(query))
  })

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#003D82]" /></div>
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#003D82]">Marketplace management</p>
          <h1 className="text-2xl font-bold text-gray-900">Posted RFQs</h1>
          <p className="mt-1 text-sm text-gray-500">Review every request for quote posted across Precision Project Flow.</p>
        </div>
        <Link href="/rfq/create" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E55A2B]">
          <FileText className="h-4 w-4" /> Post RFQ
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total RFQs', value: rfqs.length, color: 'text-gray-900' },
          { label: 'Open', value: rfqs.filter((rfq) => rfq.status === 'open').length, color: 'text-emerald-600' },
          { label: 'In Review', value: rfqs.filter((rfq) => rfq.status === 'in_review').length, color: 'text-amber-600' },
          { label: 'Awarded', value: rfqs.filter((rfq) => rfq.status === 'awarded').length, color: 'text-[#003D82]' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search RFQs or requestors..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#003D82]/30" />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#003D82]/30">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_review">In review</option>
          <option value="awarded">Awarded</option>
          <option value="closed">Closed</option>
        </select>
        <span className="text-sm text-gray-500 sm:ml-auto">{filteredRFQs.length} RFQs</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">RFQ</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Requestor</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Budget</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Posted</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRFQs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No RFQs match the current filters.</td></tr>
            ) : filteredRFQs.map((rfq) => (
              <tr key={rfq.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><p className="max-w-[280px] truncate font-semibold text-gray-900">{rfq.title}</p><p className="mt-0.5 text-xs text-gray-500">{rfq.category || 'Uncategorized'}{rfq.location ? ` · ${rfq.location}` : ''}</p></td>
                <td className="px-4 py-3 text-gray-700"><p>{rfq.client?.full_name || 'Unknown'}</p><p className="text-xs text-gray-400">{rfq.client?.email || ''}</p></td>
                <td className="px-4 py-3 font-medium text-gray-700">{rfq.budget || 'Not provided'}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[rfq.status] || STATUS_STYLES.closed}`}>{rfq.status.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">{formatDate(rfq.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/messages?with=${rfq.client_id}`} className="inline-flex rounded-md p-2 text-[#003D82] hover:bg-blue-50" title="Message requestor" aria-label={`Message ${rfq.client?.full_name || 'requestor'}`}>
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                    <Link href={`/rfq/${rfq.slug || rfq.id}`} className="inline-flex rounded-md p-2 text-[#003D82] hover:bg-blue-50" title="View public RFQ" aria-label={`View ${rfq.title}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
