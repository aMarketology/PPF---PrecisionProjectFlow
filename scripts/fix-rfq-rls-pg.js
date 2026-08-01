/**
 * Fix RFQ RLS via direct Postgres connection
 * Run: node scripts/fix-rfq-rls-pg.js
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SQL = `
DROP POLICY IF EXISTS "Engineers can view open RFQs" ON public.rfqs;
DROP POLICY IF EXISTS "Anyone can view RFQs" ON public.rfqs;
CREATE POLICY "Anyone can view RFQs" ON public.rfqs FOR SELECT USING (true);
`;

async function main() {
  try {
    await pool.query(SQL);
    console.log('✅ RLS policy updated — RFQs now visible to everyone');
  } catch (e) {
    console.error('❌ Failed:', e.message);
    console.log('\nRun this SQL manually at:');
    console.log('https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new');
    console.log('\n' + SQL);
  }
  await pool.end();
  process.exit(0);
}

main();