// Check access: user existence + rfqs table columns via service role REST API
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Find the precisionprojectflow@gmail.com user
  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.log('❌ Auth listUsers error:', usersErr.message);
    return;
  }
  console.log(`Total auth users: ${users?.users?.length ?? 0}`);

  const target = (users?.users ?? []).find(u =>
    u.email?.toLowerCase() === 'precisionprojectflow@gmail.com'
  );
  if (!target) {
    console.log('❌ precisionprojectflow@gmail.com NOT found in auth.users');
    // Show first few emails to help
    (users?.users ?? []).slice(0, 10).forEach(u => console.log('  -', u.email));
    return;
  }
  console.log(`✅ Found user: ${target.email} | id: ${target.id}`);
  console.log('   user_metadata:', JSON.stringify(target.user_metadata));

  // 2. Check if profile exists
  const { data: prof, error: profErr } = await supabase
    .from('profiles').select('id, full_name, email, user_type, token_balance')
    .eq('id', target.id).single();
  if (profErr) {
    console.log('⚠️ Profile lookup:', profErr.message);
  } else {
    console.log('✅ Profile:', JSON.stringify(prof));
  }

  // 3. Check rfqs columns (try selecting line_items to see if column exists)
  const { data: probe, error: probeErr } = await supabase
    .from('rfqs').select('line_items').limit(1);
  if (probeErr && probeErr.message.includes('line_items')) {
    console.log('❌ line_items column does NOT exist yet: need migration');
  } else if (probeErr) {
    console.log('⚠️ Probe error:', probeErr.message);
  } else {
    console.log('✅ line_items column EXISTS (probe ok):', JSON.stringify(probe));
  }

  // 4. Check existing RFQs count + the newest few
  const { data: rfqs, error: rfqErr } = await supabase
    .from('rfqs').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5);
  if (rfqErr) console.log('⚠️ RFQ list error:', rfqErr.message);
  else {
    console.log(`\nLatest RFQs (${rfqs.length}):`);
    rfqs.forEach(r => console.log(`  - ${r.title} | ${r.status} | ${r.created_at}`));
  }

  // 5. Check total RFQ count
  const { count, error: countErr } = await supabase
    .from('rfqs').select('*', { count: 'exact', head: true });
  if (countErr) console.log('⚠️ Count error:', countErr.message);
  else console.log(`\nTotal RFQs in DB: ${count}`);
}

main();
