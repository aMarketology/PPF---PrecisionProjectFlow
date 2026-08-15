'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Shield, Users, Package, FileText, Building2,
  BarChart3, Settings, ShoppingCart, Loader2,
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        const res = await fetch('/api/admin?action=check')
        if (!res.ok) {
          router.push('/login?redirect=/admin')
          return
        }
        const json = await res.json()
        if (!json.isAdmin) {
          router.push('/')
          return
        }
        setUser(json.profile)
      } catch {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAccess()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#003D82]" />
      </div>
    )
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: Shield },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Companies', href: '/admin/companies', icon: Building2 },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Services', href: '/admin/services', icon: Settings },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'RFQs', href: '/admin/rfqs', icon: FileText },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
      {/* Top Bar */}
      <header className="bg-gray-900 text-white sticky top-0 z-50">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-lg">PPF Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white">← Site</Link>
            <span className="text-gray-500">{user?.email}</span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar */}
        <aside className="w-56 bg-gray-900 text-gray-400 flex flex-col flex-shrink-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-l-2 ${
                pathname === item.href
                  ? 'bg-gray-800 text-white border-[#FF6B35]'
                  : 'hover:bg-gray-800 hover:text-white border-transparent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
