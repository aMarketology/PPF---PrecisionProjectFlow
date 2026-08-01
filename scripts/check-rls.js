require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Check pg_policies for company_profiles
  const { data: policies, error: polErr } = await svc
    .from('company_profiles')
    .select('id, company_name')
    .eq('id', '4a2ef5d4-8461-457e-b81c-32883001c3be');
  console.log('Direct query:', JSON.stringify(policies), 'Error:', polErr?.message);

  // Use raw SQL via REST endpoint
  const sql = `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'company_profiles'
    ORDER BY policyname
  `;
  const { data: policies2, error: sqlErr } = await svc.rpc('exec_sql', { query: sql });
  console.log('Policies via RPC:', JSON.stringify(policies2, null, 2));
  console.log('SQL Error:', sqlErr?.message);

  // Also check the same for user_conversations
  const sql2 = `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'user_conversations'
    ORDER BY policyname
  `;
  const { data: convPolicies } = await svc.rpc('exec_sql', { query: sql2 });
  console.log('Conv Policies:', JSON.stringify(convPolicies, null, 2));

  // Check company_members policies
  const sql3 = `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'company_members'
    ORDER BY policyname
  `;
  const { data: memPolicies } = await svc.rpc('exec_sql', { query: sql3 });
  console.log('Member Policies:', JSON.stringify(memPolicies, null, 2));
})();