require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '4009681a-e413-47e4-aac8-2eb4ec2f30ef';
  const companyId = '4a2ef5d4-8461-457e-b81c-32883001c3be';

  // Check role in General channel
  const { data: parts } = await svc
    .from('conversation_participants')
    .select('user_id, role, conversation_id')
    .eq('user_id', userId);
  console.log('Your participant rows:', JSON.stringify(parts, null, 2));

  // Check the General channel
  const { data: genChan } = await svc
    .from('user_conversations')
    .select('id, name, company_id')
    .eq('company_id', companyId)
    .eq('conversation_type', 'channel')
    .eq('name', 'General')
    .single();
  console.log('\nGeneral channel:', JSON.stringify(genChan, null, 2));

  // Check company_members role
  const { data: cm } = await svc
    .from('company_members')
    .select('user_id, role, status')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();
  console.log('\nCompany membership:', JSON.stringify(cm, null, 2));

  // Check company owner
  const { data: comp } = await svc
    .from('company_profiles')
    .select('id, owner_id, company_name')
    .eq('id', companyId)
    .single();
  console.log('\nCompany:', JSON.stringify(comp, null, 2));

  // Fix: set the company owner as 'owner' in the General channel
  if (genChan && comp) {
    const { data: updateResult } = await svc
      .from('conversation_participants')
      .update({ role: 'owner' })
      .eq('conversation_id', genChan.id)
      .eq('user_id', comp.owner_id)
      .select();
    console.log('\nFix applied:', JSON.stringify(updateResult, null, 2));
  }
})();