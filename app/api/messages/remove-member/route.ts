import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/messages/remove-member
// Remove a member from a channel/project (admin/owner only)
export async function POST(request: NextRequest) {
  try {
    const { conversationId, targetUserId } = await request.json();
    if (!conversationId || !targetUserId) {
      return NextResponse.json({ error: 'conversationId and targetUserId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin permission (pass user ID explicitly — RPC auth.uid() is NULL in server context)
    const { data: isAdmin } = await supabase.rpc('is_channel_admin', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    });
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins and owners can remove members' }, { status: 403 });
    }

    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('[remove-member] error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[remove-member] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}