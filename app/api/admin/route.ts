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

    if (action === 'admins') {
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_admin', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ admins: admins ?? [] });
    }

    // ── Real analytics for /admin/reports ──────────────────────────
    if (action === 'reports') {
      const range = searchParams.get('range') ?? '30d';
      const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '1y' ? 365 : 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString();

      const [ordersRes, productOrdersRes, profilesRes, servicesRes, productsRes, rfqsRes, offersRes, reportsRes] =
        await Promise.all([
          supabase.from('orders').select('id, status, total_amount, created_at, engineer_id, service_id'),
          supabase.from('product_orders').select('id, status, total_amount, platform_fee, created_at, company_id, product_id, product_name'),
          supabase.from('profiles').select('id, full_name, email, user_type, created_at'),
          supabase.from('services').select('id, title, category, price, provider_id, active'),
          supabase.from('products').select('id, name, category, price, company_id, is_active'),
          supabase.from('rfqs').select('id, title, category, status, created_at'),
          supabase.from('rfq_offers').select('id, rfq_id, vendor_id, amount, status, created_at'),
          supabase.from('content_reports').select('id, target_type, reason, description, status, created_at, reporter_id'),
        ]);

      const orders = ordersRes.data ?? [];
      const productOrders = productOrdersRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const services = servicesRes.data ?? [];
      const products = productsRes.data ?? [];
      const rfqs = rfqsRes.data ?? [];
      const offers = offersRes.data ?? [];
      const reports = reportsRes.data ?? [];

      const inRange = (d: string) => d >= since;
      const inPrev = (d: string) => d >= prevSince && d < since;

      // Revenue = service orders + product orders (product orders carry a platform fee)
      const revenueOf = (list: any[]) => list.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const feeOf = (list: any[]) => list.reduce((s, o) => s + Number(o.platform_fee || 0), 0);

      const curOrders = orders.filter(o => inRange(o.created_at));
      const prevOrders = orders.filter(o => inPrev(o.created_at));
      const curProductOrders = productOrders.filter(o => inRange(o.created_at));
      const prevProductOrders = productOrders.filter(o => inPrev(o.created_at));

      const curRevenue = revenueOf(curOrders) + revenueOf(curProductOrders);
      const prevRevenue = revenueOf(prevOrders) + revenueOf(prevProductOrders);
      const growth = prevRevenue > 0 ? Math.round(((curRevenue - prevRevenue) / prevRevenue) * 100) : (curRevenue > 0 ? 100 : 0);

      const curNewUsers = profiles.filter(p => inRange(p.created_at)).length;
      const prevNewUsers = profiles.filter(p => inPrev(p.created_at)).length;
      const userGrowth = prevNewUsers > 0 ? Math.round(((curNewUsers - prevNewUsers) / prevNewUsers) * 100) : (curNewUsers > 0 ? 100 : 0);

      const allOrders = [...orders, ...productOrders];
      const completed = allOrders.filter(o => ['completed', 'delivered'].includes(o.status)).length;
      const completionRate = allOrders.length > 0 ? Math.round((completed / allOrders.length) * 1000) / 10 : 0;

      // Top categories by revenue (service orders → service category; product orders → product category)
      const serviceById = new Map(services.map(s => [s.id, s]));
      const productById = new Map(products.map(p => [p.id, p]));
      const catRevenue = new Map<string, number>();
      for (const o of orders) {
        const cat = serviceById.get(o.service_id)?.category || 'Uncategorized';
        catRevenue.set(cat, (catRevenue.get(cat) || 0) + Number(o.total_amount || 0));
      }
      for (const o of productOrders) {
        const cat = productById.get(o.product_id)?.category || 'Uncategorized';
        catRevenue.set(cat, (catRevenue.get(cat) || 0) + Number(o.total_amount || 0));
      }
      const totalCatRevenue = Array.from(catRevenue.values()).reduce((a, b) => a + b, 0);
      const topCategories = Array.from(catRevenue.entries())
        .map(([name, revenue]) => ({ name, revenue, percentage: totalCatRevenue > 0 ? Math.round((revenue / totalCatRevenue) * 100) : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Top vendors by revenue (service orders → engineer; product orders → company owner)
      const profileById = new Map(profiles.map(p => [p.id, p]));
      const companyOwnerIds = Array.from(new Set(productOrders.map(o => o.company_id).filter(Boolean)))
      const { data: orderCompanies } = companyOwnerIds.length
        ? await supabase.from('company_profiles').select('id, company_name, owner_id').in('id', companyOwnerIds)
        : { data: [] as any[] }
      const companyById = new Map((orderCompanies || []).map(c => [c.id, c]))
      const vendorRevenue = new Map<string, { revenue: number; orders: number }>()
      const bump = (id: string | null, amount: number) => {
        if (!id) return
        const e = vendorRevenue.get(id) || { revenue: 0, orders: 0 }
        e.revenue += amount; e.orders += 1
        vendorRevenue.set(id, e)
      }
      for (const o of orders) bump(o.engineer_id, Number(o.total_amount || 0))
      for (const o of productOrders) bump(companyById.get(o.company_id)?.owner_id ?? null, Number(o.total_amount || 0))
      const topVendors = Array.from(vendorRevenue.entries())
        .map(([id, v]) => ({ id, name: profileById.get(id)?.full_name || 'Unknown', ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Report queue with reporter names
      const reporterIds = Array.from(new Set(reports.map(r => r.reporter_id).filter(Boolean)));
      const { data: reporters } = reporterIds.length
        ? await supabase.from('profiles').select('id, full_name, email').in('id', reporterIds)
        : { data: [] as any[] };
      const reporterMap = new Map((reporters || []).map(p => [p.id, p]));
      const reportQueue = reports
        .map(r => ({ ...r, reporter: reporterMap.get(r.reporter_id) ?? null }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 25);

      return NextResponse.json({
        range,
        metrics: {
          revenue: curRevenue,
          platformFees: feeOf(curProductOrders),
          revenueGrowth: growth,
          newUsers: curNewUsers,
          userGrowth,
          completionRate,
          totalOrders: allOrders.length,
        },
        topCategories,
        topVendors,
        reportQueue,
        reportCounts: {
          pending: reports.filter(r => r.status === 'pending').length,
          investigating: reports.filter(r => r.status === 'investigating').length,
          resolved: reports.filter(r => r.status === 'resolved').length,
          dismissed: reports.filter(r => r.status === 'dismissed').length,
        },
        inventory: {
          services: services.length,
          activeServices: services.filter(s => s.active).length,
          products: products.length,
          activeProducts: products.filter(p => p.is_active).length,
          rfqs: rfqs.length,
          openRfqs: rfqs.filter(r => r.status === 'open').length,
          offers: offers.length,
          users: profiles.length,
        },
      });
    }

    if (action === 'data') {
      const tab = searchParams.get('tab') ?? 'users';
      const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
      const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') ?? '50', 10) || 50, 1), 200);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let result: any;

      switch (tab) {
        case 'users':
          result = await supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
          break;
        case 'companies':
          result = await supabase.from('company_profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
          break;
        case 'products':
          result = await supabase.from('products').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
          break;
        case 'services':
          result = await supabase.from('services').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
          break;
        case 'rfqs':
          result = await supabase.from('rfqs').select('*, client:profiles!rfqs_client_id_fkey(id, full_name, email)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
          break;
        case 'orders':
          result = await supabase.from('product_orders').select('*, buyer:profiles!product_orders_buyer_id_fkey(id, full_name, email), company:company_profiles!product_orders_company_id_fkey(id, company_name)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
          break;
      }

      const total = result?.count ?? 0;
      let rows = result?.data ?? [];

      // Enrich services with provider name/location (no FK embed available).
      if (tab === 'services' && rows.length > 0) {
        const providerIds = Array.from(new Set(rows.map((r: any) => r.provider_id).filter(Boolean)));
        if (providerIds.length > 0) {
          const { data: providers } = await supabase
            .from('profiles')
            .select('id, full_name, location')
            .in('id', providerIds);
          const pmap = new Map((providers || []).map(p => [p.id, p]));
          rows = rows.map((r: any) => ({ ...r, provider: pmap.get(r.provider_id) ?? null }));
        }
      }

      return NextResponse.json({
        data: rows,
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      });
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
 * POST /api/admin?action=reset-company-claim&id=xxx
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

    // ── Report queue moderation ────────────────────────────────────
    if (action === 'report-status') {
      const body = await request.json();
      const status = body.status;
      if (!['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      const { error } = await supabase
        .from('content_reports')
        .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'report-delete') {
      const { error } = await supabase.from('content_reports').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ── Admin role management ──────────────────────────────────────
    if (action === 'promote' || action === 'demote') {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: action === 'promote' })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'invite-claim') {
      const body = await request.json().catch(() => ({}));
      const email = body.email;
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
      const { data: target } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .maybeSingle();
      if (!target) return NextResponse.json({ error: 'No account with that email' }, { status: 404 });
      const { error } = await supabase
        .from('company_profiles')
        .update({ owner_id: target.id, is_claimed: true, claimed_by: target.id, claimed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, user: target });
    }

    if (action === 'reset-company-claim') {
      const { data: company, error: companyError } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (companyError) throw companyError;
      if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

      const { error: resetError } = await supabase
        .from('company_profiles')
        .update({ owner_id: null, is_claimed: false, claimed_by: null, claimed_at: null })
        .eq('id', id);
      if (resetError) throw resetError;

      const now = new Date().toISOString();
      const { error: membersError } = await supabase
        .from('company_members')
        .update({ status: 'removed', updated_at: now })
        .eq('company_id', id)
        .eq('status', 'active');
      if (membersError) throw membersError;

      const { error: claimsError } = await supabase
        .from('company_claims')
        .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: now })
        .eq('company_id', id)
        .eq('status', 'pending');
      if (claimsError) throw claimsError;

      return NextResponse.json({ success: true });
    }

    // ── Super-admin management ──────────────────────────────────────
    if (action === 'promote') {
      const body = await request.json().catch(() => ({}));
      const email = (body?.email ?? '').trim().toLowerCase();
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

      const { data: target, error: findErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_admin')
        .ilike('email', email)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!target) return NextResponse.json({ error: `No account found for ${email}` }, { status: 404 });
      if (target.is_admin) return NextResponse.json({ message: `${target.full_name || email} is already a super admin.` });

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', target.id);
      if (upErr) throw upErr;

      return NextResponse.json({ success: true, message: `${target.full_name || email} is now a super admin.` });
    }

    if (action === 'demote') {
      const body = await request.json().catch(() => ({}));
      const email = (body?.email ?? '').trim().toLowerCase();
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

      const { data: target, error: findErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_admin')
        .ilike('email', email)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!target) return NextResponse.json({ error: `No account found for ${email}` }, { status: 404 });
      if (target.id === user.id) {
        return NextResponse.json({ error: 'You cannot remove your own super admin access.' }, { status: 400 });
      }

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ is_admin: false })
        .eq('id', target.id);
      if (upErr) throw upErr;

      return NextResponse.json({ success: true, message: `${target.full_name || email} is no longer a super admin.` });
    }

    if (action === 'invite-claim') {
      const body = await request.json().catch(() => ({}));
      const email = (body?.email ?? '').trim().toLowerCase();
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

      const { data: company, error: compErr } = await supabase
        .from('company_profiles')
        .select('id, company_name, slug')
        .eq('id', id)
        .maybeSingle();
      if (compErr) throw compErr;
      if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

      // If the invitee already has an account, send them a DM with the claim link.
      const { data: invitee } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('email', email)
        .maybeSingle();

      const claimUrl = `/claim-company?company=${company.slug || company.id}`;

      if (invitee?.id) {
        const { data: convId, error: convErr } = await supabase.rpc('get_or_create_conversation', {
          user_one_id: user.id,
          user_two_id: invitee.id,
        });
        if (convErr) throw convErr;
        if (convId) {
          const { error: msgErr } = await supabase.from('user_messages').insert({
            conversation_id: convId,
            sender_id: user.id,
            content: `You have been invited to claim the "${company.company_name}" listing on Precision Project Flow. Claim it here: ${claimUrl}`,
            is_system_message: true,
          });
          if (msgErr) throw msgErr;
          return NextResponse.json({ success: true, method: 'dm', message: `DM sent to ${invitee.full_name || email}` });
        }
      }

      // No account yet: record the outreach so it can be followed up.
      return NextResponse.json({
        success: true,
        method: 'email',
        message: `No account found for ${email}. Share this claim link: ${claimUrl}`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[admin API]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}