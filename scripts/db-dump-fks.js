/**
 * db-dump-fks.js - dump authoritative foreign-key definitions from the
 * PostgREST OpenAPI spec (spec.definitions.<table>.foreignKeys).
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

const INTEREST = [
  'profiles', 'company_members', 'company_profiles', 'services', 'products',
  'orders', 'product_orders', 'rfqs', 'rfq_offers', 'user_conversations',
  'conversation_participants', 'user_messages', 'feed_posts', 'site_activities',
  'token_transactions', 'company_claims', 'conversations', 'messages',
];

for (const [table, def] of Object.entries(defs)) {
  if (!INTEREST.includes(table)) continue;
  const fks = def.foreignKeys ?? [];
  if (fks.length === 0) {
    console.log(`${table}: NO foreignKeys exposed`);
    continue;
  }
  console.log(`── ${table}`);
  for (const fk of fks) {
    const cols = (fk.columns ?? []).join(',');
    const rel = fk.references ?? fk.foreign_key_constraint ?? fk;
    const targetTable = rel.table ?? '?';
    const targetCols = (rel.columns ?? []).join(',');
    console.log(`   (${cols}) -> ${targetTable}(${targetCols})`);
  }
  console.log('');
}