require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Refresh the schema cache by calling a NOTIFY
  const { error } = await svc.rpc('pgrst_watch');
  console.log('Schema cache refresh:', error ? error.message : 'sent');

  // Wait a moment then check
  await new Promise(r => setTimeout(r, 2000));

  // Now test each function with proper params
  console.log('\n=== Verifying functions ===');

  const { data: tx, error: txErr } = await svc.rpc('transfer_tokens', {
    p_sender_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef',
    p_receiver_id: '8d00d160-04ad-410d-9325-edaeb0866f01',
    p_amount: 1,
    p_note: 'cache test',
  });
  console.log('transfer_tokens:', txErr ? `❌ ${txErr.message}` : `✅ ${tx}`);

  const { data: bal, error: balErr } = await svc.rpc('get_company_balance', {
    p_company_id: '4a2ef5d4-8461-457e-b81c-32883001c3be',
  });
  console.log('get_company_balance:', balErr ? `❌ ${balErr.message}` : `✅ ${bal}`);

  // Check trigger
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/check_trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  console.log('\nIf functions still missing, you need to run these in Supabase SQL Editor:');
  console.log('  1. supabase/ADD_AUTO_JOIN_CHANNEL_MSG.sql');
  console.log('  2. supabase/TOKEN_TRANSFERS.sql');
})();