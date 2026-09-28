/**
 * db-relationships.js — discover foreign-key relationships by probing
 * PostgREST embedded selects, and report remaining table columns.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

const spec = await (await fetch(`${url}/rest/v1/`, {
  headers: { ...H, Accept: 'application/openapi+json' },
})).json();
const defs = spec.definitions ?? {};

// Remaining tables not yet shown
for (const t of ['user_conversations', 'user_messages']) {
  const props = defs[t]?.properties ?? {};
  console.log(`── ${t}`);
  for (const [n, d] of Object.entries(props)) {
    let ty = d.format || d.type || '?';
    if (d.type === 'array') ty = `${d.items?.format || d.items?.type || '?'}[]`;
    console.log(`   ${n}:${ty}`);
  }
  console.log('');
}

// ── Relationship probes: try embedding each candidate FK ─────────────
console.log('════ FOREIGN KEY RELATIONSHIPS ════\n');

const PROBES = [
  ['profiles', 'company:company_profiles!profiles_company_id_fkey(id,company_name)'],
  ['company_members', 'company:company_profiles!company_members_company_id_fkey(id,company_name)'],
  ['company_members', 'user:profiles!company_members_user_id_fkey(id,email)'],
  ['company_profiles', 'owner:profiles!company_profiles_owner_id_fkey(id,email)'],
  ['services', 'provider:profiles!services_provider_id_fkey(id,email)'],
  ['products', 'company:company_profiles!products_company_id_fkey(id,company_name)'],
  ['orders', 'client:profiles!orders_client_id_fkey(id,email)'],
  ['orders', 'engineer:profiles!orders_engineer_id_fkey(id,email)'],
  ['orders', 'service:services!orders_service_id_fkey(id,title)'],
  ['product_orders', 'buyer:profiles!product_orders_buyer_id_fkey(id,email)'],
  ['product_orders', 'company:company_profiles!product_orders_company_id_fkey(id,company_name)'],
  ['rfqs', 'client:profiles!rfqs_client_id_fkey(id,email)'],
  ['rfq_offers', 'rfq:rfqs!rfq_offers_rfq_id_fkey(id,title)'],
  ['rfq_offers', 'vendor:profiles!rfq_offers_vendor_id_fkey(id,email)'],
  ['user_conversations', 'company:company_profiles!user_conversations_company_id_fkey(id,company_name)'],
  ['conversation_participants', 'user:profiles!conversation_participants_user_id_fkey(id,email)'],
  ['user_messages', 'sender:profiles!user_messages_sender_id_fkey(id,email)'],
  ['feed_posts', 'author:profiles!feed_posts_author_id_fkey(id,email)'],
  ['site_activities', 'actor:profiles!site_activities_actor_id_fkey(id,email)'],
  ['token_transactions', 'user:profiles!token_transactions_user_id_fkey(id,email)'],
  ['company_claims', 'company:company_profiles!company_claims_company_id_fkey(id,company_name)'],
];

for (const [table, embed] of PROBES) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(embed)}&limit=1`, { headers: H });
  const body = await res.text();
  const ok = res.ok;
  console.log(`  ${ok ? '✅' : '❌'} ${table} → ${embed.split(':')[0]}  ${ok ? '' : '(' + body.slice(0, 90) + ')'}`);
}
