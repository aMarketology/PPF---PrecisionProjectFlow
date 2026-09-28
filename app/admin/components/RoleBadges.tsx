'use client'

import { useState, useRef, useEffect } from 'react'
import type { AdminBadge, BadgeTone } from '@/lib/admin/context'

const TONE_CLASSES: Record<BadgeTone, string> = {
  navy: 'bg-[#003D82]/10 text-[#003D82] border-[#003D82]/20',
  orange: 'bg-[#FF6B35]/10 text-[#E55A2B] border-[#FF6B35]/25',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
}

/** Light-background badge (used on white cards). */
export function RoleBadge({ badge }: { badge: AdminBadge }) {
  return (
    <span
      title={badge.hint}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${TONE_CLASSES[badge.tone]}`}
    >
      {badge.label}
    </span>
  )
}

/** Dark-background badge (used on the gradient header). */
export function RoleBadgeOnDark({ badge }: { badge: AdminBadge }) {
  return (
    <span
      title={badge.hint}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 text-white/90 whitespace-nowrap"
    >
      {badge.label}
    </span>
  )
}

/**
 * Renders a badge list, collapsing overflow into a clickable "+N" chip.
 * Clicking "+N" opens a popover listing every remaining badge.
 */
export function RoleBadgeList({
  badges,
  variant = 'light',
  max = 3,
  className = '',
}: {
  badges: AdminBadge[]
  variant?: 'light' | 'dark'
  max?: number
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!badges.length) return null

  const shown = badges.slice(0, max)
  const hidden = badges.slice(max)
  const Chip = variant === 'dark' ? RoleBadgeOnDark : RoleBadge

  return (
    <div ref={wrapRef} className={`relative flex flex-wrap items-center gap-1.5 ${className}`}>
      {shown.map(b => <Chip key={b.key} badge={b} />)}

      {hidden.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={`Show ${hidden.length} more badge${hidden.length !== 1 ? 's' : ''}`}
            className={
              variant === 'dark'
                ? `inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    open
                      ? 'bg-white/25 border-white/40 text-white'
                      : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white'
                  }`
                : `inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    open
                      ? 'bg-[#003D82] border-[#003D82] text-white'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-[#003D82]/10 hover:text-[#003D82] hover:border-[#003D82]/20'
                  }`
            }
          >
            +{hidden.length}
          </button>

          {open && (
            <div
              role="dialog"
              className="absolute left-0 top-full mt-2 z-50 w-64 bg-white rounded-2xl border border-gray-100 shadow-xl p-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 pb-2">
                All Roles &amp; Permissions
              </p>
              <div className="flex flex-col gap-1.5">
                {badges.map(b => (
                  <div key={b.key} className="flex items-start gap-2 px-1 py-1">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${TONE_CLASSES[b.tone]}`}>
                      {b.label}
                    </span>
                    {b.hint && <span className="text-[11px] text-gray-500 leading-snug pt-0.5">{b.hint}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
