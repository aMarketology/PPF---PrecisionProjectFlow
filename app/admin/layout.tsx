'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Shield, Users, FileText, Building2, Package,
  BarChart3, Settings, ShoppingCart, Loader2, LayoutDashboard, LogOut, TrendingUp,
  MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loadAdminContext, can, type AdminContext } from '@/lib/admin/context'
import { signOut } from '@/app/actions/auth'
import { RoleBadgeList } from '@/app/admin/components/RoleBadges'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [ctx, setCtx] = useState<AdminContext | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const context = await loadAdminContext(supabase)
        if (!context) {
          router.push('/login?redirect=/admin')
          return
        }
        setCtx(context)
      } catch {
        router.push('/login?redirect=/admin')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
      </div>
    )
  }

  if (!ctx) return null

  // Personal sections — available to every authenticated user.
  const personalItems = [
    { name: 'My Account', href: '/admin', icon: LayoutDashboard },
    { name: 'My Company', href: '/admin/company', icon: Building2 },
    // Company group chat — free for team members. Deep-links into the
    // company's General channel in the messaging UI.
    ...(ctx.primaryCompany
      ? [{ name: 'Company Chat', href: '/admin/company-chat', icon: MessageSquare }]
      : []),
    { name: 'My Listings', href: '/admin/my-listings', icon: Package },
    { name: 'My Orders', href: '/admin/my-orders', icon: ShoppingCart },
    { name: 'My RFQs', href: '/admin/my-rfqs', icon: FileText },
    ...(ctx.profile?.user_type === 'engineer'
      ? [{ name: 'Earnings', href: '/admin/earnings', icon: TrendingUp }]
      : []),
  ]

  // Platform sections — super admins only.
  const platformItems = [
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Companies', href: '/admin/companies', icon: Building2 },
    { name: 'Claims', href: '/admin/claims', icon: FileText },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Services', href: '/admin/services', icon: Settings },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'RFQs', href: '/admin/rfqs', icon: FileText },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Super Admin', href: '/admin/settings', icon: Shield },
  ]

  // Header identity is derived from real company membership + admin flag.
  const headerTitle = ctx.isAdmin
    ? 'PPF Admin'
    : ctx.primaryCompany?.company_name || 'My Account'
  const roleLabel = ctx.roleLabel

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const NavLink = ({ item }: { item: { name: string; href: string; icon: any } }) => {
    const active = pathname === item.href
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3.5 py-2.5 mx-2 rounded-xl text-sm font-semibold transition-all ${
          active
            ? 'bg-[#003D82] text-white shadow-sm shadow-[#003D82]/25'
            : 'text-gray-600 hover:bg-[#003D82]/8 hover:text-[#003D82]'
        }`}
      >
        <item.icon className="w-4 h-4" />
        {item.name}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      {/* Hero header — brand gradient + grid overlay */}
      <header className="relative bg-gradient-to-br from-[#001f4d] via-[#003D82] to-[#005BB5] sticky top-0 z-50 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)',
          }}
        />
        <div className="relative px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              {ctx.isAdmin
                ? <Shield className="w-4.5 h-4.5 text-[#FF6B35]" />
                : <Building2 className="w-4.5 h-4.5 text-[#FF6B35]" />}
            </div>
            <span className="font-extrabold text-lg text-white tracking-tight truncate">{headerTitle}</span>
            <RoleBadgeList badges={ctx.badges} variant="dark" max={3} className="hidden sm:flex" />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">← Site</Link>
            <span className="text-white/60 hidden sm:inline">{ctx.profile?.email}</span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar — light, brand-accented */}
        <aside className="w-60 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 overflow-y-auto">
          <p className="px-5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">My Account</p>
          <div className="space-y-0.5">
            {personalItems.map(item => <NavLink key={item.href} item={item} />)}
          </div>

          {can(ctx, 'view_platform') && (
            <>
              <p className="px-5 pt-6 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Platform</p>
              <div className="space-y-0.5">
                {platformItems.map(item => <NavLink key={item.href} item={item} />)}
              </div>
            </>
          )}

          {!can(ctx, 'view_platform') && (
            <div className="mt-auto p-4">
              <div className="bg-gradient-to-br from-[#FF6B35]/10 to-orange-50 border border-orange-200 rounded-2xl p-4">
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {ctx.roleDescription} Need platform-wide access? Ask a super admin to grant your account admin rights.
                </p>
              </div>
            </div>
          )}

          {/* Logout — pinned to the bottom of the sidebar */}
          <div className={`${can(ctx, 'view_platform') ? 'mt-auto' : ''} p-3 border-t border-gray-100`}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
