/**
 * audit-legacy.js — compare legacy vs current tables and test helper functions
 * with correct argument signatures.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('════ LEGACY vs CURRENT TABLES ════\n');
const PAIRS = [
  ['conversations', 'user_conversations'],
  ['messages', 'user_messages'],
  ['orders', 'product_orders'],
  ['company_team_members', 'company_members'],
  ['token_purchases', 'token_transactions'],
];
for (const [legacy, current] of PAIRS) {
  const l = await s.from(legacy).select('*', { count: 'exact', head: true });
  const c = await s.from(current).select('*', { count: 'exact', head: true });
  console.log(`  ${legacy.padEnd(24)} ${String(l.count ?? 'ERR').padStart(6)}   →   ${current.padEnd(24)} ${String(c.count ?? 'ERR').padStart(6)}`);
}

console.log('\n════ HELPER FUNCTIONS (correct signatures) ════\n');
const { data: company } = await s.from('company_profiles').select('id').eq('slug', 'northwind-precision-machining').single();
const { data: maya } = await s.from('profiles').select('id').eq('email', 'maya.chen@ppf.test').single();

const tests = [
  ['is_company_member', { company_uuid: company?.id }],
  ['is_company_manager', { p_company_id: company?.id, p_user_id: maya?.id }],
  ['is_company_owner', { p_company_id: company?.id, p_user_id: maya?.id }],
  ['is_admin', { user_id: maya?.id }],
  ['same_company', { user_a: maya?.id, user_b: maya?.id }],
];
for (const [fn, args] of tests) {
  const { data, error } = await s.rpc(fn, args);
  console.log(`  ${fn.padEnd(22)} ${error ? 'ERR: ' + error.message.slice(0, 60) : 'OK → ' + JSON.stringify(data)}`);
}

console.log('\n════ company_profiles COLUMN OVERLAP ════\n');
const { data: cp } = await s.from('company_profiles').select('*').limit(1);
const cols = Object.keys(cp?.[0] ?? {});
const aliases = ['company_name', 'name', 'address', 'street_address', 'is_verified', 'verified'];
for (const a of aliases) {
  console.log(`  ${a.padEnd(18)} ${cols.includes(a) ? '✅ exists' : '❌ missing'}`);
}
