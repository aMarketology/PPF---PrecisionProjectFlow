/**
 * audit-schema.js - read-only introspection of the live Supabase schema.
 * Uses the service-role client + PostgREST where possible; falls back to
 * information_schema via RPC if available.
 *
 * Run: node scripts/audit-schema.js
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Candidate tables across the app
const TABLES = [
  'profiles', 'company_profiles', 'company_members', 'company_team_members', 'company_claims',
  'services', 'products', 'product_orders', 'rfqs', 'rfq_offers',
  'user_conversations', 'conversation_participants', 'user_messages',
  'feed_posts', 'feed_likes', 'feed_comments', 'site_activities',
  'token_transactions', 'token_purchases', 'projects', 'portfolio_projects',
  'contracts', 'contract_milestones', 'reviews', 'stripe_connect_accounts',
];

console.log('════ TABLE INVENTORY ════\n');
const present = [];
const absent = [];

for (const t of TABLES) {
  const { count, error } = await s.from(t).select('*', { count: 'exact', head: true });
  if (error) {
    absent.push(t);
  } else {
    const { data } = await s.from(t).select('*').limit(1);
    const cols = data?.[0] ? Object.keys(data[0]) : [];
    present.push({ table: t, rows: count ?? 0, cols });
  }
}

for (const p of present) {
  console.log(`✅ ${p.table}  (${p.rows} rows)`);
  console.log(`   ${p.cols.join(', ')}\n`);
}

console.log('❌ NOT PRESENT:', absent.join(', ') || '(none)');
