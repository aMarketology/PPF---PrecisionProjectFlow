require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TARGET_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
// Use a seeded social test account that has a known password.
const TEST_EMAIL = 'maya.chen@ppf.test';
const TEST_PASSWORD = process.env.TEST_ACCOUNT_PASSWORD || 'PPF_Test_2026!';

const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, ANON);

(async () => {
  console.log('\n🔍 Account-suspension enforcement test\n');

  // 1. Find the test user id
  let page = 1;
  let targetId = null;
  while (!targetId && page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return console.log('ERR', error.message);
    const u = data.users.find(u => u.email === TEST_EMAIL);
    if (u) targetId = u.id;
    if (data.users.length < 200) break;
    page++;
  }
  if (!targetId) return console.log('❌ test user not found');

  console.log(`   Test user: ${TEST_EMAIL} (${targetId})`);

  // 2. Record original status
  const { data: prof } = await service.from('profiles').select('account_status').eq('id', targetId).single();
  const original = prof?.account_status ?? 'active';
  console.log(`   Original account_status: ${original}`);

  try {
    // 3. Suspend the account
    await service.from('profiles').update({ account_status: 'suspended' }).eq('id', targetId);
    console.log('   ✅ Set account_status = suspended');

    // 4. Verify the RPC returns false now
    const { data: isActive } = await service.rpc('is_account_active', { user_id: targetId });
    console.log(`   ${isActive === false ? '✅' : '❌'} is_account_active() = ${isActive} (expected false)`);

    // 5. Sign in as the suspended user and hit a protected API via the middleware
    const { data: auth, error: authErr } = await anon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (authErr || !auth.session) {
      console.log('   ⚠️  Could not sign in as test user:', authErr?.message);
    } else {
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('https://')[1].split('.')[0];
      const cookieName = `sb-${projectRef}-auth-token`;
      const sessionJson = JSON.stringify(auth.session);
      const cookieValue = 'base64-' + Buffer.from(sessionJson).toString('base64url');
      const cookie = `${cookieName}=${cookieValue}`;

      // 5b. API route (middleware blocks suspended accounts with a 403).
      const res = await fetch(`${TARGET_URL}/api/notifications`, {
        headers: { Cookie: cookie },
      });
      console.log(`   ${res.status === 403 ? '✅' : '❌'} Protected API returned ${res.status} (expected 403)`);

      // 6. Verify a page route redirects to /account-suspended.
      const pageRes = await fetch(`${TARGET_URL}/admin`, {
        headers: { Cookie: cookie },
        redirect: 'manual',
      });
      const loc = pageRes.headers.get('location') || '';
      console.log(`   ${loc.includes('/account-suspended') ? '✅' : '❌'} /admin redirects to ${loc || '(none)'} (cookie: ${cookieName})`);
    }
  } finally {
    // 7. Restore original status
    await service.from('profiles').update({ account_status: original }).eq('id', targetId);
    console.log(`   ✅ Restored account_status = ${original}`);
  }
})();
