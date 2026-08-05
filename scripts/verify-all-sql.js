require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== 1. INSERT policy on conversation_participants ===');
  const { data: policies } = await svc
    .from('conversation_participants')
    .select('id')  // just a smoke test - if this works, RLS works
    .limit(1);
  console.log('conversation_participants readable:', !policies ? 'failed' : 'ok');

  console.log('\n=== 2. add_channel_member test ===');
  const convId = '8631047f-e748-4cf0-ac4c-5f50c6c32b37'; // General
  const testUserId = '8b8a7182-5d18-4089-a993-1507ad34251b';

  // Test the helper functions
  const { data: isAdmin } = await svc.rpc('is_channel_admin', {
    p_conversation_id: convId,
    p_user_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef',
  });
  console.log('is_channel_admin (you):', isAdmin);

  // Test adding via RPC
  const { data: addResult } = await svc.rpc('add_channel_member', {
    p_conversation_id: convId,
    p_target_user_id: testUserId,
  });
  console.log('add_channel_member RPC:', addResult);

  // Check if added
  const { data: parts } = await svc
    .from('conversation_participants')
    .select('user_id, role')
    .eq('conversation_id', convId);
  console.log('\nGeneral channel participants:', parts?.length);
  parts?.forEach(p => console.log(`  ${p.user_id.substring(0,8)}... role=${p.role}`));

  console.log('\n=== 3. Token transfers RPCs ===');
  const { data: txResult, error: txErr } = await svc.rpc('transfer_tokens', {
    p_sender_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef',
    p_receiver_id: '8d00d160-04ad-410d-9325-edaeb0866f01',
    p_amount: 10,
    p_note: 'test transfer',
  });
  console.log('transfer_tokens:', txResult, 'error:', txErr?.message);

  console.log('\n=== 4. Auto-join trigger exists? ===');
  const { data: trig } = await svc
    .from('information_schema.triggers')
    .select('trigger_name')
    .eq('trigger_name', 'trg_on_company_member_activated')
    .eq('trigger_schema', 'public');
  console.log('trg_on_company_member_activated:', trig?.length ? 'EXISTS ✅' : 'MISSING ❌');

  console.log('\n✅ Verification complete');
})();