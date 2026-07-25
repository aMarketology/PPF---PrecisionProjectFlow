const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const checks = [
    ['user_conversations.conversation_type', 'user_conversations', 'conversation_type'],
    ['user_conversations.is_unlocked', 'user_conversations', 'is_unlocked'],
    ['user_conversations.company_id', 'user_conversations', 'company_id'],
    ['conversation_participants table', 'conversation_participants', 'id'],
    ['user_messages.is_system_message', 'user_messages', 'is_system_message'],
    ['user_messages.attachment_url', 'user_messages', 'attachment_url'],
    ['user_messages.read_at', 'user_messages', 'read_at'],
    ['rfqs table', 'rfqs', 'id'],
    ['company_members table', 'company_members', 'id'],
    ['token_transactions table', 'token_transactions', 'id'],
    ['profiles.company_id', 'profiles', 'company_id'],
    ['profiles.token_balance', 'profiles', 'token_balance'],
  ];
  for (const [label, table, col] of checks) {
    try {
      const { error } = await supabase.from(table).select(col).limit(1);
      console.log(error ? '❌' : '✅', label, error ? '— NEEDS MIGRATION' : '');
    } catch(e) {
      console.log('❌', label, '— NEEDS MIGRATION');
    }
  }
  process.exit(0);
})();