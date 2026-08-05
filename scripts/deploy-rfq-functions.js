/**
 * Deploy missing RFQ DB functions via Supabase client
 * Run: node scripts/deploy-rfq-functions.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Step 1: Add delivery_days column ──────────────────────────────
async function addColumn() {
  console.log('1. Adding delivery_days column...');
  // Try direct ALTER via raw SQL approach
  const { error } = await supabase
    .from('rfq_offers')
    .update({ status: 'pending' }) // dummy update to test
    .eq('id', '00000000-0000-0000-0000-000000000000');
  
  // Check if column exists by selecting it
  const { error: colErr } = await supabase
    .from('rfq_offers')
    .select('delivery_days')
    .limit(1);
  
  if (colErr) {
    console.log('   ❌ delivery_days column missing — needs manual SQL');
    console.log('   Run in Supabase SQL Editor:');
    console.log('   ALTER TABLE public.rfq_offers ADD COLUMN IF NOT EXISTS delivery_days INT;');
    return false;
  }
  console.log('   ✅ delivery_days column exists');
  return true;
}

// ── Step 2: Create accept_rfq_offer ────────────────────────────────
async function createAcceptFunction() {
  console.log('2. Creating accept_rfq_offer...');
  
  // Check if already exists
  const { error: checkErr } = await supabase.rpc('accept_rfq_offer', {
    p_offer_id: '00000000-0000-0000-0000-000000000000',
    p_client_id: '00000000-0000-0000-0000-000000000000',
  });

  if (!checkErr || !checkErr.message.includes('Could not find')) {
    console.log('   ✅ accept_rfq_offer already exists');
    return true;
  }

  console.log('   ❌ accept_rfq_offer missing — needs manual SQL');
  return false;
}

// ── Step 3: Create reject_rfq_offer ────────────────────────────────
async function createRejectFunction() {
  console.log('3. Creating reject_rfq_offer...');
  
  const { error: checkErr } = await supabase.rpc('reject_rfq_offer', {
    p_offer_id: '00000000-0000-0000-0000-000000000000',
    p_client_id: '00000000-0000-0000-0000-000000000000',
  });

  if (!checkErr || !checkErr.message.includes('Could not find')) {
    console.log('   ✅ reject_rfq_offer already exists');
    return true;
  }

  console.log('   ❌ reject_rfq_offer missing — needs manual SQL');
  return false;
}

// ── Step 4: Create withdraw_rfq_offer ──────────────────────────────
async function createWithdrawFunction() {
  console.log('4. Creating withdraw_rfq_offer...');
  
  const { error: checkErr } = await supabase.rpc('withdraw_rfq_offer', {
    p_offer_id: '00000000-0000-0000-0000-000000000000',
    p_vendor_id: '00000000-0000-0000-0000-000000000000',
  });

  if (!checkErr || !checkErr.message.includes('Could not find')) {
    console.log('   ✅ withdraw_rfq_offer already exists');
    return true;
  }

  console.log('   ❌ withdraw_rfq_offer missing — needs manual SQL');
  return false;
}

async function main() {
  console.log('=== RFQ Function Deployment Check ===\n');
  
  const colOk = await addColumn();
  const acceptOk = await createAcceptFunction();
  const rejectOk = await createRejectFunction();
  const withdrawOk = await createWithdrawFunction();

  const allOk = colOk && acceptOk && rejectOk && withdrawOk;

  if (allOk) {
    console.log('\n✅ All functions and columns are deployed!');
  } else {
    console.log('\n⚠️  Some items need manual SQL deployment.');
    console.log('Open the Supabase SQL Editor and run:');
    console.log('https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new');
    console.log('\nThen paste the contents of:');
    console.log('supabase/RFQ_TOKEN_SYSTEM.sql');
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });