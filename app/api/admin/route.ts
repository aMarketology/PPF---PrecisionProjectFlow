import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin?action=check
 *   Returns { isAdmin: boolean } for the current user
 *
 * GET /api/admin?action=stats
 *   Returns { users, companies, products, services, rfqs } counts
 *
 * GET /api/admin?action=data&tab=users|companies|products|services|rfqs
 *   Returns up to 50 rows for the given table
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') ?? 'check';

    // Use the server client (reads auth cookie) to get the current user
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service client (bypasses RLS) for DB queries
    const supabase = createServiceClient();

    // Check admin status directly from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, full_name, email')
      .eq('id', user.id)
      .single();

    const isAdmin = !!profile?.is_admin;

    if (!isAdmin) {
      return NextResponse.json({ isAdmin: false, error: 'Access denied' }, { status: 403 });
    }

    if (action === 'check') {
      return NextResponse.json({ isAdmin: true, profile });
    }

    if (action === 'stats') {
      const tables = ['profiles', 'company_profiles', 'products', 'services', 'rfqs'] as const;
      const results = await Promise.all(
        tables.map(t => supabase.from(t).select('*', { count: 'exact', head: true }))
      );
      return NextResponse.json({
        users: results[0].count ?? 0,
        companies: results[1].count ?? 0,
        products: results[2].count ?? 0,
        services: results[3].count ?? 0,
        rfqs: results[4].count ?? 0,
      });
    }

    if (action === 'data') {
      const tab = searchParams.get('tab') ?? 'users';
      let result: any;

      switch (tab) {
        case 'users':
          result = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
          break;
        case 'companies':
          result = await supabase.from('company_profiles').select('*').order('created_at', { ascending: false }).limit(50);
          break;
        case 'products':
          result = await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(50);
          break;
        case 'services':
          result = await supabase.from('services').select('*').order('created_at', { ascending: false }).limit(50);
          break;
        case 'rfqs':
          result = await supabase.from('rfqs').select('*, client:profiles!rfqs_client_id_fkey(id, full_name, email)').order('created_at', { ascending: false }).limit(50);
          break;
      }

      return NextResponse.json({ data: result?.data ?? [] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[admin API]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin?action=delete&tab=users&id=xxx
 * POST /api/admin?action=toggle&tab=products|services&id=xxx
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const tab = searchParams.get('tab');
    const id = searchParams.get('id');

    if (!action || !id) {
      return NextResponse.json({ error: 'action and id required' }, { status: 400 });
    }

    // Get user from server client (reads auth cookie)
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Use service client for DB queries
    const supabase = createServiceClient();

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    if (action === 'delete') {
      const table = tab === 'companies' ? 'company_profiles'
        : tab === 'rfqs' ? 'rfqs'
        : tab === 'users' ? 'profiles'
        : tab ?? 'profiles';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle') {
      const body = await request.json();
      const table = tab === 'products' ? 'products' : 'services';
      const col = tab === 'products' ? 'is_active' : 'active';
      const { error } = await supabase.from(table).update({ [col]: body.active }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[admin API]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}