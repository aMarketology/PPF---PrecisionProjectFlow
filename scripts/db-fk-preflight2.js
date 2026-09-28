/**
 * db-fk-preflight2.js - verify integrity for the parent-table FKs
 * (conversation_id, rfq_id, service_id, product_id) before retargeting.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

const get = async (p) => {
  const r = await fetch(`${url}/rest/v1/${p}`, { headers: H });
  return r.ok ? r.json() : null;
};
const ids = async (t) => new Set(((await get(`${t}?select=id&limit=20000`)) || []).map(r => r.id));

const convIds  = await ids('user_conversations');
const rfqIds   = await ids('rfqs');
const svcIds   = await ids('services');
const prodIds  = await ids('products');
const orderIds = await ids('orders');

console.log('════ PARENT-TABLE FK PRE-FLIGHT ════\n');
console.log(`  user_conversations:${convIds.size}  rfqs:${rfqIds.size}  services:${svcIds.size}  products:${prodIds.size}  orders:${orderIds.size}\n`);

const CHECKS = [
  ['conversation_participants', 'conversation_id', convIds, 'user_conversations'],
  ['user_messages', 'conversation_id', convIds, 'user_conversations'],
  ['rfq_offers', 'rfq_id', rfqIds, 'rfqs'],
  ['orders', 'service_id', svcIds, 'services'],
  ['products', 'company_id', prodIds, 'products'], // placeholder, skipped
];

let fail = 0;
for (const [table, col, parent, pname] of CHECKS) {
  if (table === 'products') continue;
  const rows = await get(`${table}?select=id,${col}&limit=20000`);
  if (!rows) { console.log(`  ${table}.${col}`.padEnd(46) + '⚠️ unreadable'); continue; }
  const bad = rows.filter(r => r[col] != null && !parent.has(r[col]));
  console.log(`  ${table}.${col} → ${pname}`.padEnd(46) + (bad.length === 0 ? '✅ OK' : `❌ ${bad.length} orphan`) + `  (${rows.filter(r => r[col] == null).length} null)`);
  fail += bad.length;
}
console.log(`\n  ${fail === 0 ? '✅ ALL PARENT FKs CLEAR' : `❌ ${fail} orphan(s)`}`);