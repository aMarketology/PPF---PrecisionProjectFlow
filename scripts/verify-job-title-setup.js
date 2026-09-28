import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. job_title column exists?
const { data: prof, error: profErr } = await s.from('profiles').select('id, email, job_title, company_id').limit(1);
console.log('job_title column:', profErr ? 'MISSING - ' + profErr.message : 'OK');

// 2. RPC exists?
const { error: rpcErr } = await s.rpc('ensure_job_title_channel', {
  p_company_id: '00000000-0000-0000-0000-000000000000',
  p_job_title: 'Test',
  p_user_id: '00000000-0000-0000-0000-000000000000',
});
console.log('ensure_job_title_channel RPC:', rpcErr ? 'ERR - ' + rpcErr.message : 'OK');

// 3. Stale participations cleaned?
const { data: stale } = await s
  .from('conversation_participants')
  .select('conversation_id, user_id');
const { data: convs } = await s
  .from('user_conversations')
  .select('id, company_id')
  .not('company_id', 'is', null);
const { data: members } = await s
  .from('company_members')
  .select('company_id, user_id, status')
  .eq('status', 'active');

const convCompany = new Map((convs ?? []).map(c => [c.id, c.company_id]));
const activeSet = new Set((members ?? []).map(m => `${m.company_id}:${m.user_id}`));
const staleRows = (stale ?? []).filter(p => {
  const cid = convCompany.get(p.conversation_id);
  return cid && !activeSet.has(`${cid}:${p.user_id}`);
});
console.log('stale company-channel participations remaining:', staleRows.length);

// 4. Existing group chats
const { data: groups } = await s
  .from('user_conversations')
  .select('id, name, company_id, conversation_type')
  .eq('conversation_type', 'group');
console.log('job-title group chats:', JSON.stringify(groups, null, 2));
