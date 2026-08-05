require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Try using the pgcrypto extension or an existing RPC to run SQL
  // First, let's see if there's an existing exec_sql or similar RPC
  const { data: rpcs, error: rpcErr } = await supabase
    .from('information_schema.routines')
    .select('routine_name')
    .eq('routine_schema', 'public')
    .eq('routine_type', 'FUNCTION')
    .ilike('routine_name', '%exec%');
  
  console.log('Existing exec RPCs:', rpcs?.map(r => r.routine_name) || 'none found');

  // The API route fix uses service_role directly so it works.
  // But we need RLS fixed for realtime subscriptions to work in the browser.
  
  // Let's try creating a temporary function to run our SQL
  // by using a Supabase REST trick: inserting to a table with a trigger
  // or using the pg_dump extension.
  
  // Best approach: print SQL for the user to run
  console.log('\n========================================');
  console.log('RUN THIS IN SUPABASE SQL EDITOR:');
  console.log('========================================\n');
  console.log('-- Make site_activities readable by everyone');
  console.log('DROP POLICY IF EXISTS "Anyone can view activities" ON public.site_activities;');
  console.log('CREATE POLICY "Anyone can view activities"');
  console.log('  ON public.site_activities FOR SELECT');
  console.log('  USING (true);\n');
  console.log('-- Verify it works:');
  console.log('SELECT COUNT(*) FROM public.site_activities;\n');
  
  // Test current state
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { count: anonCount } = await anon.from('site_activities').select('*', { count: 'exact', head: true });
  console.log('Current anon access:', anonCount, 'rows (0 = RLS blocking)');
  
  const { count: svcCount } = await supabase.from('site_activities').select('*', { count: 'exact', head: true });
  console.log('Service role access:', svcCount, 'rows');
}

main().catch(console.error);