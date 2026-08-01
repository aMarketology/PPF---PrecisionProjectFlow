import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/messages/add-member
// Add a member to a channel/project (admin/owner only)
export async function POST(request: NextRequest) {
  try {
    const { conversationId, targetUserId } = await request.json();
    if (!conversationId || !targetUserId) {
      return NextResponse.json({ error: 'conversationId and targetUserId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log('[add-member] user:', user.id, 'conv:', conversationId, 'target:', targetUserId);

    // First check if the user is an admin via the helper
    const { data: isAdmin } = await supabase.rpc('is_channel_admin', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    });
    console.log('[add-member] is_channel_admin:', isAdmin);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins and owners can add members' }, { status: 403 });
    }

    // Direct insert instead of RPC to avoid auth.uid() issues
    const { error: insertError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: targetUserId,
        role: 'member',
      });

    if (insertError) {
      console.error('[add-member] insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[add-member] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}