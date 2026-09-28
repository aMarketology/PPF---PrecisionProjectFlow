import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/messages/close
 * Super admin only. Closes (ends) or reopens a direct conversation.
 * Body: { conversationId, closed: boolean }
 *
 *  - Super admin threads are FREE & OPEN by default (see send route).
 *  - Ending one marks it as a support ticket, closes it, and posts a
 *    system message to both parties (via end_support_ticket RPC).
 *  - Reopening flips it back to free/open.
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, closed } = await request.json();

    if (!conversationId || typeof closed !== 'boolean') {
      return NextResponse.json({ error: 'conversationId and closed (boolean) are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient();

    // Admin-only.
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // The conversation must exist and be a direct thread.
    const { data: conv, error: convErr } = await serviceSupabase
      .from('user_conversations')
      .select('id, conversation_type')
      .eq('id', conversationId)
      .single();
    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (conv.conversation_type !== 'direct') {
      return NextResponse.json({ error: 'Only direct conversations can be moderated' }, { status: 400 });
    }

    if (closed) {
      // End the support ticket: closes + posts system message.
      const { data: endResult, error: endErr } = await serviceSupabase.rpc('end_support_ticket', {
        p_conversation_id: conversationId,
        p_admin_id: user.id,
      });
      if (endErr) throw endErr;
      if (typeof endResult === 'string' && endResult.startsWith('error:')) {
        return NextResponse.json({ error: endResult }, { status: 400 });
      }
    } else {
      // Reopen: clear close state (and keep it a support ticket).
      const { error: updErr } = await serviceSupabase
        .from('user_conversations')
        .update({
          is_closed: false,
          closed_at: null,
          is_support_ticket: true,
          ticket_opened_at: null,
        })
        .eq('id', conversationId);
      if (updErr) throw updErr;
    }

    return NextResponse.json({ success: true, isClosed: closed });
  } catch (error: any) {
    console.error('[messages/close]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}