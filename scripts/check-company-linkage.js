import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const emails = ['maya.chen@ppf.test', 'diego.ramirez@ppf.test', 'priya.nair@ppf.test', 'sam.okafor@ppf.test', 'member@ppf.test'];
const { data: profs } = await s.from('profiles').select('id, email, company_id, job_title').in('email', emails);
console.log('PROFILES:');
for (const p of profs ?? []) console.log(`  ${p.email}  company_id=${p.company_id}  job_title=${p.job_title}`);

const ids = (profs ?? []).map(p => p.id);
const { data: mems } = await s.from('company_members').select('company_id, user_id, role, status').in('user_id', ids);
console.log('\nMEMBERSHIPS:');
for (const m of mems ?? []) {
  const p = (profs ?? []).find(x => x.id === m.user_id);
  console.log(`  ${p?.email}  company=${m.company_id}  role=${m.role}  status=${m.status}`);
}
