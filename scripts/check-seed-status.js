const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Check if site_activities table exists
  const { data: sa } = await s.from('site_activities').select('id').limit(1);
  console.log('site_activities table exists:', !!sa);
  if (sa) {
    const { count } = await s.from('site_activities').select('*', { count: 'exact', head: true });
    console.log('site_activities rows:', count);
  }

  // Check rfqs
  const { count: rc } = await s.from('rfqs').select('*', { count: 'exact', head: true });
  console.log('rfqs count:', rc);

  // Check user_type values
  const { data: ut } = await s.from('profiles').select('user_type');
  const counts = { engineer: 0, client: 0, other: 0 };
  (ut || []).forEach(function(p) {
    if (p.user_type === 'engineer') counts.engineer++;
    else if (p.user_type === 'client') counts.client++;
    else counts.other++;
  });
  console.log('user_types:', JSON.stringify(counts));

  process.exit(0);
})();