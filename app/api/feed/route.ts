import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/feed?page=0&type=all
// Returns paginated feed posts with author profile + like status for current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page    = parseInt(searchParams.get('page') ?? '0', 10);
    const type    = searchParams.get('type') ?? 'all';
    const limit   = 10;
    const offset  = page * limit;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('feed_posts')
      .select(`
        id, content, post_type, media_urls, linked_type, linked_id,
        likes_count, comments_count, bids_count, budget, deadline, created_at,
        author:profiles!author_id (
          id, full_name, avatar_url, user_type, company_name
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type !== 'all') {
      query = query.eq('post_type', type);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    // Attach whether current user has liked each post
    let likedPostIds = new Set<string>();
    if (user && posts?.length) {
      const { data: likes } = await supabase
        .from('feed_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', posts.map((p: any) => p.id));
      likedPostIds = new Set((likes ?? []).map((l: any) => l.post_id));
    }

    const enriched = (posts ?? []).map((p: any) => ({
      ...p,
      liked_by_me: likedPostIds.has(p.id),
    }));

    return NextResponse.json({ posts: enriched, page, hasMore: (posts?.length ?? 0) === limit });

  } catch (error: any) {
    console.error('Feed GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/feed
// Creates a new feed post
// Body: { content, post_type?, media_urls?, linked_type?, linked_id? }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, post_type = 'update', media_urls = [], linked_type, linked_id, budget, deadline } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    if (content.length > 3000) {
      return NextResponse.json({ error: 'content must be under 3000 characters' }, { status: 400 });
    }

    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert({
        author_id:   user.id,
        content:     content.trim(),
        post_type,
        media_urls,
        linked_type: linked_type ?? null,
        linked_id:   linked_id ?? null,
        budget:      budget ?? null,
        deadline:    deadline ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post }, { status: 201 });

  } catch (error: any) {
    console.error('Feed POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
