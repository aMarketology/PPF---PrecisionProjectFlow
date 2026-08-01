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

    const { data, error } = await supabase.rpc('add_channel_member', {
      p_conversation_id: conversationId,
      p_target_user_id: targetUserId,
    });

    if (error) {
      console.error('[add-member] RPC error:', error);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }
    if (data === 'not_admin') {
      return NextResponse.json({ error: 'Only admins and owners can add members' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[add-member] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}