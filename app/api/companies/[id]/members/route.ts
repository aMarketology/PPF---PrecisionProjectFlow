import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendCompanyInviteEmail, sendOwnershipTransferEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/** Resolve the current user from cookie OR Bearer token. */
async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const service = createServiceClient();
      const { data: { user }, error } = await service.auth.getUser(token);
      if (!error && user) return user;
    }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

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

async function authorizeManager(companyId: string, request: NextRequest) {
  const user = await getCurrentUser(request);
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

/** Same as authorizeManager, but returns the full company + profile (needed for transfer + invites). */
async function authorizeOwner(companyId: string, request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const service = createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('is_admin, full_name, email')
    .eq('id', user.id)
    .single();

  const { data: company } = await service
    .from('company_profiles')
    .select('id, company_name, owner_id, email')
    .eq('id', companyId)
    .maybeSingle();
  if (!company) return { error: NextResponse.json({ error: 'Company not found' }, { status: 404 }) };

  // Owner can be expressed on company_profiles.owner_id OR via an
  // active company_members row with role='owner' (the latter is the
  // source of truth when owner_id has drifted null).
  const { data: ownerMembership } = await service
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('role', 'owner')
    .maybeSingle();

  const isOwner = company.owner_id === user.id || !!ownerMembership || profile?.is_admin;
  if (!isOwner) {
    return { error: NextResponse.json({ error: 'Only the company owner can perform this action' }, { status: 403 }) };
  }

  return { service, userId: user.id, user, profile, company };
}

// POST /api/companies/:id/members
//   { action: 'invite-email', email, role, accountType } → create pending invite + email
//   { action: 'transfer-ownership', memberId }            → transfer owner role
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeOwner(params.id, request);
    if (auth.error) return auth.error;
    const { service, userId, profile, company } = auth;

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    // ── Email invitation ────────────────────────────────────────────
    if (action === 'invite-email') {
      const email = (body.email ?? '').trim().toLowerCase();
      const role = ['owner', 'admin', 'member'].includes(body.role) ? body.role : 'member';
      const accountType = body.accountType === 'client' ? 'client' : 'engineer';

      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
      }

      // If a profile already exists for this email, fall back to a direct
      // member invite (no signup needed).
      const { data: existingProfile } = await service
        .from('profiles')
        .select('id, full_name')
        .ilike('email', email)
        .maybeSingle();

      if (existingProfile?.id) {
        const { error: rpcErr, data: rpcResult } = await service.rpc('send_company_invite', {
          p_company_id: params.id,
          p_user_id: existingProfile.id,
          p_role: role,
        });
        if (rpcErr) throw rpcErr;
        if (rpcResult === 'already_member' || rpcResult === 'active') {
          return NextResponse.json({ method: 'existing', message: `${email} is already a member of this company.` });
        }
        return NextResponse.json({ method: 'dm', message: `Invitation sent to ${email}` });
      }

      // No account yet — record a pending invite and email a signup link.
      const token = crypto.randomUUID();
      const { error: insertErr } = await service.from('company_invitations').insert({
        company_id: params.id,
        email,
        role,
        account_type: accountType,
        token,
        invited_by: userId,
      });
      if (insertErr) throw insertErr;

      const inviteeName = email.split('@')[0].replace(/[._-]+/g, ' ');
      await sendCompanyInviteEmail({
        to: email,
        inviteeName,
        companyName: company.company_name,
        accountType,
        inviteToken: token,
      }).catch((e) => console.error('[email] company invite failed:', e));

      return NextResponse.json({ method: 'email', message: `Invitation emailed to ${email}` });
    }

    // ── Ownership transfer ──────────────────────────────────────────
    if (action === 'transfer-ownership') {
      const memberId = body.memberId;
      if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 });

      const { data: target } = await service
        .from('company_members')
        .select('id, user_id, role, company_id')
        .eq('id', memberId)
        .maybeSingle();
      if (!target || target.company_id !== params.id) {
        return NextResponse.json({ error: 'Member not found in this company' }, { status: 404 });
      }
      if (target.role === 'owner') {
        return NextResponse.json({ error: 'This member is already the owner' }, { status: 400 });
      }

      // The company_members table is the source of truth for the owner role.
      // Demote every existing active owner row (there should normally be one)
      // to admin, then promote the target to owner.
      await service
        .from('company_members')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('company_id', params.id)
        .eq('status', 'active')
        .eq('role', 'owner');

      await service
        .from('company_members')
        .update({ role: 'owner', updated_at: new Date().toISOString() })
        .eq('id', memberId);

      // Sync the canonical owner_id on the company profile.
      await service
        .from('company_profiles')
        .update({ owner_id: target.user_id, updated_at: new Date().toISOString() })
        .eq('id', params.id);

      // Notify the new owner.
      const { data: newOwner } = await service
        .from('profiles')
        .select('full_name, email')
        .eq('id', target.user_id)
        .maybeSingle();
      if (newOwner?.email) {
        await sendOwnershipTransferEmail({
          to: newOwner.email,
          recipientName: newOwner.full_name || 'there',
          companyName: company.company_name,
        }).catch((e) => console.error('[email] ownership transfer failed:', e));
      }

      return NextResponse.json({ success: true, message: `Ownership transferred to ${newOwner?.full_name || 'the new owner'}` });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[company-members POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}

// PATCH /api/companies/:id/members  { memberId, role }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeManager(params.id, request);
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
    const auth = await authorizeManager(params.id, request);
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
