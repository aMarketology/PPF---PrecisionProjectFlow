import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/feed/[id]/like  — toggle like on a post
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;

    // Check if already liked
    const { data: existing } = await supabase
      .from('feed_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Unlike
      await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
      return NextResponse.json({ liked: true });
    }

  } catch (error: any) {
    console.error('Like toggle error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
