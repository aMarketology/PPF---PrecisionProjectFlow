require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

(async () => {
  const anonClient = createClient(url, anonKey);

  // Sign in as bootysweat
  const { data: { session }, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: 'bootysweat.808@gmail.com',
    password: 'test123',
  });
  if (signInErr) { console.log('Sign in error:', signInErr.message); return; }
  console.log('Signed in as:', session.user.email);

  // Try company_profiles
  const { data: comp, error: compErr } = await anonClient
    .from('company_profiles')
    .select('company_name, id')
    .eq('id', '4a2ef5d4-8461-457e-b81c-32883001c3be')
    .single();
  console.log('Company Profile:', JSON.stringify(comp, null, 2));
  console.log('Company Profile Error:', compErr?.message);

  // Try company_members
  const { data: members, error: memErr } = await anonClient
    .from('company_members')
    .select('user_id, role')
    .eq('company_id', '4a2ef5d4-8461-457e-b81c-32883001c3be');
  console.log('Members:', JSON.stringify(members, null, 2));
  console.log('Members Error:', memErr?.message);

  // Try user_conversations for company channel
  const { data: convos, error: convErr } = await anonClient
    .from('user_conversations')
    .select('*')
    .eq('company_id', '4a2ef5d4-8461-457e-b81c-32883001c3be')
    .eq('conversation_type', 'channel');
  console.log('Company Channels:', JSON.stringify(convos, null, 2));
  console.log('Channels Error:', convErr?.message);
})();