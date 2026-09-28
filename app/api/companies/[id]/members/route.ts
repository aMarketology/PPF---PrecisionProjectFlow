import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * Company team management.
 *
 * The company_members RLS UPDATE policy historically self-referenced the same
 * table, which caused "infinite recursion detected in policy" (HTTP 500) when
 * an owner changed a role or removed a member. These routes authorize on the
 * server and use the service-role client, so they work regardless of that
 * policy state. See supabase/FIX_COMPANY_MEMBERS_UPDATE_RLS.sql for the RLS fix.
 *
 * Authorization: the caller must be the company owner, a super admin, or an
 * active owner/admin member of the company.
 */

async function authorizeManager(companyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const service = createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (profile?.is_admin) return { service, userId: user.id };

  const { data: company } = await service
    .from('company_profiles')
    .select('id, owner_id')
    .eq('id', companyId)
    .maybeSingle();
  if (!company) return { error: NextResponse.json({ error: 'Company not found' }, { status: 404 }) };
  if (company.owner_id === user.id) return { service, userId: user.id };

  const { data: membership } = await service
    .from('company_members')
    .select('role, status')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (membership?.role === 'owner' || membership?.role === 'admin') {
    return { service, userId: user.id };
  }

  return { error: NextResponse.json({ error: 'You do not have permission to manage this company' }, { status: 403 }) };
}

// PATCH /api/companies/:id/members  { memberId, role }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeManager(params.id);
    if (auth.error) return auth.error;
    const { service } = auth;

    const body = await request.json();
    const { memberId, role } = body ?? {};
    if (!memberId || !['member', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'memberId and a valid role are required' }, { status: 400 });
    }

    // Never allow demoting the company owner.
    const { data: target } = await service
      .from('company_members')
      .select('id, role, company_id')
      .eq('id', memberId)
      .maybeSingle();
    if (!target || target.company_id !== params.id) {
      return NextResponse.json({ error: 'Member not found in this company' }, { status: 404 });
    }
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'The company owner role cannot be changed' }, { status: 400 });
    }

    const { error } = await service
      .from('company_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[company-members PATCH]', error);
    return NextResponse.json({ error: error.message || 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/companies/:id/members?memberId=...
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeManager(params.id);
    if (auth.error) return auth.error;
    const { service } = auth;

    const memberId = new URL(request.url).searchParams.get('memberId');
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 });

    const { data: target } = await service
      .from('company_members')
      .select('id, role, company_id, user_id')
      .eq('id', memberId)
      .maybeSingle();
    if (!target || target.company_id !== params.id) {
      return NextResponse.json({ error: 'Member not found in this company' }, { status: 404 });
    }
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'The company owner cannot be removed' }, { status: 400 });
    }

    const { error } = await service
      .from('company_members')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', memberId);
    if (error) throw error;

    // Remove them from the company's channels too.
    const { data: channels } = await service
      .from('user_conversations')
      .select('id')
      .eq('company_id', params.id)
      .eq('conversation_type', 'channel');
    if (channels?.length) {
      await service
        .from('conversation_participants')
        .delete()
        .eq('user_id', target.user_id)
        .in('conversation_id', channels.map(c => c.id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[company-members DELETE]', error);
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}
