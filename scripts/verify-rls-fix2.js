require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Try to sign in first (simulating the browser session)
  const { data: { session }, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'bootysweat.808@gmail.com',
    password: 'test123'
  });
  if (signInErr) {
    console.log('Sign-in failed:', signInErr.message);
    console.log('(This is fine if password is different - try the service key instead)');
    
    // Use service key as fallback but with auth context check
    const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Check: can we read the company channel via the service role?
    const { data: cc, error: ccErr } = await svc
      .from('user_conversations')
      .select('*')
      .eq('company_id', '4a2ef5d4-8461-457e-b81c-32883001c3be')
      .eq('conversation_type', 'channel')
      .eq('name', 'General');
    console.log('\n🔍 Company channel (service role):', cc?.length ? 'FOUND ✅' : 'NOT FOUND ❌');
    if (cc?.length) console.log('  Name:', cc[0].name, '| ID:', cc[0].id);
    
    // Check conversation_participants
    const { data: parts } = await svc
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', cc?.[0]?.id);
    console.log('\n🔍 Channel participants (service role):', parts?.length || 0);
    if (parts?.length) parts.forEach(p => console.log('  User:', p.user_id, '| Role:', p.role));
    
    return;
  }

  console.log('Signed in as:', session.user.email);
  
  // Now test - this uses the authenticated session
  const companyId = '4a2ef5d4-8461-457e-b81c-32883001c3be';
  
  const { data: cc, error: ccErr } = await supabase
    .from('user_conversations')
    .select('*')
    .eq('company_id', companyId)
    .eq('conversation_type', 'channel')
    .eq('name', 'General')
    .maybeSingle();
  console.log('\n🔍 Company channel:', cc ? `FOUND ✅ (${cc.name})` : 'NOT FOUND');
  if (ccErr) console.log('  Error:', ccErr.message);

  // Test conversation_participants
  const { data: parts } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('user_id', session.user.id);
  console.log('\n🔍 My participant rows:', parts?.length || 0);

  // Test all conversations I should see (channels)
  const { data: convos } = await supabase
    .from('user_conversations')
    .select('id, name, conversation_type')
    .in('conversation_type', ['group', 'channel']);
  console.log('\n🔍 All channels/groups I can see:', convos?.length || 0);
})();