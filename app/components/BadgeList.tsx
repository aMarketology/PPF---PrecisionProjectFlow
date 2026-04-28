'use client'

import { BadgeDef } from '@/lib/badges'

interface BadgeListProps {
  badges: BadgeDef[]
  size?: 'sm' | 'md'
  className?: string
  /** Show empty state if no badges. Default false (renders nothing). */
  showEmpty?: boolean
}

/** Renders a horizontal row of badge pills with native tooltips on hover. */
export default function BadgeList({ badges, size = 'md', className = '', showEmpty = false }: BadgeListProps) {
  if (badges.length === 0) {
    if (!showEmpty) return null
    return (
      <p className={`text-xs text-gray-400 italic ${className}`}>
        No badges yet — list a service or complete an order to earn your first.
      </p>
    )
  }

  const pillCls = size === 'sm'
    ? 'px-2 py-0.5 text-[11px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5'

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map(b => (
        <span
          key={b.id}
          title={b.description}
          className={`inline-flex items-center rounded-full font-semibold border ${pillCls} ${b.cls}`}
        >
          <span aria-hidden>{b.emoji}</span>
          {b.label}
        </span>
      ))}
    </div>
  )
}
