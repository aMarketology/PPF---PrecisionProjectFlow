import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/messages/send-invite
// Sends a company invite to a user. Creates a system DM with Accept/Decline.
export async function POST(request: NextRequest) {
  try {
    const { companyId, targetUserId } = await request.json();
    if (!companyId || !targetUserId) {
      return NextResponse.json({ error: 'companyId and targetUserId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify sender is admin/owner of this company
    const { data: membership } = await supabase
      .from('company_members')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const { data: company } = await supabase
      .from('company_profiles')
      .select('owner_id')
      .eq('id', companyId)
      .single();

    const isOwner = company?.owner_id === user.id;
    const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only admins and owners can invite' }, { status: 403 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('company_members')
      .select('status')
      .eq('company_id', companyId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existing?.status === 'active') {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    // Upsert as 'invited'
    await supabase.from('company_members').upsert({
      company_id: companyId,
      user_id: targetUserId,
      role: 'member',
      status: 'invited',
      invited_by: user.id,
    }, { onConflict: 'company_id, user_id' });

    // Get names for the DM
    const { data: comp } = await supabase.from('company_profiles').select('company_name').eq('id', companyId).single();
    const { data: inviter } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

    // Get or create DM
    const { data: convId } = await supabase.rpc('get_or_create_conversation', {
      user_one_id: user.id,
      user_two_id: targetUserId,
    });

    if (convId) {
      await supabase.from('user_messages').insert({
        conversation_id: convId,
        sender_id: user.id,
        content: `📨 **INVITE:** You have been invited to join "${comp?.company_name || 'a company'}" by ${inviter?.full_name || 'Someone'}. **[Accept]** or **[Decline]**`,
        is_system_message: true,
        is_read: true,
        is_paid: true,
      });
      await supabase.from('user_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
    }

    return NextResponse.json({ status: 'invited' }, { status: 201 });
  } catch (error) {
    console.error('[send-invite] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}