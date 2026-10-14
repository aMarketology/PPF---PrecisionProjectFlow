import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set() {}, remove() {}, // read-only in middleware
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Account status enforcement ──────────────────────────────────
  // Suspended/deactivated accounts are blocked from the whole app.
  // Auth + notice paths stay reachable so the user is never trapped.
  if (user) {
    const pathname = request.nextUrl.pathname
    const exempt = ['/login', '/signup', '/forgot-password', '/reset-password', '/account-suspended', '/api/auth']
    const isExempt = exempt.some(p => pathname === p || pathname.startsWith(`${p}/`))
    if (!isExempt) {
      const { data: isActive } = await supabase.rpc('is_account_active', { user_id: user.id })
      if (isActive === false) {
        // API clients expect a JSON error, not an HTML redirect.
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/account-suspended', request.url))
      }
    }
  }

  // ── Admin route protection ──────────────────────────────────────
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
    }

    // Every authenticated user gets a personal /admin panel. Only the
    // platform-wide management subpaths require super-admin (profiles.is_admin).
    const superAdminOnly = [
      '/admin/users', '/admin/companies', '/admin/directory', '/admin/claims', '/admin/products',
      '/admin/services', '/admin/orders', '/admin/rfqs', '/admin/reports',
      '/admin/settings', '/admin/outreach',
    ]
    const needsSuperAdmin = superAdminOnly.some(
      p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(`${p}/`)
    )

    if (needsSuperAdmin) {
      const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
