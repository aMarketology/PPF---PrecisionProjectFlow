/**
 * verify-seed-attachments.js
 * Read-only check that every seeded test account is attached to a real,
 * claimed company profile with an active owner membership.
 *
 * Run: node scripts/verify-seed-attachments.js
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMAILS = [
  'maya.chen@ppf.test',
  'diego.ramirez@ppf.test',
  'priya.nair@ppf.test',
  'sam.okafor@ppf.test',
];

const { data: profiles, error: pErr } = await supabase
  .from('profiles')
  .select('id, email, full_name, company_id')
  .in('email', EMAILS);
if (pErr) { console.error('profiles error:', pErr.message); process.exit(1); }

const ids = (profiles ?? []).map(p => p.id);

const { data: memberships } = await supabase
  .from('company_members')
  .select('company_id, user_id, role, status')
  .in('user_id', ids);

const { data: companies } = await supabase
  .from('company_profiles')
  .select('id, company_name, slug, owner_id, is_claimed, is_verified')
  .in('owner_id', ids);

const byUser = new Map((memberships ?? []).map(m => [m.user_id, m]));
const companyByOwner = new Map((companies ?? []).map(c => [c.owner_id, c]));

let ok = 0;
for (const email of EMAILS) {
  const p = (profiles ?? []).find(x => x.email === email);
  if (!p) { console.log(`❌ ${email}: no profile`); continue; }
  const m = byUser.get(p.id);
  const c = companyByOwner.get(p.id);
  const attached = !!m && m.status === 'active' && !!c && c.is_claimed;
  const profileLinked = p.company_id && c && p.company_id === c.id;
  if (attached && profileLinked) {
    ok++;
    console.log(`✅ ${email}`);
    console.log(`   company: ${c.company_name} (${c.slug}) claimed=${c.is_claimed} verified=${c.is_verified}`);
    console.log(`   role: ${m.role} · profiles.company_id linked: yes`);
  } else {
    console.log(`⚠️  ${email}`);
    console.log(`   membership: ${m ? `${m.role}/${m.status}` : 'MISSING'}`);
    console.log(`   company: ${c ? `${c.company_name} claimed=${c.is_claimed}` : 'MISSING'}`);
    console.log(`   profiles.company_id: ${p.company_id ?? 'null'} (expected ${c?.id ?? 'n/a'})`);
  }
}

console.log(`\n${ok}/${EMAILS.length} accounts fully attached to a claimed company.`);
