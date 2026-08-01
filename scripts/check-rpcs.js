require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Check if the RPCs exist
  const rpcs = ['add_channel_member', 'is_channel_admin', 'is_channel_owner', 'update_channel', 'delete_channel', 'remove_channel_member', 'update_channel_member_role'];
  
  for (const rpc of rpcs) {
    try {
      const { data, error } = await svc.rpc(rpc, {});
      console.log(`${rpc}: ${error ? '❌ ' + error.message : '✅ exists'}`);
    } catch (e) {
      console.log(`${rpc}: ❌ ${e.message}`);
    }
  }

  // Also check the send_company_invite RPCs
  const inviteRpcs = ['send_company_invite', 'accept_company_invite', 'decline_company_invite', 'get_pending_invites'];
  for (const rpc of inviteRpcs) {
    try {
      const { data, error } = await svc.rpc(rpc, {});
      console.log(`${rpc}: ${error ? '❌ ' + error.message : '✅ exists'}`);
    } catch (e) {
      console.log(`${rpc}: ❌ ${e.message}`);
    }
  }
})();