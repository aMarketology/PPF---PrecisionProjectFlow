require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Simulate the EXACT flow from the messages page using anon key
  const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Step 1: get the user from auth (simulating getUser - this uses the session cookie in browser)
  // For test, let's manually sign in using the service role to get a valid session
  const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: uErr } = await svc.auth.admin.getUserById('4009681a-e413-47e4-aac8-2eb4ec2f30ef');
  console.log('User:', user?.email, 'Err:', uErr?.message);
  
  // Step 2: Simulate the initializeUser flow with anon key
  // Get profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('token_balance, company_id, full_name')
    .eq('id', '4009681a-e413-47e4-aac8-2eb4ec2f30ef')
    .maybeSingle();
  console.log('\n=== Profile (anon) ===');
  console.log('Profile:', JSON.stringify(profile));
  console.log('Profile err:', profErr?.message);
  
  if (profile?.company_id) {
    // Step 3: Get company name
    const { data: comp, error: compErr } = await supabase
      .from('company_profiles')
      .select('company_name')
      .eq('id', profile.company_id)
      .maybeSingle();
    console.log('\n=== Company (anon) ===');
    console.log('Company:', JSON.stringify(comp));
    console.log('Company err:', compErr?.message);
  }
  
  // Step 4: Simulate loadConversations - get company channel
  if (profile?.company_id) {
    console.log('\n=== Company Channel Query (anon, direct) ===');
    console.log('company_id:', profile.company_id);
    
    // This is the EXACT query from loadConversations
    const { data: cc, error: ccErr } = await supabase
      .from('user_conversations')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('conversation_type', 'channel')
      .eq('name', 'General')
      .maybeSingle();
    console.log('Channel:', JSON.stringify(cc));
    console.log('Channel err:', ccErr?.message);
    
    if (!cc) {
      // Try without maybeSingle
      const { data: ccArr } = await supabase
        .from('user_conversations')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('conversation_type', 'channel');
      console.log('Channel array:', JSON.stringify(ccArr));
      
      // Try with service role
      const svc2 = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: ccSvc } = await svc2
        .from('user_conversations')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('conversation_type', 'channel');
      console.log('Channel (svc):', JSON.stringify(ccSvc));
    }
  }
})();