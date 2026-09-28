/**
 * db-fk-enumerate.js — brute-force enumerate FK constraint names + targets
 * by probing PostgREST embeds, and check for legacy table existence.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

async function probe(table, embed) {
  const res = await fetch(
    `${url}/rest/v1/${table}?select=${encodeURIComponent(embed)}&limit=1`,
    { headers: H }
  );
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, detail: body?.details || body?.message || '' };
}

// ── 1. Enumerate FK targets for every user/company reference column ──────
const COLS = [
  ['profiles', 'company_id'],
  ['company_members', 'user_id'],
  ['company_members', 'company_id'],
  ['company_members', 'invited_by'],
  ['company_profiles', 'owner_id'],
  ['company_profiles', 'claimed_by'],
  ['product_orders', 'buyer_id'],
  ['product_orders', 'company_id'],
  ['rfq_offers', 'vendor_id'],
  ['rfq_offers', 'rfq_id'],
  ['user_conversations', 'company_id'],
  ['user_conversations', 'created_by'],
  ['conversation_participants', 'user_id'],
  ['conversation_participants', 'conversation_id'],
  ['user_messages', 'sender_id'],
  ['user_messages', 'conversation_id'],
  ['feed_posts', 'author_id'],
  ['site_activities', 'actor_id'],
  ['token_transactions', 'user_id'],
  ['company_claims', 'user_id'],
  ['company_claims', 'company_id'],
  ['orders', 'client_id'],
  ['orders', 'engineer_id'],
  ['orders', 'service_id'],
  ['rfqs', 'client_id'],
  ['services', 'provider_id'],
  ['products', 'company_id'],
];

const TARGETS = ['profiles', 'company_profiles', 'auth.users'];

console.log('════ FK TARGET RESOLUTION ════\n');
for (const [table, col] of COLS) {
  const results = [];
  for (const target of TARGETS) {
    const embed = `${target}!${table}_${col}_fkey(id)`;
    const { ok } = await probe(table, embed);
    if (ok) results.push(target);
  }
  // Also try without constraint name (auto-resolve)
  let auto = null;
  for (const target of TARGETS) {
    const { ok } = await probe(table, `${target}(id)`);
    if (ok) { auto = target; break; }
  }
  const label = results.length ? results.join(', ') : (auto ? `${auto} (auto)` : 'UNRESOLVED');
  console.log(`  ${table}.${col}`.padEnd(44) + label);
}

// ── 2. Legacy table existence ────────────────────────────────────────────
console.log('\n════ LEGACY TABLE EXISTENCE ════\n');
for (const t of ['company_team_members', 'team_members', 'conversations', 'messages', 'token_purchases']) {
  const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: H });
  const body = await res.json().catch(() => ({}));
  const exists = res.ok || body?.code !== 'PGRST205';
  console.log(`  ${t.padEnd(24)} ${exists ? 'EXISTS' : 'MISSING'}  ${res.ok ? '' : '(' + (body?.code || '') + ')'}`);
}

// ── 3. What references the legacy tables? ────────────────────────────────
console.log('\n════ REFERENCES TO LEGACY TABLES ════\n');
const REF_PROBES = [
  ['user_messages', 'conversations(id)'],
  ['user_messages', 'messages(id)'],
  ['conversation_participants', 'conversations(id)'],
  ['company_members', 'company_team_members(id)'],
];
for (const [table, embed] of REF_PROBES) {
  const { ok, detail } = await probe(table, embed);
  console.log(`  ${table} → ${embed.split('(')[0]}`.padEnd(48) + (ok ? 'YES' : 'no'));
}
