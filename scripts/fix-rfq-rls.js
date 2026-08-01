/**
 * Fix RFQ RLS — allow public (anon) viewing
 * Run: node scripts/fix-rfq-rls.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SQL = `
DROP POLICY IF EXISTS "Engineers can view open RFQs" ON public.rfqs;
DROP POLICY IF EXISTS "Anyone can view RFQs" ON public.rfqs;
CREATE POLICY "Anyone can view RFQs" ON public.rfqs FOR SELECT USING (true);
`;

async function main() {
  // Try Management API
  const mgmtUrl = 'https://api.supabase.com/v1/projects/ifrxzmemiihxfdimwvcw/query';
  
  const res = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: SQL }),
  });

  const result = await res.json();
  
  if (res.ok) {
    console.log('✅ RLS policy updated via Management API');
    process.exit(0);
  }

  console.log('Management API failed:', JSON.stringify(result).substring(0, 300));
  console.log('\n⚠️  Please run this SQL manually in Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new');
  console.log('\n' + SQL);
  process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });