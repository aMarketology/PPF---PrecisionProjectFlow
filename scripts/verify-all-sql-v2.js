require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // List ALL functions in public schema
  console.log('=== Checking functions via named params ===\n');

  // transfer_tokens with explicit param names (forces cache refresh)
  const tests = [
    { name: 'transfer_tokens', params: { p_sender_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef', p_receiver_id: '8d00d160-04ad-410d-9325-edaeb0866f01', p_amount: 1, p_note: 'test' } },
    { name: 'get_company_balance', params: { p_company_id: '4a2ef5d4-8461-457e-b81c-32883001c3be' } },
    { name: 'on_company_member_activated', params: {} },
    { name: 'is_channel_admin', params: { p_conversation_id: '8631047f-e748-4cf0-ac4c-5f50c6c32b37', p_user_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef' } },
  ];

  for (const t of tests) {
    const { data, error } = await svc.rpc(t.name, t.params);
    const status = error ? `❌ ${error.message.substring(0,80)}` : `✅ ${JSON.stringify(data)}`;
    console.log(`${t.name}: ${status}`);
  }

  // Check triggers
  console.log('\n=== Checking triggers ===');
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/list_triggers`, {
    headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  console.log('Triggers:', res.status);
})();