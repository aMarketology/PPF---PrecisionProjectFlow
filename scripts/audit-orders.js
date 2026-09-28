import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

for (const t of ['orders', 'product_orders']) {
  const { data, error } = await s.from(t).select('*').limit(2);
  console.log(`\n════ ${t} ════`);
  if (error) { console.log('  ERR:', error.message); continue; }
  console.log('  columns:', Object.keys(data?.[0] ?? {}).join(', '));
  console.log('  sample:', JSON.stringify(data, null, 2).slice(0, 700));
}

// Which one does the app actually write to?
console.log('\n════ RECENT ROWS ════');
const { data: o } = await s.from('orders').select('id, created_at').order('created_at', { ascending: false }).limit(3);
const { data: po } = await s.from('product_orders').select('id, created_at').order('created_at', { ascending: false }).limit(3);
console.log('orders:', JSON.stringify(o));
console.log('product_orders:', JSON.stringify(po));
