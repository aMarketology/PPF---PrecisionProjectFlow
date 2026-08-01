require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Try calling add_channel_member with actual params
  const { data, error } = await svc.rpc('add_channel_member', {
    p_conversation_id: '8631047f-e748-4cf0-ac4c-5f50c6c32b37',
    p_target_user_id: '8b8a7182-5d18-4089-a993-1507ad34251b',
  });
  console.log('add_channel_member result:', data, 'error:', error?.message);

  // Try is_channel_admin
  const { data: d2, error: e2 } = await svc.rpc('is_channel_admin', {
    p_conversation_id: '8631047f-e748-4cf0-ac4c-5f50c6c32b37',
    p_user_id: '4009681a-e413-47e4-aac8-2eb4ec2f30ef',
  });
  console.log('is_channel_admin result:', d2, 'error:', e2?.message);

  // Try send_company_invite
  const { data: d3, error: e3 } = await svc.rpc('send_company_invite', {
    p_company_id: '4a2ef5d4-8461-457e-b81c-32883001c3be',
    p_user_id: '8b8a7182-5d18-4089-a993-1507ad34251b',
  });
  console.log('send_company_invite result:', d3, 'error:', e3?.message);
})();