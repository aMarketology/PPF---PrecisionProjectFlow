/**
 * db-fk-targets.js - determine what each FK actually references.
 * PostgREST reports the searched relationship in the error detail.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

const COLS = [
  ['profiles', 'company_id'],
  ['company_members', 'user_id'],
  ['company_profiles', 'owner_id'],
  ['product_orders', 'buyer_id'],
  ['rfq_offers', 'vendor_id'],
  ['user_conversations', 'company_id'],
  ['conversation_participants', 'user_id'],
  ['user_messages', 'sender_id'],
  ['feed_posts', 'author_id'],
  ['site_activities', 'actor_id'],
  ['token_transactions', 'user_id'],
  ['company_claims', 'user_id'],
  ['orders', 'client_id'],
  ['rfqs', 'client_id'],
  ['services', 'provider_id'],
];

console.log('════ FK TARGETS (via PostgREST error detail) ════\n');
for (const [table, col] of COLS) {
  const res = await fetch(
    `${url}/rest/v1/${table}?select=profiles!${table}_${col}_fkey(id)&limit=1`,
    { headers: H }
  );
  const body = await res.json().catch(() => ({}));
  const detail = body?.details ?? body?.message ?? '';
  // Extract the hint about which table it found
  const m = detail.match(/between '([^']+)' and '([^']+)'/);
  const found = m ? `${m[1]} ↔ ${m[2]}` : (res.ok ? 'profiles ✅' : 'unknown');
  console.log(`  ${table}.${col}`.padEnd(42) + found);
}
