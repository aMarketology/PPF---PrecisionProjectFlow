require('dotenv').config({ path: '.env.local' });

// Step 1: Check if the user is actually an admin/owner
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const userId = '4009681a-e413-47e4-aac8-2eb4ec2f30ef';
  const companyId = '4a2ef5d4-8461-457e-b81c-32883001c3be';
  const channelId = '8631047f-e748-4cf0-ac4c-5f50c6c32b37';

  console.log('=== 1. Company Membership ===');
  const { data: member } = await svc.from('company_members')
    .select('*').eq('company_id', companyId).eq('user_id', userId).single();
  console.log(JSON.stringify(member, null, 2));

  console.log('\n=== 2. Channel Role ===');
  const { data: part } = await svc.from('conversation_participants')
    .select('*').eq('conversation_id', channelId).eq('user_id', userId).single();
  console.log(JSON.stringify(part, null, 2));

  console.log('\n=== 3. is_channel_admin RPC ===');
  const { data: isAdmin } = await svc.rpc('is_channel_admin', {
    p_conversation_id: channelId,
    p_user_id: userId,
  });
  console.log('is_channel_admin:', isAdmin);

  console.log('\n=== 4. is_channel_owner RPC ===');
  const { data: isOwner } = await svc.rpc('is_channel_owner', {
    p_conversation_id: channelId,
    p_user_id: userId,
  });
  console.log('is_channel_owner:', isOwner);

  // Step 2: Test the add-member route by calling it locally
  console.log('\n=== 5. Test add-member API (simulated auth) ===');
  try {
    const res = await fetch('http://localhost:3001/api/messages/add-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: channelId,
        targetUserId: '8d00d160-04ad-410d-9325-edaeb0866f01',
      }),
    });
    const d = await res.json();
    console.log('Status:', res.status, JSON.stringify(d));
  } catch (e) {
    console.log('API call failed (expected - no auth):', e.message);
  }

  // Step 3: Test send-invite route
  console.log('\n=== 6. Test send-invite API (simulated auth) ===');
  try {
    const res = await fetch('http://localhost:3001/api/messages/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId,
        targetUserId: '8d00d160-04ad-410d-9325-edaeb0866f01',
      }),
    });
    const d = await res.json();
    console.log('Status:', res.status, JSON.stringify(d));
  } catch (e) {
    console.log('API call failed (expected - no auth):', e.message);
  }

  console.log('\n=== 7. All company members ===');
  const { data: allMembers } = await svc.from('company_members')
    .select('user_id, role, status').eq('company_id', companyId);
  allMembers.forEach(m => console.log(`  ${m.user_id.substring(0,8)}... role=${m.role} status=${m.status}`));
})();