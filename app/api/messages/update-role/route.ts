import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/messages/update-role
// Update a member's role in a channel/project (owner only)
export async function POST(request: NextRequest) {
  try {
    const { conversationId, targetUserId, role } = await request.json();
    if (!conversationId || !targetUserId || !role) {
      return NextResponse.json({ error: 'conversationId, targetUserId, and role required' }, { status: 400 });
    }
    if (!['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check owner permission (pass user ID explicitly)
    const { data: isOwner } = await supabase.rpc('is_channel_owner', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    });
    if (!isOwner) {
      return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });
    }

    const { error } = await supabase
      .from('conversation_participants')
      .update({ role })
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('[update-role] error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[update-role] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}