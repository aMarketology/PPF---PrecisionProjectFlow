import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic';

// GET /api/activities?page=0&type=all&search=
// Returns paginated site_activities with actor profiles
// Uses service_role key to bypass RLS — activities are public feed data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page   = parseInt(searchParams.get('page') ?? '0', 10);
    const type   = searchParams.get('type') ?? 'all';
    const search = searchParams.get('search') ?? '';
    const limit  = 20;
    const offset = page * limit;

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceClient
      .from('site_activities')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type !== 'all') {
      query = query.eq('activity_type', type);
    }

    if (search) {
      query = query.ilike('summary', `%${search}%`);
    }

    const { data: activities, error, count } = await query;
    if (error) throw error;

    // Fetch actor profiles separately (FK is to auth.users, not profiles)
    const list = activities ?? [];
    let actorMap = new Map<string, any>();
    if (list.length > 0) {
      const actorIds = Array.from(new Set(list.map(a => a.actor_id).filter(Boolean)));
      if (actorIds.length > 0) {
        const { data: profiles } = await serviceClient
          .from('profiles')
          .select('id, full_name, avatar_url, user_type')
          .in('id', actorIds);
        if (profiles) {
          actorMap = new Map(profiles.map(p => [p.id, p]));
        }
      }
    }

    const enriched = list.map(a => ({
      ...a,
      actor: a.actor_id ? (actorMap.get(a.actor_id) ?? null) : null,
    }));

    return NextResponse.json({
      activities: enriched,
      page,
      hasMore: list.length === limit,
      total: count ?? 0,
    });
  } catch (error: any) {
    console.error('Activities GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}