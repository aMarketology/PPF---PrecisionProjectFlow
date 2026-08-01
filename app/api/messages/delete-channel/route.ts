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

    const { data, error } = await supabase.rpc('delete_channel', {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error('[delete-channel] RPC error:', error);
      return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
    }
    if (data === 'not_owner') {
      return NextResponse.json({ error: 'Only owners can delete channels' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[delete-channel] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}