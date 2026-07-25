const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const tables = ['rfqs', 'feed_posts', 'feed_likes', 'feed_comments', 'product_orders', 'company_profiles', 'company_members', 'user_conversations', 'projects', 'profiles'];
  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (!error) console.log('OK', t, count);
      else console.log('NO', t);
    } catch(e) { console.log('NO', t); }
  }

  const { data: rfq } = await supabase.from('rfqs').select('*').limit(1);
  if (rfq?.length) console.log('RFQ_COLS:', Object.keys(rfq[0]).join(','));

  try {
    const { data: ord } = await supabase.from('product_orders').select('*').limit(1);
    if (ord?.length) console.log('ORD_COLS:', Object.keys(ord[0]).join(','));
  } catch(e) {}

  try {
    const { data: proj } = await supabase.from('projects').select('*').limit(1);
    if (proj?.length) console.log('PROJ_COLS:', Object.keys(proj[0]).join(','));
  } catch(e) {}

  try {
    const { data: cm } = await supabase.from('company_members').select('*').limit(1);
    if (cm?.length) console.log('CM_COLS:', Object.keys(cm[0]).join(','));
  } catch(e) {}

  try {
    const { data: fp } = await supabase.from('feed_posts').select('*').limit(1);
    if (fp?.length) console.log('FP_COLS:', Object.keys(fp[0]).join(','));
  } catch(e) {}

  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });