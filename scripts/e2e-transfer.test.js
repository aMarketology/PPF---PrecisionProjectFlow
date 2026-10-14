require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const ADMIN_EMAIL = process.env.PPF_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PPF_ADMIN_PASSWORD;
const COMPANY_ID = '4a2ef5d4-8461-457e-b81c-32883001c3be';

(async () => {
  console.log('\n🔍 Ownership transfer round-trip (v2)\n');
  const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: membersBefore } = await service.from('company_members')
    .select('id, user_id, role, status')
    .eq('company_id', COMPANY_ID)
    .eq('status', 'active');
  const ownerBefore = membersBefore.find(m => m.role === 'owner');
  const nonOwner = membersBefore.find(m => m.role !== 'owner');
  if (!ownerBefore || !nonOwner) return console.log('❌ need one owner + one non-owner');
  console.log(`   Real owner: ${ownerBefore.user_id} | Transfer-to: ${nonOwner.user_id} (${nonOwner.role})`);

  const anon = createClient(SUPABASE_URL, ANON);
  const { data: auth, error: authErr } = await anon.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (authErr || !auth.session) return console.log('❌ auth failed', authErr?.message);
  const token = auth.session.access_token;

  async function transfer(memberId) {
    const res = await fetch(`${TARGET_URL}/api/companies/${COMPANY_ID}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'transfer-ownership', memberId }),
    });
    return { status: res.status, data: await res.json() };
  }

  const t1 = await transfer(nonOwner.id);
  const { data: after1 } = await service.from('company_members')
    .select('id, user_id, role').eq('company_id', COMPANY_ID).eq('status', 'active');
  const newOwner = after1.find(m => m.role === 'owner');
  console.log(`   ${t1.status === 200 && newOwner?.user_id === nonOwner.user_id ? '✅' : '❌'} transfer → ${newOwner?.user_id} (status ${t1.status})`);

  const t2 = await transfer(ownerBefore.id);
  const { data: after2 } = await service.from('company_members')
    .select('id, user_id, role').eq('company_id', COMPANY_ID).eq('status', 'active');
  const restoredOwner = after2.find(m => m.role === 'owner');
  console.log(`   ${t2.status === 200 && restoredOwner?.user_id === ownerBefore.user_id ? '✅' : '❌'} transfer back → ${restoredOwner?.user_id} (status ${t2.status})`);

  const owners = after2.filter(m => m.role === 'owner');
  console.log(`   ${owners.length === 1 ? '✅' : '❌'} exactly one owner (found ${owners.length})`);
  console.log('   ✅ State restored');
})();
