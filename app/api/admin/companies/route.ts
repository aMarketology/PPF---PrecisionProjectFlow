import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const INACTIVE_DAYS = 45;
type Status = 'active' | 'inactive' | 'cold';

/**
 * GET /api/admin/companies?status=all|active|inactive|cold&q=&page=1
 * Super admin only.
 *  - active:   at least one active member signed in within 45 days
 *  - inactive: has members, but none signed in within 45 days
 *  - cold:     no active members (nobody signed up / joined)
 */
export async function GET(request: NextRequest) {
  try {
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const db = createServiceClient();
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const sp = new URL(request.url).searchParams;
    const status = (sp.get('status') ?? 'all') as Status | 'all';
    const q = (sp.get('q') ?? '').trim().replace(/[%,()]/g, '');
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const pageSize = 25;

    // Active memberships
    const { data: members } = await db
      .from('company_members')
      .select('company_id, user_id, role')
      .eq('status', 'active');
    const mems = members ?? [];

    // Last sign-in per user (auth.users)
    const lastSignIn = new Map<string, string | null>();
    const wanted = new Set(mems.map(m => m.user_id));
    for (let p = 1; p <= 20 && lastSignIn.size < wanted.size; p++) {
      const { data, error } = await db.auth.admin.listUsers({ page: p, perPage: 1000 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) if (wanted.has(u.id)) lastSignIn.set(u.id, u.last_sign_in_at ?? null);
      if (data.users.length < 1000) break;
    }

    const cutoff = Date.now() - INACTIVE_DAYS * 86400000;
    const info = new Map<string, { members: number; lastLogin: string | null }>();
    for (const m of mems) {
      const cur = info.get(m.company_id) ?? { members: 0, lastLogin: null };
      cur.members += 1;
      const ll = lastSignIn.get(m.user_id) ?? null;
      if (ll && (!cur.lastLogin || ll > cur.lastLogin)) cur.lastLogin = ll;
      info.set(m.company_id, cur);
    }

    const activeIds: string[] = [];
    const inactiveIds: string[] = [];
    info.forEach((v, id) => {
      if (v.lastLogin && new Date(v.lastLogin).getTime() >= cutoff) activeIds.push(id);
      else inactiveIds.push(id);
    });
    const memberIds = [...activeIds, ...inactiveIds];

    const { count: total } = await db.from('company_profiles').select('id', { count: 'exact', head: true });
    const counts = {
      total: total ?? 0,
      active: activeIds.length,
      inactive: inactiveIds.length,
      cold: Math.max(0, (total ?? 0) - memberIds.length),
    };

    let query = db
      .from('company_profiles')
      .select('id, company_name, name, slug, industry, city, state, is_verified, is_claimed, outreach_status, last_contacted_at, contact_email, created_at', { count: 'exact' });
    if (status === 'active') query = query.in('id', activeIds.length ? activeIds : ['00000000-0000-0000-0000-000000000000']);
    else if (status === 'inactive') query = query.in('id', inactiveIds.length ? inactiveIds : ['00000000-0000-0000-0000-000000000000']);
    else if (status === 'cold' && memberIds.length) query = query.not('id', 'in', `(${memberIds.join(',')})`);
    if (q) query = query.or(`company_name.ilike.%${q}%,name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);

    const from = (page - 1) * pageSize;
    const { data: rows, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const companies = (rows ?? []).map(c => {
      const i = info.get(c.id);
      const s: Status = !i ? 'cold' : activeIds.includes(c.id) ? 'active' : 'inactive';
      return { ...c, status: s, members: i?.members ?? 0, last_login: i?.lastLogin ?? null };
    });

    return NextResponse.json({ companies, counts, total: count ?? 0, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
