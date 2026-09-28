/**
 * db-fk-preflight.js - verify data integrity BEFORE adding FK constraints.
 * An ADD CONSTRAINT fails if any existing value has no matching parent row.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

async function fetchAll(table, select) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${select}&limit=10000`, { headers: H });
  if (!res.ok) return null;
  return res.json();
}

// Build id sets
const profiles = await fetchAll('profiles', 'id,company_id');
const companies = await fetchAll('company_profiles', 'id,owner_id,claimed_by');
const members = await fetchAll('company_members', 'id,user_id,company_id');

const profileIds = new Set((profiles || []).map(p => p.id));
const companyIds = new Set((companies || []).map(c => c.id));

console.log('════ PRE-FLIGHT DATA INTEGRITY ════\n');
console.log(`  profiles: ${profileIds.size}   company_profiles: ${companyIds.size}   company_members: ${members?.length ?? 0}\n`);

function check(label, rows, col, parentSet, parentName) {
  const bad = (rows || []).filter(r => r[col] != null && !parentSet.has(r[col]));
  const nulls = (rows || []).filter(r => r[col] == null).length;
  const status = bad.length === 0 ? '✅ OK' : `❌ ${bad.length} ORPHAN(S)`;
  console.log(`  ${label.padEnd(46)} ${status}  (${nulls} null)`);
  if (bad.length) {
    console.log(`     offending ${col} values: ${bad.slice(0, 5).map(b => b[col]).join(', ')}`);
  }
  return bad.length;
}

let failures = 0;
failures += check('profiles.company_id → company_profiles.id', profiles, 'company_id', companyIds, 'company_profiles');
failures += check('company_members.user_id → profiles.id', members, 'user_id', profileIds, 'profiles');
failures += check('company_members.company_id → company_profiles.id', members, 'company_id', companyIds, 'company_profiles');
failures += check('company_profiles.owner_id → profiles.id', companies, 'owner_id', profileIds, 'profiles');
failures += check('company_profiles.claimed_by → profiles.id', companies, 'claimed_by', profileIds, 'profiles');

// Other tables
for (const [table, col, parentSet, parentName] of [
  ['product_orders', 'buyer_id', profileIds, 'profiles'],
  ['rfq_offers', 'vendor_id', profileIds, 'profiles'],
  ['conversation_participants', 'user_id', profileIds, 'profiles'],
  ['user_messages', 'sender_id', profileIds, 'profiles'],
  ['feed_posts', 'author_id', profileIds, 'profiles'],
  ['site_activities', 'actor_id', profileIds, 'profiles'],
  ['token_transactions', 'user_id', profileIds, 'profiles'],
  ['company_claims', 'user_id', profileIds, 'profiles'],
]) {
  const rows = await fetchAll(table, `id,${col}`);
  if (rows === null) { console.log(`  ${table}.${col}`.padEnd(48) + '⚠️  table not readable'); continue; }
  failures += check(`${table}.${col} → ${parentName}.id`, rows, col, parentSet, parentName);
}

console.log(`\n  ${failures === 0 ? '✅ ALL CLEAR - safe to add constraints' : `❌ ${failures} integrity problem(s) - fix data before adding constraints`}`);
