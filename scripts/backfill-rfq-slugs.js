require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Get all RFQs with NULL slug
  const { data: rfqs } = await svc.from('rfqs').select('id, title').is('slug', null);
  console.log(`Found ${rfqs?.length || 0} RFQs with NULL slug\n`);

  if (!rfqs || rfqs.length === 0) { console.log('All slugs are set!'); return; }

  for (const r of rfqs) {
    const slug = r.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + r.id.substring(0, 8);
    
    const { error } = await svc.from('rfqs').update({ slug }).eq('id', r.id);
    if (error) {
      console.log(`  ❌ ${r.title.substring(0, 50)}: ${error.message}`);
    } else {
      console.log(`  ✅ ${slug}`);
    }
  }

  console.log('\nDone!');
})();