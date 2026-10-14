require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const ADMIN_EMAIL = process.env.PPF_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PPF_ADMIN_PASSWORD;

// The "Texas Web Service" company from the user's screenshot (owner = Max Real).
const COMPANY_ID = '6a82b48a-01e7-4e43-985f-422a5c12e811';

(async () => {
  console.log('\n🔍 Company invite + transfer flow test\n');

  const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // The company owner is max@amarketology.com, but its password is stale.
  // Use a super admin (precisionprojectflow@gmail.com) which authorizeOwner allows.
  const anon = createClient(SUPABASE_URL, ANON);
  const { data: auth, error: authErr } = await anon.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (authErr || !auth.session) return console.log('❌ admin auth failed', authErr?.message);
  const token = auth.session.access_token;

  async function post(body) {
    const res = await fetch(`${TARGET_URL}/api/companies/${COMPANY_ID}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
  }

  // 1. Email invite (new account, no profile exists)
  const testEmail = `invitee+${Date.now()}@example.com`;
  const invite = await post({ action: 'invite-email', email: testEmail, role: 'member', accountType: 'engineer' });
  console.log(`   ${invite.status === 200 && invite.data.method === 'email' ? '✅' : '❌'} email invite → ${JSON.stringify(invite.data)}`);

  // Verify a pending invitation row was written
  const { data: invRow } = await service.from('company_invitations').select('id, token, status, account_type').eq('email', testEmail).maybeSingle();
  console.log(`   ${invRow?.status === 'pending' ? '✅' : '❌'} pending invitation row exists (token: ${invRow?.token ? 'yes' : 'no'}, account_type: ${invRow?.account_type})`);

  // 2. Email invite for an EXISTING account → should fall back to DM invite
  const existing = await post({ action: 'invite-email', email: 'maya.chen@ppf.test', role: 'member', accountType: 'engineer' });
  console.log(`   ${existing.status === 200 && (existing.data.method === 'dm' || existing.data.method === 'existing') ? '✅' : '❌'} existing-account invite → ${JSON.stringify(existing.data)}`);

  // 3. Ownership transfer to a member (need a non-owner member in this company)
  const { data: members } = await service.from('company_members').select('id, role, user_id').eq('company_id', COMPANY_ID).eq('status', 'active');
  const nonOwner = (members || []).find(m => m.role !== 'owner');
  if (nonOwner) {
    const transfer = await post({ action: 'transfer-ownership', memberId: nonOwner.id });
    console.log(`   ${transfer.status === 200 ? '✅' : '❌'} ownership transfer → ${JSON.stringify(transfer.data)}`);
    // Verify owner_id changed
    const { data: company } = await service.from('company_profiles').select('owner_id').eq('id', COMPANY_ID).single();
    console.log(`   ${company?.owner_id === nonOwner.user_id ? '✅' : '❌'} owner_id updated to ${nonOwner.user_id}`);

    // Transfer back to the original owner to leave things as they were
    const { data: originalOwner } = await service.from('company_profiles').select('owner_id').eq('id', COMPANY_ID).single();
    // Find the original owner's membership row (now role='admin')
    const { data: originalMember } = await service.from('company_members').select('id').eq('company_id', COMPANY_ID).eq('user_id', originalOwner?.owner_id ?? '').maybeSingle();
    // Actually the original owner is now admin, and the new owner is nonOwner.user_id.
    // Transfer back:
    if (originalMember?.id && originalOwner?.owner_id) {
      // new owner membership row
      const { data: newOwnerMember } = await service.from('company_members').select('id').eq('company_id', COMPANY_ID).eq('user_id', nonOwner.user_id).maybeSingle();
      if (newOwnerMember?.id) {
        // transfer back to original owner requires original owner to be the caller; since we're super admin this works
        const back = await post({ action: 'transfer-ownership', memberId: originalMember.id });
        console.log(`   ${back.status === 200 ? '✅' : '❌'} transfer back to original owner → ${JSON.stringify(back.data)}`);
      }
    }
  } else {
    console.log('   ⏭️  No non-owner member to transfer to (single-member company)');
  }

  // Cleanup the test invitation
  if (invRow) {
    await service.from('company_invitations').delete().eq('id', invRow.id);
    console.log('   ✅ Cleaned up test invitation');
  }
})();
