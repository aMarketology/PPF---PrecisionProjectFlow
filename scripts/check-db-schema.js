const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const { data: p } = await supabase.from('profiles').select('*').limit(1);
    if (p && p.length > 0) {
      console.log('profiles columns:', Object.keys(p[0]).sort().join(', '));
      console.log('has company_id:', 'company_id' in p[0]);
    } else { console.log('No profiles found'); }

    const { error: cmErr } = await supabase.from('company_members').select('id').limit(1);
    console.log('company_members exists:', !cmErr || !cmErr.message.includes('does not exist'));
    if (cmErr) console.log('  msg:', cmErr.message.substring(0, 120));

    const { count } = await supabase.from('company_profiles').select('*', { count: 'exact', head: true });
    console.log('company_profiles count:', count);

    const { data: conv } = await supabase.from('user_conversations').select('id, conversation_type, company_id').limit(3);
    console.log('sample conversations:', JSON.stringify(conv));
  } catch(e) { console.error(e.message); }
  process.exit(0);
})();