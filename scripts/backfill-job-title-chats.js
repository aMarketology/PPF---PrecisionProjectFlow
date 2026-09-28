import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Members with a job title and an active membership in that company
const { data: rows } = await s
  .from('profiles')
  .select('id, email, company_id, job_title')
  .not('job_title', 'is', null)
  .not('company_id', 'is', null);

console.log('profiles with job titles:', rows?.length ?? 0);

for (const r of rows ?? []) {
  const { data: mem } = await s
    .from('company_members')
    .select('id')
    .eq('company_id', r.company_id)
    .eq('user_id', r.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!mem) { console.log(`  skip ${r.email} (no active membership)`); continue; }

  const { data: convId, error } = await s.rpc('ensure_job_title_channel', {
    p_company_id: r.company_id,
    p_job_title: r.job_title,
    p_user_id: r.id,
  });
  console.log(`  ${r.email} → "${r.job_title}" chat: ${error ? 'ERR ' + error.message : convId}`);
}

const { data: groups } = await s
  .from('user_conversations')
  .select('id, name, conversation_type, company_id')
  .eq('conversation_type', 'group');
console.log('\nGROUP CHATS:', JSON.stringify(groups, null, 2));
