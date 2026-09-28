import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local', quiet: true })
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

for (const t of ['orders', 'product_orders', 'token_transactions', 'profiles', 'services', 'products', 'rfqs', 'rfq_offers', 'vendor_reviews']) {
  const { data, error } = await s.from(t).select('*').limit(1)
  const { count } = await s.from(t).select('*', { count: 'exact', head: true })
  console.log(`=== ${t} (${count}) ===`, error ? 'ERR ' + error.message : '')
  if (!error) console.log(Object.keys(data?.[0] || {}).join(', '))
}

// Sample orders
const { data: o } = await s.from('orders').select('*').limit(3)
console.log('\norders sample:', JSON.stringify(o, null, 2))
const { data: po } = await s.from('product_orders').select('*').limit(3)
console.log('\nproduct_orders sample:', JSON.stringify(po, null, 2))
