require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const companyId = '4a2ef5d4-8461-457e-b81c-32883001c3be';
  const inviterId = '4009681a-e413-47e4-aac8-2eb4ec2f30ef';

  // 1. Find jg.reinard@gmail.com
  const { data: target } = await svc.from('profiles').select('id, full_name, email').eq('email', 'jg.reinard@gmail.com').single();
  if (!target) { console.log('❌ User jg.reinard@gmail.com not found in profiles'); return; }
  console.log('✅ Found:', target.full_name, target.id);

  // 2. Add as admin in company_members
  const { error: memErr } = await svc.from('company_members').upsert({
    company_id: companyId,
    user_id: target.id,
    role: 'admin',
    status: 'active',
    invited_by: inviterId,
  }, { onConflict: 'company_id, user_id' });
  if (memErr) { console.log('❌ company_members error:', memErr.message); return; }
  console.log('✅ Added as admin in company_members');

  // 3. Update profiles.company_id
  const { error: profErr } = await svc.from('profiles').update({ company_id: companyId }).eq('id', target.id);
  if (profErr) { console.log('❌ profiles update error:', profErr.message); return; }
  console.log('✅ Updated profiles.company_id');

  // 4. Find the General channel
  const { data: genChan } = await svc.from('user_conversations')
    .select('id').eq('company_id', companyId).eq('conversation_type', 'channel').eq('name', 'General').single();
  if (!genChan) { console.log('❌ General channel not found'); return; }
  console.log('✅ General channel:', genChan.id);

  // 5. Add to conversation_participants as admin
  const { error: partErr } = await svc.from('conversation_participants').upsert({
    conversation_id: genChan.id,
    user_id: target.id,
    role: 'admin',
  }, { onConflict: 'conversation_id, user_id' });
  if (partErr) { console.log('❌ participants error:', partErr.message); return; }
  console.log('✅ Added as admin in General channel');

  // 6. Create DM between inviter and new member
  const { data: convId } = await svc.rpc('get_or_create_conversation', {
    user_one_id: inviterId,
    user_two_id: target.id,
  });
  console.log('✅ DM conversation:', convId);

  // 7. Send welcome system message
  if (convId) {
    await svc.from('user_messages').insert({
      conversation_id: convId,
      sender_id: inviterId,
      content: `👋 Welcome to Precision Project Flow, ${target.full_name}! You've been added as an admin. Check out the General channel to get started.`,
      is_system_message: true,
      is_read: true,
      is_paid: true,
    });
    await svc.from('user_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);
    console.log('✅ Welcome message sent');
  }

  console.log('\n🎉 Done! jg.reinard@gmail.com is now an admin of Precision Project Flow');
})();