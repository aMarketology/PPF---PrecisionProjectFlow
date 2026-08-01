require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use service role client (bypasses RLS)
const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' } }
);

(async () => {
  // Use direct database URL connection to query pg_policies
  // But supabase-js can't do raw SQL... let me use the POSTGREST URL directly
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  // Use the pg_dump approach - query the information_schema via a rest function
  // First create a simple function that returns policies
  // Actually, let me just query the table directly via the REST API
  
  // Check what policies exist by doing a select on the table as anon
  console.log('=== Testing Anon Client (simulating browser) ===');
  
  // Create anon client
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Check company_profiles
  const { data: cp, error: cpErr } = await anon
    .from('company_profiles')
    .select('*')
    .limit(5);
  console.log('anon company_profiles:', JSON.stringify(cp?.length), 'error:', cpErr?.message);
  
  // Now sign in and try
  const { error: signInErr } = await anon.auth.signInWithPassword({
    email: 'bootysweat.808@gmail.com',
    password: 'test123'
  });
  if (signInErr) {
    console.log('Sign-in error:', signInErr.message);
    // Try to sign up? No. Let's just check with service role what the password situation is
    const svc2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    // Check user auth
    const { data: users } = await svc2.auth.admin.listUsers();
    const target = users?.users?.find(u => u.email === 'bootysweat.808@gmail.com');
    console.log('User exists:', !!target);
    console.log('User created_at:', target?.created_at);
    console.log('Last sign in:', target?.last_sign_in_at);
    console.log('Confirmed at:', target?.confirmed_at);
    console.log('Identities:', JSON.stringify(target?.identities?.map(i => ({ provider: i.provider, identity_id: i.identity_id }))));
  }
  
  // Instead, query pg_policies via the auth admin API or a direct approach
  // Let me use a different approach - raw pg client
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd 
      FROM pg_policies 
      WHERE tablename IN ('company_profiles', 'company_members', 'user_conversations', 'conversation_participants')
      ORDER BY tablename, policyname
    `);
    console.log('\n=== Live RLS Policies ===');
    res.rows.forEach(r => console.log(`${r.tablename}: ${r.policyname} (${r.cmd})`));
    
    // Also check if RLS is enabled
    const rlsRes = await client.query(`
      SELECT relname AS table_name, relrowsecurity AS rls_enabled
      FROM pg_class
      WHERE relname IN ('company_profiles', 'company_members', 'user_conversations', 'conversation_participants')
      ORDER BY relname
    `);
    console.log('\n=== RLS Enabled ===');
    rlsRes.rows.forEach(r => console.log(`${r.table_name}: RLS=${r.rls_enabled}`));
    
    await client.end();
  } catch (e) {
    console.log('PG connection error:', e.message);
  }
})();