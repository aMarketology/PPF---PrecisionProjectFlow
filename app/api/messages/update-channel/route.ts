import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/messages/update-channel
// Rename or update channel settings (admin/owner only)
export async function POST(request: NextRequest) {
  try {
    const { conversationId, name, description, isPublic } = await request.json();
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Call the SECURITY DEFINER RPC which checks admin/owner role
    const { data, error } = await supabase.rpc('update_channel', {
      p_conversation_id: conversationId,
      p_name: name || null,
      p_description: description || null,
      p_is_public: isPublic ?? null,
    });

    if (error) {
      console.error('[update-channel] RPC error:', error);
      return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
    }
    if (data === 'not_admin') {
      return NextResponse.json({ error: 'Only admins and owners can update channels' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[update-channel] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}