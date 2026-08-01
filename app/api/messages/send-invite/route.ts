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

    // Verify sender is a member of this company
    const { data: membership } = await supabase
      .from('company_members')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    // Also allow the company owner
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

    // Call the RPC
    const { data, error } = await supabase.rpc('send_company_invite', {
      p_company_id: companyId,
      p_user_id: targetUserId,
      p_role: 'member',
    });

    if (error) {
      console.error('[send-invite] RPC error:', error);
      return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
    }

    if (data?.startsWith('error:')) {
      return NextResponse.json({ error: data }, { status: 400 });
    }

    if (data === 'already_member') {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    return NextResponse.json({ status: data }, { status: 201 });
  } catch (error) {
    console.error('[send-invite] error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}