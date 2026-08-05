require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Check company_members table structure
  const { data: columns, error: colErr } = await svc
    .from('company_members')
    .select('*')
    .limit(1);
  console.log('company_members sample:', JSON.stringify(columns, null, 2));
  console.log('error:', colErr?.message);

  // Check constraint
  const { data: constraints } = await svc
    .from('information_schema.table_constraints')
    .select('constraint_name, constraint_type')
    .eq('table_name', 'company_members')
    .eq('table_schema', 'public');
  console.log('\nConstraints:', JSON.stringify(constraints, null, 2));

  // Try direct upsert
  const { data: upsert, error: upErr } = await svc.from('company_members').upsert({
    company_id: '4a2ef5d4-8461-457e-b81c-32883001c3be',
    user_id: '8b8a7182-5d18-4089-a993-1507ad34251b',
    role: 'member',
    status: 'invited',
    invited_by: '4009681a-e413-47e4-aac8-2eb4ec2f30ef',
  }, { onConflict: 'company_id, user_id' }).select();
  console.log('\nUpsert result:', JSON.stringify(upsert, null, 2));
  console.log('Upsert error:', upErr?.message);

  // Try get_or_create_conversation
  const { data: convId } = await svc.rpc('get_or_create_conversation', {
    user_one_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef',
    user_two_id: '8b8a7182-5d18-4089-a993-1507ad34251b',
  });
  console.log('\nConversation:', convId);

  // Try inserting a message
  if (convId) {
    const { error: msgErr } = await svc.from('user_messages').insert({
      conversation_id: convId,
      sender_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef',
      content: '📨 **INVITE:** Test invite message',
      is_system_message: true,
      is_read: true,
      is_paid: true,
    });
    console.log('Message insert error:', msgErr?.message);
  }
})();