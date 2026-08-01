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

    const { data, error } = await supabase.rpc('update_channel_member_role', {
      p_conversation_id: conversationId,
      p_target_user_id: targetUserId,
      p_new_role: role,
    });

    if (error) {
      console.error('[update-role] RPC error:', error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
    if (data === 'not_owner') {
      return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[update-role] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}