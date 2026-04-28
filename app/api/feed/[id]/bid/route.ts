import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/feed/[id]/bid
// Body: { amount: number, note?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, note } = await request.json();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 });
    }

    const postId = params.id;

    // Verify the post exists and is a parts_request
    const { data: post, error: postError } = await supabase
      .from('feed_posts')
      .select('id, post_type, author_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post.post_type !== 'parts_request') {
      return NextResponse.json({ error: 'Bids are only for parts requests' }, { status: 400 });
    }
    if (post.author_id === user.id) {
      return NextResponse.json({ error: 'You cannot bid on your own request' }, { status: 400 });
    }

    // Get bidder profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, company_name')
      .eq('id', user.id)
      .single();

    // Upsert bid (one bid per user per post — they can update their bid)
    const { data: bid, error: bidError } = await supabase
      .from('feed_bids')
      .upsert({
        post_id: postId,
        bidder_id: user.id,
        amount: Number(amount),
        note: note?.trim() || null,
        status: 'pending',
      }, { onConflict: 'post_id,bidder_id' })
      .select()
      .single();

    if (bidError) throw bidError;

    return NextResponse.json({
      bid: { ...bid, bidder: profile },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Bid error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/feed/[id]/bid — fetch all bids for a post
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: bids, error } = await supabase
      .from('feed_bids')
      .select(`
        id, amount, note, status, created_at,
        bidder:profiles!bidder_id(id, full_name, avatar_url, company_name)
      `)
      .eq('post_id', params.id)
      .order('amount', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ bids: bids ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
