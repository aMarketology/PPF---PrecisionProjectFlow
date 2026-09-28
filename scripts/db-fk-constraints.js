/**
 * db-fk-constraints.js - enumerate REAL FK constraint names by triggering
 * PostgREST ambiguity errors (PGRST201), whose details list every candidate.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };

const TABLES = [
  'profiles', 'company_members', 'company_profiles', 'company_claims',
  'product_orders', 'rfq_offers', 'rfqs', 'orders', 'services', 'products',
  'user_conversations', 'conversation_participants', 'user_messages',
  'feed_posts', 'site_activities', 'token_transactions',
];

console.log('════ FK CONSTRAINTS (from ambiguity errors) ════\n');
for (const table of TABLES) {
  const res = await fetch(
    `${url}/rest/v1/${table}?select=profiles(id)&limit=1`,
    { headers: H }
  );
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`  ${table.padEnd(28)} → profiles (single FK, unambiguous)`);
    continue;
  }
  const details = body?.details;
  if (Array.isArray(details)) {
    const names = details
      .map(d => d?.relationship || d?.constraint || JSON.stringify(d))
      .filter(Boolean);
    console.log(`  ${table.padEnd(28)} → ${names.join(' | ')}`);
  } else {
    console.log(`  ${table.padEnd(28)} → ${body?.code || '?'} ${String(details || body?.message || '').slice(0, 120)}`);
  }
}

// Same for company_profiles
console.log('\n════ FK CONSTRAINTS → company_profiles ════\n');
for (const table of TABLES) {
  const res = await fetch(
    `${url}/rest/v1/${table}?select=company_profiles(id)&limit=1`,
    { headers: H }
  );
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`  ${table.padEnd(28)} → company_profiles (single FK)`);
    continue;
  }
  const details = body?.details;
  if (Array.isArray(details)) {
    const names = details.map(d => d?.relationship || d?.constraint || JSON.stringify(d)).filter(Boolean);
    console.log(`  ${table.padEnd(28)} → ${names.join(' | ')}`);
  } else {
    console.log(`  ${table.padEnd(28)} → ${body?.code || '?'} ${String(details || body?.message || '').slice(0, 120)}`);
  }
}
