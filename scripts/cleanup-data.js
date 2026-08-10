require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

(async () => {
  console.log('🧹 PPF Admin Cleanup Tool\n');

  // Show current counts
  const [{ count: products }, { count: rfqs }, { count: services }, { count: companies }] = await Promise.all([
    svc.from('products').select('*', { count: 'exact', head: true }),
    svc.from('rfqs').select('*', { count: 'exact', head: true }),
    svc.from('services').select('*', { count: 'exact', head: true }),
    svc.from('company_profiles').select('*', { count: 'exact', head: true }),
  ]);

  console.log(`Current counts:`);
  console.log(`  Products:  ${products}`);
  console.log(`  RFQs:      ${rfqs}`);
  console.log(`  Services:  ${services}`);
  console.log(`  Companies: ${companies}`);

  // Show RFQs with status
  const { data: rfqData } = await svc.from('rfqs').select('id, title, status').limit(5);
  console.log('\n  Sample RFQs:');
  rfqData?.forEach(r => console.log(`    [${r.status}] ${r.title}`));

  console.log('\nOptions:');
  console.log('  1) Delete all RFQs (keep products & services)');
  console.log('  2) Delete all products + RFQs (keep services)');
  console.log('  3) Delete ALL (products, RFQs, services — fresh start)');
  console.log('  4) Cancel (do nothing)');
  console.log('  5) Delete only closed/old RFQs');

  const choice = await ask('\nEnter choice (1-5): ');
  rl.close();

  if (choice === '4') { console.log('Cancelled.'); return; }

  if (choice === '1') {
    const confirm = await ask(`Delete ALL ${rfqs} RFQs? (yes/no): `);
    if (confirm !== 'yes') { console.log('Cancelled.'); return; }
    const { error } = await svc.from('rfqs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { console.error('Error:', error.message); return; }
    console.log(`✅ Deleted all RFQs`);
  }

  if (choice === '2') {
    const confirm = await ask(`Delete ALL ${products} products AND ${rfqs} RFQs? (yes/no): `);
    if (confirm !== 'yes') { console.log('Cancelled.'); return; }
    await svc.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await svc.from('rfqs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted all products and RFQs');
  }

  if (choice === '3') {
    const confirm = await ask(`Delete ALL products, RFQs, AND services? (yes/no): `);
    if (confirm !== 'yes') { console.log('Cancelled.'); return; }
    await svc.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await svc.from('rfqs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await svc.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Wiped all products, RFQs, and services');
  }

  if (choice === '5') {
    const confirm = await ask('Delete all closed, awarded, and in_review RFQs? (yes/no): ');
    if (confirm !== 'yes') { console.log('Cancelled.'); return; }
    const { error } = await svc.from('rfqs').delete().in('status', ['closed', 'awarded', 'in_review']);
    if (error) { console.error('Error:', error.message); return; }
    console.log('✅ Deleted closed/awarded/in_review RFQs. Open RFQs remain.');
  }

  console.log('\nDone!');
})();