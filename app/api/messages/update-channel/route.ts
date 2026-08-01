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

    // Check admin permission (pass user ID explicitly)
    const { data: isAdmin } = await supabase.rpc('is_channel_admin', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    });
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins and owners can update channels' }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isPublic !== undefined) updates.is_public = isPublic;

    const { error } = await supabase
      .from('user_conversations')
      .update(updates)
      .eq('id', conversationId);

    if (error) {
      console.error('[update-channel] error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[update-channel] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}