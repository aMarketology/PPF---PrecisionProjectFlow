'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

export type ReportTargetType = 'user' | 'service' | 'product' | 'rfq' | 'company' | 'message'

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'quality', label: 'Poor quality' },
  { value: 'abuse', label: 'Abusive or offensive' },
  { value: 'other', label: 'Something else' },
]

/**
 * ReportModal - lets a signed-in user flag content. Submissions land in
 * `content_reports` and surface in the /admin/reports moderation queue.
 */
export default function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: {
  open: boolean
  onClose: () => void
  targetType: ReportTargetType
  targetId?: string | null
  targetLabel?: string
}) {
  const [reason, setReason] = useState('spam')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, description }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Could not submit report'); return }
      setDone(true)
      toast.success('Report submitted. Our team will review it.')
      setTimeout(() => { onClose(); setDone(false); setDescription(''); setReason('spam') }, 1400)
    } catch (err: any) {
      toast.error(err.message || 'Could not submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-jakarta"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Report content</h2>
                  {targetLabel && <p className="text-xs text-gray-400 truncate max-w-[220px]">{targetLabel}</p>}
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {done ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-800">Thanks for the report</p>
                <p className="text-sm text-gray-500 mt-1">Our moderation team will take a look.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Why are you reporting this?</label>
                  <div className="space-y-1.5">
                    {REASONS.map(r => (
                      <label key={r.value}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                          reason === r.value ? 'border-[#003D82] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                          onChange={() => setReason(r.value)} className="accent-[#003D82]" />
                        <span className="text-sm text-gray-700">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Details <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    rows={3} maxLength={1000} placeholder="Add any context that will help us review this..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#003D82]/30 focus:border-[#003D82] outline-none resize-none" />
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#003D82] hover:bg-[#002960] text-white font-bold rounded-xl disabled:opacity-50 transition-all text-sm">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit report'}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
