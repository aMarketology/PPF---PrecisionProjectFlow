import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: u } = await s.from('profiles').select('id, email').eq('email', 'maya.chen@ppf.test').single();
const { data: p } = await s.from('conversation_participants').select('conversation_id, user_id, role').eq('user_id', u.id);
const ids = (p ?? []).map(x => x.conversation_id);
const { data: c } = await s.from('user_conversations').select('id, name, company_id, conversation_type').in('id', ids);

console.log('Maya participations:', JSON.stringify(p, null, 2));
console.log('Conversations:', JSON.stringify(c, null, 2));
