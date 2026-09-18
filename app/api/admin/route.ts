import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

import { sendClaimInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const ADMIN_DATA_TABS = ['users', 'companies', 'products', 'services', 'rfqs', 'orders'] as const;
const ADMIN_DELETE_TABLES = {
  users: 'profiles',
  companies: 'company_profiles',
  products: 'products',
  services: 'services',
  rfqs: 'rfqs',
  orders: 'product_orders',
} as const;

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

    if (action === 'user-detail') {
      const userId = searchParams.get('id');
      if (!userId) return NextResponse.json({ error: 'id required' }, { status: 400 });

      // Profile data
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (profileErr || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      // Company memberships with company names
      const { data: memberships, error: membersErr } = await supabase
        .from('company_members')
        .select('id, company_id, role, status, created_at, company:company_profiles(id, company_name)')
        .eq('user_id', userId);

      // Company they own (where this user is the owner on company_profiles)
      const { data: ownedCompanies } = await supabase
        .from('company_profiles')
        .select('id, company_name')
        .eq('owner_id', userId);

      // Auth metadata (last sign in, email verified, etc.) via admin API
      let authData: any = null;
      try {
        const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId);
        if (authUser?.user) {
          authData = {
            last_sign_in_at: authUser.user.last_sign_in_at,
            email_confirmed_at: authUser.user.email_confirmed_at,
            confirmed_at: authUser.user.confirmed_at,
            phone: authUser.user.phone,
            created_at: authUser.user.created_at,
            updated_at: authUser.user.updated_at,
          };
        }
      } catch { /* auth admin may not be available */ }

      // Recent RFQs posted by this user
      const { data: recentRfqs } = await supabase
        .from('rfqs')
        .select('id, title, status, created_at')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Recent services (if engineer)
      const { data: recentServices } = await supabase
        .from('services')
        .select('id, title, category, active, created_at')
        .eq('provider_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Count of messages sent
      const { count: messagesSent } = await supabase
        .from('user_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId);

      return NextResponse.json({
        profile,
        memberships: memberships ?? [],
        ownedCompanies: ownedCompanies ?? [],
        authData,
        recentRfqs: recentRfqs ?? [],
        recentServices: recentServices ?? [],
        messagesSent: messagesSent ?? 0,
      });
    }

    if (action === 'data') {
      const tab = searchParams.get('tab') ?? 'users';
      if (!ADMIN_DATA_TABS.includes(tab as typeof ADMIN_DATA_TABS[number])) {
        return NextResponse.json({ error: 'Invalid admin data tab' }, { status: 400 });
      }
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10) || 50));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Map tab to its table/query for pagination
      const TABLES: Record<string, string> = {
        users: 'profiles',
        companies: 'company_profiles',
        products: 'products',
        services: 'services',
        rfqs: 'rfqs',
        orders: 'product_orders',
      };
      const table = TABLES[tab];

      // Count total for pagination
      const { count: total } = await supabase.from(table).select('*', { count: 'exact', head: true });

      let result: any;

      switch (tab) {
        case 'users':
          result = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(from, to);
          break;
        case 'companies':
          result = await supabase.from('company_profiles').select('*').order('created_at', { ascending: false }).range(from, to);
          break;
        case 'products':
          result = await supabase.from('products').select('*').order('created_at', { ascending: false }).range(from, to);
          break;
        case 'services':
          result = await supabase.from('services').select('*').order('created_at', { ascending: false }).range(from, to);
          break;
        case 'rfqs':
          result = await supabase.from('rfqs').select('*, client:profiles!rfqs_client_id_fkey(id, full_name, email)').order('created_at', { ascending: false }).range(from, to);
          break;
        case 'orders':
          result = await supabase.from('product_orders').select('*, buyer:profiles!product_orders_buyer_id_fkey(id, full_name, email), company:company_profiles!product_orders_company_id_fkey(id, company_name)').order('created_at', { ascending: false }).range(from, to);
          break;
      }

      return NextResponse.json({
        data: result?.data ?? [],
        total: total ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((total ?? 0) / pageSize),
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
   * POST /api/admin?action=invite-claim&id=xxx  { email: string }
 * POST /api/admin?action=promote&id=xxx  { email: string } — sets is_admin = true
 * POST /api/admin?action=demote&id=xxx  { email: string } — sets is_admin = false
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
      if (!tab || !(tab in ADMIN_DELETE_TABLES)) {
        return NextResponse.json({ error: 'Invalid delete target' }, { status: 400 });
      }
      const table = ADMIN_DELETE_TABLES[tab as keyof typeof ADMIN_DELETE_TABLES];
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle') {
      const body = await request.json();
      const active = body.active;

      // Map tab to table + column for toggle
      const TOGGLE_MAP: Record<string, { table: string; col: string }> = {
        products:  { table: 'products',  col: 'is_active' },
        services:  { table: 'services',  col: 'active' },
        rfqs:      { table: 'rfqs',      col: 'status' },
        companies: { table: 'company_profiles', col: 'is_claimed' },
      };

      const mapping = TOGGLE_MAP[tab || ''];
      if (!mapping) return NextResponse.json({ error: `Toggle not supported for ${tab}` }, { status: 400 });

      // For RFQs, toggle between 'open' and 'closed'
      if (tab === 'rfqs') {
        const newStatus = active ? 'open' : 'closed';
        const { error } = await supabase.from('rfqs').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true, newValue: newStatus });
      }

      const { error } = await supabase.from(mapping.table).update({ [mapping.col]: active }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'platform-message') {
      const body = await request.json().catch(() => ({}));
      const { targetUserId, message } = body;
      if (!targetUserId || !message) return NextResponse.json({ error: 'targetUserId and message required' }, { status: 400 });

      // Get or create DM between admin and target user
      const { data: convId } = await supabase.rpc('get_or_create_conversation', {
        user_one_id: user.id,
        user_two_id: targetUserId,
      });

      if (!convId) return NextResponse.json({ error: 'Could not create conversation' }, { status: 500 });

      // Send as system message from the admin
      await supabase.from('user_messages').insert({
        conversation_id: convId,
        sender_id: user.id,
        content: `🛡️ **Precision Project Flow Admin:** ${message}`,
        is_system_message: true,
        is_read: false,
        is_paid: true,
      });

      await supabase.from('user_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);

      return NextResponse.json({ success: true, conversationId: convId });
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

    if (action === 'invite-claim') {
      const body = await request.json().catch(() => ({}));
      const email = body.email;
      if (!email || !id) return NextResponse.json({ error: 'email and company id required' }, { status: 400 });

      const { data: company } = await supabase
        .from('company_profiles')
        .select('id, company_name, contact_name, city, state, email, is_claimed')
        .eq('id', id)
        .single();
      if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      if (company.is_claimed) return NextResponse.json({ error: 'Company is already claimed' }, { status: 409 });

      // Check if the recipient already has a PPF account
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        // ── User exists → send in-app DM with claim link ──
        const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/claim-company?id=${company.id}&name=${encodeURIComponent(company.company_name)}`;

        // Get or create DM between admin and target user
        const { data: convId } = await supabase.rpc('get_or_create_conversation', {
          user_one_id: user.id,
          user_two_id: existingProfile.id,
        });

        if (convId) {
          await supabase.from('user_messages').insert({
            conversation_id: convId,
            sender_id: user.id,
            content: `🏢 **Claim Your Company:** You've been invited to claim **${company.company_name}** on Precision Project Flow.\n\n👉 [Claim ${company.company_name} Now](${claimUrl})\n\nOnce claimed, you can update company details, add team members, receive RFQ notifications, and message buyers directly.`,
            is_system_message: true,
            is_read: false,
            is_paid: true,
          });
          await supabase.from('user_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
        }

        return NextResponse.json({ success: true, message: `DM sent to ${existingProfile.full_name || email}`, method: 'dm' });
      }

      // ── No account → send email ──
      await sendClaimInviteEmail({
        to: email,
        contactName: company.contact_name || 'there',
        companyName: company.company_name,
        companyId: company.id,
        city: company.city,
        state: company.state,
      });

      return NextResponse.json({ success: true, message: `Email sent to ${email}`, method: 'email' });
    }

    if (action === 'promote') {
      const body = await request.json().catch(() => ({}));
      const email = body.email;
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

      const { error } = await supabase.from('profiles').update({ is_admin: true }).eq('email', email);
      if (error) throw error;
      return NextResponse.json({ success: true, message: `${email} promoted to super admin` });
    }

    if (action === 'demote') {
      const body = await request.json().catch(() => ({}));
      const email = body.email;
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

      // Prevent self-demotion
      const { data: caller } = await supabase.from('profiles').select('email').eq('id', user.id).single();
      if (caller?.email === email) return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 403 });

      const { error } = await supabase.from('profiles').update({ is_admin: false }).eq('email', email);
      if (error) throw error;
      return NextResponse.json({ success: true, message: `${email} removed from super admin` });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[admin API]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}