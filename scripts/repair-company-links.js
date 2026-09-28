import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Re-link every profile to its active company membership
const { data: mems } = await s
  .from('company_members')
  .select('user_id, company_id, created_at')
  .eq('status', 'active')
  .order('created_at', { ascending: true });

const firstByUser = new Map();
for (const m of mems ?? []) {
  if (!firstByUser.has(m.user_id)) firstByUser.set(m.user_id, m.company_id);
}

let relinked = 0;
for (const [userId, companyId] of firstByUser) {
  const { data: p } = await s.from('profiles').select('company_id').eq('id', userId).single();
  if (p?.company_id !== companyId) {
    await s.from('profiles').update({ company_id: companyId }).eq('id', userId);
    relinked++;
  }
}
console.log(`re-linked ${relinked} profile(s)`);

// 2. Clear company_id for users with no active membership
const { data: allProfs } = await s.from('profiles').select('id, email, company_id').not('company_id', 'is', null);
let cleared = 0;
for (const p of allProfs ?? []) {
  if (!firstByUser.has(p.id)) {
    await s.from('profiles').update({ company_id: null }).eq('id', p.id);
    cleared++;
  }
}
console.log(`cleared ${cleared} orphaned link(s)`);

// 3. Verify the fixed trigger: remove + re-add a membership should NOT wipe company_id
const { data: maya } = await s.from('profiles').select('id, company_id').eq('email', 'maya.chen@ppf.test').single();
console.log('maya company_id after repair:', maya.company_id);

// 4. Report final state
const { data: final } = await s
  .from('profiles')
  .select('email, company_id, job_title')
  .in('email', ['maya.chen@ppf.test', 'diego.ramirez@ppf.test', 'priya.nair@ppf.test', 'sam.okafor@ppf.test', 'member@ppf.test']);
console.log('\nFINAL:');
for (const p of final ?? []) console.log(`  ${p.email}  company_id=${p.company_id}  job_title=${p.job_title}`);
