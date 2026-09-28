/**
 * db-fk-real.js - find the REAL FK targets by hint-free embeds.
 * `select=profiles(id)` resolves only if an FK from <table> to profiles exists.
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
const TARGETS = ['profiles', 'company_profiles'];

console.log('════ REAL FK TARGETS (hint-free embeds) ════\n');
for (const table of TABLES) {
  const found = [];
  for (const target of TARGETS) {
    const res = await fetch(
      `${url}/rest/v1/${table}?select=${target}(id)&limit=1`,
      { headers: H }
    );
    if (res.ok) found.push(target);
  }
  console.log(`  ${table.padEnd(28)} → ${found.length ? found.join(', ') : '(none)'}`);
}

// ── Also: does auth.users resolve anywhere? (should be no) ───────────────
console.log('\n════ auth.users EMBED (expected: none) ════\n');
for (const table of TABLES) {
  const res = await fetch(
    `${url}/rest/v1/${table}?select=users(id)&limit=1`,
    { headers: H }
  );
  if (res.ok) console.log(`  ${table} → auth.users RESOLVES`);
}
console.log('  (done)');
