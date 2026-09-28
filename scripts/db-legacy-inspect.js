/**
 * db-legacy-inspect.js - inspect the actual contents of legacy tables
 * before dropping them, and capture full FK error details.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: H });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, body };
}

console.log('════ LEGACY TABLE CONTENTS ════\n');
for (const t of ['conversations', 'messages', 'token_purchases']) {
  const { ok, body } = await get(`${t}?select=*&limit=5`);
  const count = Array.isArray(body) ? body.length : 0;
  console.log(`── ${t}  (${ok ? count + ' row(s) shown' : 'error'})`);
  if (Array.isArray(body) && body.length) {
    console.log(JSON.stringify(body, null, 2).split('\n').slice(0, 40).join('\n'));
  }
  console.log('');
}

// ── Full FK error detail for the columns we plan to retarget ─────────────
console.log('════ FULL FK ERROR DETAIL (what PostgREST searched) ════\n');
const COLS = [
  ['profiles', 'company_id'],
  ['company_members', 'user_id'],
  ['company_members', 'company_id'],
  ['company_profiles', 'owner_id'],
  ['product_orders', 'buyer_id'],
  ['rfq_offers', 'vendor_id'],
  ['conversation_participants', 'user_id'],
  ['user_messages', 'sender_id'],
  ['feed_posts', 'author_id'],
  ['site_activities', 'actor_id'],
  ['token_transactions', 'user_id'],
  ['company_claims', 'user_id'],
];
for (const [table, col] of COLS) {
  const res = await fetch(
    `${url}/rest/v1/${table}?select=profiles!${table}_${col}_fkey(id)&limit=1`,
    { headers: H }
  );
  const body = await res.json().catch(() => ({}));
  console.log(`  ${table}.${col}`);
  console.log(`     ${body?.code || 'OK'} - ${(body?.details || body?.message || 'resolved').slice(0, 160)}`);
}
