import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: maya } = await s.from('profiles').select('id, company_id, job_title').eq('email', 'maya.chen@ppf.test').single();
console.log('before:', JSON.stringify(maya));

// Setting job_title should fire trg_sync_job_title_channel
const { error } = await s.from('profiles').update({ job_title: 'Shop Foreman' }).eq('id', maya.id);
console.log('update:', error ? 'ERR ' + error.message : 'ok');

await new Promise(r => setTimeout(r, 1500));

const { data: groups } = await s
  .from('user_conversations')
  .select('id, name, conversation_type, company_id')
  .eq('company_id', maya.company_id)
  .eq('conversation_type', 'group');
console.log('group chats:', JSON.stringify(groups, null, 2));

if (groups?.length) {
  const { data: parts } = await s
    .from('conversation_participants')
    .select('user_id, role')
    .eq('conversation_id', groups[0].id);
  console.log('participants:', JSON.stringify(parts, null, 2));
}
