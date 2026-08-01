import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/messages/delete-channel
// Delete a channel or project (owner only)
export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only owners can delete channels' }, { status: 403 });
    }

    const { error } = await supabase
      .from('user_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('[delete-channel] error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[delete-channel] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}