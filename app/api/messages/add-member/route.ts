import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// POST /api/messages/add-member
// Add a member to a channel/project (admin/owner only).
// If adding to a company channel, ALSO adds them to company_members
// and updates their profiles.company_id.
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

    // Check admin permission
    const { data: isAdmin } = await supabase.rpc('is_channel_admin', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    });
    console.log('[add-member] is_channel_admin:', isAdmin);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins and owners can add members' }, { status: 403 });
    }

    // Fetch the conversation to check if it's a company channel
    const { data: conv } = await supabase
      .from('user_conversations')
      .select('company_id, conversation_type, name')
      .eq('id', conversationId)
      .single();

    console.log('[add-member] conversation:', conv?.conversation_type, 'company:', conv?.company_id);

    // ── Add to conversation_participants ──
    const { error: insertError } = await supabase
      .from('conversation_participants')
      .upsert({
        conversation_id: conversationId,
        user_id: targetUserId,
        role: 'member',
      }, { onConflict: 'conversation_id, user_id' });

    if (insertError) {
      // 409 = already a member, that's fine
      if (!insertError.message?.includes('duplicate')) {
        console.error('[add-member] insert error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // ── If it's a company channel, also add to company_members ──
    if (conv?.company_id && conv?.conversation_type === 'channel') {
      console.log('[add-member] also adding to company:', conv.company_id);
      const svc = createServiceClient();

      // Check if target already has another company (one-company rule)
      const { data: existingMembership } = await svc
        .from('company_members')
        .select('company_id, status')
        .eq('user_id', targetUserId)
        .eq('status', 'active');

      if (existingMembership && existingMembership.length > 0) {
        const otherCompany = existingMembership.find(m => m.company_id !== conv.company_id);
        if (otherCompany) {
          await svc.from('company_members')
            .update({ status: 'removed', updated_at: new Date().toISOString() })
            .eq('user_id', targetUserId)
            .eq('company_id', otherCompany.company_id)
            .eq('status', 'active');
        }
      }

      // Add/update as active member in this company
      const { error: compErr } = await svc.from('company_members').upsert({
        company_id: conv.company_id,
        user_id: targetUserId,
        role: 'member',
        status: 'active',
        invited_by: user.id,
      }, { onConflict: 'company_id, user_id' });

      if (compErr) {
        console.error('[add-member] company_members error:', compErr);
      } else {
        console.log('[add-member] added to company_members');
      }

      // Update profiles.company_id
      await supabase.from('profiles')
        .update({ company_id: conv.company_id, updated_at: new Date().toISOString() })
        .eq('id', targetUserId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[add-member] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}