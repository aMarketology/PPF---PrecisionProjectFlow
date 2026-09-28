import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// GET /api/notifications?limit=20&offset=0&unreadOnly=false
// Returns the signed-in user's personal notifications (newest first),
// enriched with the actor's profile, plus the total unread count.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 50);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    let query = supabase
      .from('user_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data: notifications, error, count } = await query;
    if (error) throw error;

    // Unread count (independent of the current page/filter)
    const { count: unreadCount } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    // Enrich with actor profiles (service role - profiles may be RLS-limited)
    const list = notifications ?? [];
    let actorMap = new Map<string, any>();
    const actorIds = Array.from(new Set(list.map(n => n.actor_id).filter(Boolean)));
    if (actorIds.length > 0) {
      const service = createServiceClient();
      const { data: profiles } = await service
        .from('profiles')
        .select('id, full_name, avatar_url, user_type')
        .in('id', actorIds);
      if (profiles) actorMap = new Map(profiles.map(p => [p.id, p]));
    }

    const enriched = list.map(n => ({
      ...n,
      actor: n.actor_id ? (actorMap.get(n.actor_id) ?? null) : null,
    }));

    return NextResponse.json({
      notifications: enriched,
      unreadCount: unreadCount ?? 0,
      total: count ?? 0,
      hasMore: list.length === limit,
    });
  } catch (error: any) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/notifications  { ids?: string[], all?: boolean }
// Marks the given notifications (or all of them) as read.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
    const markAll: boolean = body?.all === true;

    let update = supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!markAll) {
      if (!ids || ids.length === 0) {
        return NextResponse.json({ error: 'Provide ids[] or all:true' }, { status: 400 });
      }
      update = update.in('id', ids);
    }

    const { error } = await update;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/notifications?id=<uuid>  (or ?all=true to clear the inbox)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('all') === 'true';

    let del = supabase.from('user_notifications').delete().eq('user_id', user.id);
    if (!clearAll) {
      if (!id) return NextResponse.json({ error: 'Provide id or all=true' }, { status: 400 });
      del = del.eq('id', id);
    }

    const { error } = await del;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
