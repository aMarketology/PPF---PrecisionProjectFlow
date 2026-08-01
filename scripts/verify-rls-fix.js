require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Test 1: Check the company channel loads (was broken before)
  const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Get the user's company_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, full_name')
    .eq('id', '4009681a-e413-47e4-aac8-2eb4ec2f30ef')
    .maybeSingle();
  console.log('Profile:', JSON.stringify(profile));

  if (profile?.company_id) {
    console.log('\n=== Testing company channel query (was broken before) ===');
    const { data: cc, error: ccErr } = await supabase
      .from('user_conversations')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('conversation_type', 'channel')
      .eq('name', 'General')
      .maybeSingle();
    console.log('Channel:', JSON.stringify(cc));
    console.log('Error:', ccErr?.message);
  }

  // Test 2: Check conversation_participants query (was the recursive one)
  console.log('\n=== Testing conversation_participants SELECT ===');
  const { data: parts, error: partsErr } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('user_id', '4009681a-e413-47e4-aac8-2eb4ec2f30ef');
  console.log('Participant rows:', parts?.length);
  console.log('Error:', partsErr?.message);

  // Test 3: Check channels load correctly
  console.log('\n=== Testing channel/group conversations ===');
  const { data: channels, error: chanErr } = await supabase
    .from('user_conversations')
    .select('id, name, conversation_type')
    .in('conversation_type', ['group', 'channel']);
  console.log('Channels found:', channels?.length);
  if (chanErr) console.log('Error:', chanErr?.message);

  console.log('\n✅ RLS fix verification complete');
})();