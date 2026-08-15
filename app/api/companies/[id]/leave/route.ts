import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

// POST /api/companies/:id/leave
// Removes the authenticated user from a company and its company channels.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createServiceClient();
    const { data: company, error: companyError } = await service
      .from('company_profiles')
      .select('id, owner_id')
      .eq('id', params.id)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    const { data: membership, error: membershipError } = await service
      .from('company_members')
      .select('id, role')
      .eq('company_id', company.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return NextResponse.json({ error: 'You are not an active company member' }, { status: 404 });
    const { error: leaveError } = await service
      .from('company_members')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', membership.id);
    if (leaveError) throw leaveError;

    const { data: channels, error: channelError } = await service
      .from('user_conversations')
      .select('id')
      .eq('company_id', company.id)
      .eq('conversation_type', 'channel');
    if (channelError) throw channelError;

    if (channels?.length) {
      const { error: participantError } = await service
        .from('conversation_participants')
        .delete()
        .eq('user_id', user.id)
        .in('conversation_id', channels.map(channel => channel.id));
      if (participantError) throw participantError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[leave-company] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to leave company' }, { status: 500 });
  }
}