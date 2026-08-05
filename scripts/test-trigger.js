require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== Testing auto-join trigger ===');

  // Add a test user to company_members as 'invited', then activate
  const testUserId = '8b8a7182-5d18-4089-a993-1507ad34251b';
  const companyId = '4a2ef5d4-8461-457e-b81c-32883001c3be';

  // Current state
  const { data: before } = await svc.from('conversation_participants')
    .select('*').eq('user_id', testUserId).eq('conversation_id', '8631047f-e748-4cf0-ac4c-5f50c6c32b37');
  console.log('Before trigger:', before?.length ? 'Already in General' : 'NOT in General');

  // Activate by updating status
  const { data: result } = await svc.from('company_members')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('user_id', testUserId)
    .select();
  console.log('Status update result:', result?.[0]?.status);

  // Wait for trigger
  await new Promise(r => setTimeout(r, 500));

  // After trigger
  const { data: after } = await svc.from('conversation_participants')
    .select('*').eq('user_id', testUserId).eq('conversation_id', '8631047f-e748-4cf0-ac4c-5f50c6c32b37');
  console.log('After trigger:', after?.length ? `✅ In General (role: ${after[0].role})` : '❌ NOT in General');

  // Check for system message
  const { data: msgs } = await svc.from('user_messages')
    .select('content').eq('conversation_id', '8631047f-e748-4cf0-ac4c-5f50c6c32b37')
    .eq('is_system_message', true).order('created_at', { ascending: false }).limit(3);
  console.log('\nRecent system messages in General:');
  msgs?.forEach(m => console.log(`  ${m.content}`));

  console.log('\n✅ Trigger test complete');
})();