import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Live columns + a sample row
const { data: sample, error } = await s.from('profiles').select('*').limit(1);
console.log('COLUMNS:', error ? error.message : Object.keys(sample?.[0] ?? {}).join(', '));
console.log('SAMPLE:', JSON.stringify(sample?.[0], null, 2));

// 2. Row count + user_type distribution
const { count } = await s.from('profiles').select('*', { count: 'exact', head: true });
console.log('\nTOTAL PROFILES:', count);

const { data: all } = await s.from('profiles').select('id, user_type, is_admin, company_id, job_title');
const byType = {};
let admins = 0, linked = 0, titled = 0;
for (const p of all ?? []) {
  byType[p.user_type ?? 'null'] = (byType[p.user_type ?? 'null'] ?? 0) + 1;
  if (p.is_admin) admins++;
  if (p.company_id) linked++;
  if (p.job_title) titled++;
}
console.log('BY user_type:', JSON.stringify(byType));
console.log(`is_admin: ${admins} · company_id set: ${linked} · job_title set: ${titled}`);

// 3. Which auth users lack a profile row?
const { data: authUsers } = await s.auth.admin.listUsers({ page: 1, perPage: 200 });
const profileIds = new Set((all ?? []).map(p => p.id));
const missing = (authUsers?.users ?? []).filter(u => !profileIds.has(u.id));
console.log(`\nAUTH USERS: ${authUsers?.users.length ?? 0} · missing profile row: ${missing.length}`);
for (const m of missing.slice(0, 10)) console.log(`  ${m.email}`);
