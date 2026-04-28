// ─────────────────────────────────────────────────────────────────────────────
// Badge system — v1 (computed client-side from existing data)
// Future: persist earned badges in a `user_badges` table for streaks/leaderboards
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeId =
  | 'new_member'
  | 'verified_email'
  | 'profile_complete'
  | 'first_listing'
  | 'multi_service_pro'
  | 'top_lister'
  | 'first_sale'
  | 'repeat_seller'
  | 'stripe_connected'
  | 'first_order'
  | 'frequent_buyer'
  | 'rfq_pioneer'
  | 'admin'

export interface BadgeDef {
  id: BadgeId
  label: string
  emoji: string
  description: string
  /** tailwind classes for the badge pill */
  cls: string
}

export const BADGES: Record<BadgeId, BadgeDef> = {
  new_member:        { id: 'new_member',        label: 'New Member',         emoji: '🌱', description: 'Joined PPF in the last 30 days',                       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  verified_email:    { id: 'verified_email',    label: 'Verified',           emoji: '✓',  description: 'Email address has been verified',                      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  profile_complete:  { id: 'profile_complete',  label: 'Profile Complete',   emoji: '⭐', description: 'Avatar, bio, and location are all filled in',         cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  first_listing:     { id: 'first_listing',     label: 'First Listing',      emoji: '🚀', description: 'Posted your first service on the marketplace',        cls: 'bg-orange-50 text-[#FF6B35] border-orange-200' },
  multi_service_pro: { id: 'multi_service_pro', label: 'Multi-Service Pro',  emoji: '🛠️', description: 'Listed 3 or more services',                           cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  top_lister:        { id: 'top_lister',        label: 'Top Lister',         emoji: '🏆', description: 'Listed 10 or more services — power user',             cls: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  first_sale:        { id: 'first_sale',        label: 'First Sale',         emoji: '💰', description: 'Completed your first paid order',                     cls: 'bg-green-50 text-green-700 border-green-200' },
  repeat_seller:     { id: 'repeat_seller',     label: 'Repeat Seller',      emoji: '🔥', description: 'Completed 5 or more orders',                          cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  stripe_connected:  { id: 'stripe_connected',  label: 'Payouts Ready',      emoji: '💳', description: 'Stripe Connect account is set up — ready to be paid', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  first_order:       { id: 'first_order',       label: 'First Order',        emoji: '🎉', description: 'Placed your first order on PPF',                      cls: 'bg-orange-50 text-[#FF6B35] border-orange-200' },
  frequent_buyer:    { id: 'frequent_buyer',    label: 'Frequent Buyer',     emoji: '🛒', description: 'Placed 3 or more orders',                             cls: 'bg-pink-50 text-pink-700 border-pink-200' },
  rfq_pioneer:       { id: 'rfq_pioneer',       label: 'RFQ Pioneer',        emoji: '📋', description: 'Posted at least one RFQ to the marketplace',         cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  admin:             { id: 'admin',             label: 'PPF Team',           emoji: '🛡️', description: 'Official Precision Project Flow team member',         cls: 'bg-[#003D82] text-white border-[#002960]' },
}

export interface BadgeContext {
  profile: {
    created_at?: string | null
    avatar_url?: string | null
    bio?: string | null
    location?: string | null
    is_admin?: boolean | null
    user_type?: string | null
  } | null
  emailVerified?: boolean
  serviceCount?: number
  completedOrderCount?: number
  placedOrderCount?: number
  rfqCount?: number
  stripeConnected?: boolean
}

/** Computes which badges the user has earned from the available data. */
export function computeBadges(ctx: BadgeContext): BadgeDef[] {
  const earned: BadgeId[] = []
  const p = ctx.profile

  if (p?.is_admin) earned.push('admin')

  if (p?.created_at) {
    const ageMs = Date.now() - new Date(p.created_at).getTime()
    if (ageMs < 30 * 24 * 60 * 60 * 1000) earned.push('new_member')
  }

  if (ctx.emailVerified) earned.push('verified_email')

  if (p?.avatar_url && p?.bio && p?.location) earned.push('profile_complete')

  // Engineer badges
  if (p?.user_type === 'engineer') {
    const sc = ctx.serviceCount ?? 0
    if (sc >= 1) earned.push('first_listing')
    if (sc >= 3) earned.push('multi_service_pro')
    if (sc >= 10) earned.push('top_lister')

    const co = ctx.completedOrderCount ?? 0
    if (co >= 1) earned.push('first_sale')
    if (co >= 5) earned.push('repeat_seller')

    if (ctx.stripeConnected) earned.push('stripe_connected')
  }

  // Client badges
  if (p?.user_type === 'client') {
    const po = ctx.placedOrderCount ?? 0
    if (po >= 1) earned.push('first_order')
    if (po >= 3) earned.push('frequent_buyer')

    if ((ctx.rfqCount ?? 0) >= 1) earned.push('rfq_pioneer')
  }

  return earned.map(id => BADGES[id])
}
