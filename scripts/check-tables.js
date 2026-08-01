require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Check if rfq_offers table exists
  const { data, error } = await supabase.from('rfq_offers').select('id').limit(1);
  if (error && error.message?.includes('relation') || error?.message?.includes('does not exist')) {
    console.log('❌ Table rfq_offers does not exist. You need to run the SQL migration.');
    console.log('Open: https://supabase.com/dashboard/project/ifrxzmemiihxfdimwvcw/sql/new');
    console.log('And paste the contents of supabase/RFQ_OFFERS.sql');
  } else if (error) {
    console.log('⚠️  Error checking table:', error.message);
  } else {
    console.log('✅ Table rfq_offers exists!', data);
  }

  // Check site_activities types
  const { data: sa } = await supabase.from('site_activities').select('activity_type').limit(5);
  if (sa) {
    const types = [...new Set(sa.map(a => a.activity_type))];
    console.log('📊 Existing activity types:', types);
  }
}

main().catch(console.error);