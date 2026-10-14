require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const ADMIN_EMAIL = process.env.PPF_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PPF_ADMIN_PASSWORD;

const TARGET_EMAIL = 'vendor@ppf.test'; // known non-admin

(async () => {
  console.log('\n🔍 Promote/demote round-trip test\n');

  // Sign in as admin
  const anon = createClient(SUPABASE_URL, ANON);
  const { data: adminAuth, error: adminErr } = await anon.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (adminErr || !adminAuth.session) return console.log('❌ admin auth failed', adminErr?.message);
  const token = adminAuth.session.access_token;

  // Resolve target id
  const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  let page = 1, targetId = null;
  while (!targetId && page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return console.log('ERR', error.message);
    const u = data.users.find(u => u.email === TARGET_EMAIL);
    if (u) targetId = u.id;
    if (data.users.length < 200) break;
    page++;
  }
  if (!targetId) return console.log('❌ target not found');
  console.log(`   Target: ${TARGET_EMAIL} (${targetId})`);

  // Baseline
  const { data: before } = await service.from('profiles').select('is_admin').eq('id', targetId).single();
  console.log(`   Baseline is_admin: ${before.is_admin}`);

  async function post(action, body) {
    const res = await fetch(`${TARGET_URL}/api/admin?action=${action}&id=any`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
  }

  // Promote
  const promo = await post('promote', { email: TARGET_EMAIL });
  const { data: afterPromo } = await service.from('profiles').select('is_admin').eq('id', targetId).single();
  console.log(`   ${promo.status === 200 && afterPromo.is_admin === true ? '✅' : '❌'} promote → is_admin=true (status ${promo.status})`);

  // Demote
  const demo = await post('demote', { email: TARGET_EMAIL });
  const { data: afterDemo } = await service.from('profiles').select('is_admin').eq('id', targetId).single();
  console.log(`   ${demo.status === 200 && afterDemo.is_admin === false ? '✅' : '❌'} demote → is_admin=false (status ${demo.status})`);

  // Cleanup just in case
  await service.from('profiles').update({ is_admin: false }).eq('id', targetId);
  console.log('   ✅ Restored is_admin=false');
})();
