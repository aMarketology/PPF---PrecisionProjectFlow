/**
 * Deploy RFQ Token System SQL to Supabase
 * Run: node scripts/deploy-rfq-tokens.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkFunction(name) {
  try {
    const { error } = await supabase.rpc(name, {
      p_rfq_id: '00000000-0000-0000-0000-000000000000',
      p_vendor_id: '00000000-0000-0000-0000-000000000000',
      p_amount: 1,
    });
    return error ? error.message : 'EXISTS';
  } catch (e) {
    return e.message;
  }
}

async function main() {
  console.log('Checking existing functions...\n');

  const submitStatus = await checkFunction('submit_rfq_offer');
  console.log('submit_rfq_offer:', submitStatus);

  const acceptStatus = await checkFunction('accept_rfq_offer');
  console.log('accept_rfq_offer:', acceptStatus);

  // Check delivery_days column
  try {
    const { data, error } = await supabase.from('rfq_offers').select('delivery_days').limit(1);
    console.log('delivery_days column:', error ? 'MISSING' : 'EXISTS');
  } catch (e) {
    console.log('delivery_days column: MISSING (table may not exist)');
  }

  console.log('\n---');
  console.log('If any functions are missing, run this SQL in Supabase Dashboard:');
  console.log('https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new');
  console.log('\nFile: supabase/RFQ_TOKEN_SYSTEM.sql');
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });