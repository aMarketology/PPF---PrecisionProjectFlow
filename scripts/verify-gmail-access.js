// Sign in as precisionprojectflow@gmail.com and verify access
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('Signing in as precisionprojectflow@gmail.com...');
  const { data, error } = await anon.auth.signInWithPassword({
    email: 'precisionprojectflow@gmail.com',
    password: '123456md',
  });

  if (error) {
    console.log('❌ Sign-in error:', error.message);
    return;
  }

  const user = data.user;
  console.log('✅ Signed in!');
  console.log('   id:', user.id);
  console.log('   email:', user.email);
  console.log('   user_metadata:', JSON.stringify(user.user_metadata));

  // Check profile
  const { data: prof, error: profErr } = await anon
    .from('profiles')
    .select('id, full_name, email, user_type, token_balance, company_id')
    .eq('id', user.id)
    .single();
  if (profErr) console.log('⚠️ Profile:', profErr.message);
  else console.log('✅ Profile:', JSON.stringify(prof));

  // Check if line_items column exists now
  const { data: probe, error: probeErr } = await anon
    .from('rfqs')
    .select('line_items')
    .limit(1);
  if (probeErr && probeErr.message.includes('line_items')) {
    console.log('❌ line_items column still missing');
  } else if (probeErr) {
    console.log('⚠️ Probe:', probeErr.message);
  } else {
    console.log('✅ line_items column exists');
  }
}

main().catch(e => { console.error(e); process.exit(1); });