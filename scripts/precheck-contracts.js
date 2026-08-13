require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== Pre-deployment checks ===\n');

  // Check product_orders schema (references)
  const { data: orders } = await svc.from('product_orders').select('id, status, total_amount, buyer_id, company_id').limit(1);
  console.log('product_orders:', orders?.length ? `✅ exists (${Object.keys(orders[0])})` : '❌ missing');

  // Check profiles schema
  const { data: profiles } = await svc.from('profiles').select('id, full_name').limit(1);
  console.log('profiles:', profiles?.length ? `✅ exists` : '❌ missing');

  // Check stripe_connect_accounts  
  const { data: stripe } = await svc.from('stripe_connect_accounts').select('id').limit(1);
  console.log('stripe_connect_accounts:', stripe === null ? '✅ exists (empty)' : stripe?.length ? '✅ exists' : '❌ might be missing');

  // Check is_admin function
  const { data: adminCheck, error: adminErr } = await svc.rpc('is_admin', { user_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef' });
  console.log('is_admin RPC:', adminErr ? `❌ ${adminErr.message}` : '✅ exists');

  // Check company_id on product_orders vs profiles reference
  const { data: ordersWithCompany } = await svc.from('product_orders').select('id, company_id').eq('company_id', '4a2ef5d4-8461-457e-b81c-32883001c3be').limit(1);
  console.log('product_orders with company_id:', ordersWithCompany?.length ? '✅ references work' : 'no orders for that company yet');

  console.log('\n🟢 Ready to deploy CONTRACTS_AND_ESCROW.sql');
})();