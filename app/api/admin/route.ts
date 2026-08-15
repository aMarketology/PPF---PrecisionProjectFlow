import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ── Shared auth helper — supports both Bearer JWT (CLI) and cookie (browser) ──
async function getAuthedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // CLI path: validate the Supabase JWT
    const token = authHeader.substring(7);
    const anonClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await anonClient.auth.getUser(token);
    userId = data.user?.id ?? null;
  } else {
    // Browser path: read the Next.js auth cookie
    const serverSupabase = await createClient();
    const { data } = await serverSupabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  if (!userId) return null;

  // Check admin flag in profiles (service role to bypass RLS)
  const serviceSupabase = createServiceClient();
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('is_admin, full_name, email')
    .eq('id', userId)
    .single();

  return profile?.is_admin ? { userId, profile } : null;
}

/**
 * GET /api/admin?action=check
 *   Returns { isAdmin: boolean } for the current user
 *
 * GET /api/admin?action=stats
 *   Returns { users, companies, products, services, rfqs } counts
 *
 * GET /api/admin?action=data&tab=users|companies|products|services|rfqs|orders
 *   Returns up to 50 rows for the given table
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') ?? 'check';

    const admin = await getAuthedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Not authenticated or not an admin' }, { status: 401 });
    }

    const supabase = createServiceClient();

    if (action === 'check') {
      return NextResponse.json({ isAdmin: true, profile: admin.profile });
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
        case 'orders':
          result = await supabase.from('product_orders').select('*, buyer:profiles!product_orders_buyer_id_fkey(id, full_name, email), company:company_profiles!product_orders_company_id_fkey(id, company_name)').order('created_at', { ascending: false }).limit(50);
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
 * POST /api/admin
 * Body: { action, tab?, id?, userId?, amount?, active? }
 *
 * Actions:
 *   delete  — delete a row (tab + id required)
 *   toggle  — toggle active state (tab + id + body.active required)
 *   grant-tokens — mint tokens to a user (userId + amount required)
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Not authenticated or not an admin' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || body.action;
    const tab = searchParams.get('tab') || body.tab;
    const id = searchParams.get('id') || body.id;

    // ── grant-tokens ──
    if (action === 'grant-tokens') {
      const userId = body.userId;
      const amount = Number(body.amount);
      if (!userId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'userId and positive amount required' }, { status: 400 });
      }

      const { error } = await supabase.rpc('add_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_description: 'Admin grant via CLI',
        p_stripe_payment_id: 'admin-cli-' + Date.now(),
      });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Read back new balance
      const { data: prof } = await supabase.from('profiles').select('email, token_balance').eq('id', userId).single();

      return NextResponse.json({
        success: true,
        message: `Granted ${amount} tokens to ${prof?.email || userId}`,
        newBalance: prof?.token_balance,
      });
    }

    // ── delete ──
    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const table = tab === 'companies' ? 'company_profiles'
        : tab === 'rfqs' ? 'rfqs'
        : tab === 'users' ? 'profiles'
        : tab ?? 'profiles';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ── toggle ──
    if (action === 'toggle') {
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
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