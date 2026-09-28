import {
  FileText, TrendingUp, Award, ShoppingCart, CheckCircle2,
  Building2, UserPlus, Bell, MessageCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NotificationTypeStyle {
  icon: LucideIcon
  /** Tailwind classes for the icon chip background + text color */
  chip: string
  label: string
}

/**
 * Visual mapping for every notification type. Mirrors the activity feed
 * (/activity) so the bell and the notifications page feel consistent.
 */
export const NOTIFICATION_STYLES: Record<string, NotificationTypeStyle> = {
  rfq_posted:          { icon: FileText,      chip: 'bg-blue-100 text-blue-600',       label: 'New RFQ' },
  offer_submitted:     { icon: TrendingUp,    chip: 'bg-rose-100 text-rose-600',       label: 'New Offer' },
  rfq_awarded:         { icon: Award,         chip: 'bg-emerald-100 text-emerald-600', label: 'RFQ Awarded' },
  order_placed:        { icon: ShoppingCart,  chip: 'bg-amber-100 text-amber-600',     label: 'New Order' },
  order_completed:     { icon: CheckCircle2,  chip: 'bg-green-100 text-green-600',     label: 'Order Complete' },
  company_joined:      { icon: Building2,     chip: 'bg-cyan-100 text-cyan-600',       label: 'New Company' },
  team_member_added:   { icon: UserPlus,      chip: 'bg-rose-100 text-rose-600',       label: 'Team Update' },
  social_post_created: { icon: MessageCircle, chip: 'bg-purple-100 text-purple-600',   label: 'Community' },
}

export function notificationStyle(type: string): NotificationTypeStyle {
  return NOTIFICATION_STYLES[type] ?? { icon: Bell, chip: 'bg-gray-100 text-gray-600', label: 'Notification' }
}
