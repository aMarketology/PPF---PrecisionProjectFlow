import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/activities?page=0&type=all&search=
// Returns paginated site_activities with actor profiles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page   = parseInt(searchParams.get('page') ?? '0', 10);
    const type   = searchParams.get('type') ?? 'all';
    const search = searchParams.get('search') ?? '';
    const limit  = 20;
    const offset = page * limit;

    const supabase = await createClient();

    let query = supabase
      .from('site_activities')
      .select('*, actor:profiles!actor_id(id, full_name, avatar_url, user_type)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type !== 'all') {
      query = query.eq('activity_type', type);
    }

    if (search) {
      query = query.ilike('summary', `%${search}%`);
    }

    const { data: activities, error } = await query;
    if (error) throw error;

    // Get total count for the current filter
    let countQuery = supabase.from('site_activities').select('*', { count: 'exact', head: true });
    if (type !== 'all') countQuery = countQuery.eq('activity_type', type);
    if (search) countQuery = countQuery.ilike('summary', `%${search}%`);
    const { count } = await countQuery;

    return NextResponse.json({
      activities: activities ?? [],
      page,
      hasMore: (activities?.length ?? 0) === limit,
      total: count ?? 0,
    });
  } catch (error: any) {
    console.error('Activities GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}