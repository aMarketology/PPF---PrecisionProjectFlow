import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// POST /api/messages/send-invite
// Sends a company invite to a user. Creates a system DM with Accept/Decline.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, targetUserId } = body;
    console.log('[send-invite] received:', { companyId, targetUserId });

    if (!companyId || !targetUserId) {
      console.log('[send-invite] missing params');
      return NextResponse.json({ error: 'companyId and targetUserId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[send-invite] auth user:', user?.id, user?.email);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Use service client to bypass recursive RLS on company_members
    const svc = createServiceClient();

    // Verify sender is admin/owner of this company
    const { data: membership } = await svc
      .from('company_members')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    console.log('[send-invite] membership:', membership);

    const { data: company } = await svc
      .from('company_profiles')
      .select('owner_id')
      .eq('id', companyId)
      .single();
    console.log('[send-invite] company owner:', company?.owner_id);

    const isOwner = company?.owner_id === user.id;
    const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';
    console.log('[send-invite] isOwner:', isOwner, 'isAdmin:', isAdmin);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only admins and owners can invite' }, { status: 403 });
    }

    // Check if already a member
    const { data: existing } = await svc
      .from('company_members')
      .select('status')
      .eq('company_id', companyId)
      .eq('user_id', targetUserId)
      .maybeSingle();
    console.log('[send-invite] existing:', existing);

    if (existing?.status === 'active') {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    // Upsert as 'invited'
    const { error: upsertErr } = await svc.from('company_members').upsert({
      company_id: companyId,
      user_id: targetUserId,
      role: 'member',
      status: 'invited',
      invited_by: user.id,
    }, { onConflict: 'company_id, user_id' });
    if (upsertErr) {
      console.error('[send-invite] upsert error:', upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    console.log('[send-invite] upserted as invited');

    // Get names for the DM
    const { data: comp } = await supabase.from('company_profiles').select('company_name').eq('id', companyId).single();
    const { data: inviter } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    console.log('[send-invite] company:', comp?.company_name, 'inviter:', inviter?.full_name);

    // Get or create DM
    const { data: convId } = await supabase.rpc('get_or_create_conversation', {
      user_one_id: user.id,
      user_two_id: targetUserId,
    });
    console.log('[send-invite] conversation:', convId);

    if (convId) {
      const { error: msgErr } = await supabase.from('user_messages').insert({
        conversation_id: convId,
        sender_id: user.id,
        content: `📨 **INVITE:** You have been invited to join "${comp?.company_name || 'a company'}" by ${inviter?.full_name || 'Someone'}. **[Accept]** or **[Decline]**`,
        is_system_message: true,
        is_read: true,
        is_paid: true,
      });
      if (msgErr) console.error('[send-invite] message insert error:', msgErr);
      else console.log('[send-invite] message inserted');

      await supabase.from('user_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
    }

    console.log('[send-invite] success');
    return NextResponse.json({ status: 'invited' }, { status: 201 });
  } catch (error) {
    console.error('[send-invite] exception:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}