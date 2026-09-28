import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: maya } = await s.from('profiles').select('id, email, company_id').eq('email', 'maya.chen@ppf.test').single();
console.log('before:', JSON.stringify(maya));

// Try a direct update and read it back
const { error: upErr } = await s.from('profiles').update({ company_id: '125d10e0-e204-4108-8a5f-057de53302a6' }).eq('id', maya.id);
console.log('update error:', upErr ? upErr.message : 'none');

const { data: after } = await s.from('profiles').select('id, email, company_id').eq('id', maya.id).single();
console.log('after:', JSON.stringify(after));

// Check what triggers exist on profiles
const { data: trigs, error: tErr } = await s.rpc('exec_sql', {
  sql: `SELECT tgname, pg_get_triggerdef(oid) AS def FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;`,
}).then(r => r, e => ({ data: null, error: e }));
console.log('triggers rpc:', tErr ? 'n/a' : JSON.stringify(trigs, null, 2));
