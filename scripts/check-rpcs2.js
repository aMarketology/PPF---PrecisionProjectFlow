require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Check for SQL-execution RPCs
  const rpcs = [
    { name: 'exec_sql', params: { sql: 'SELECT 1' } },
    { name: 'exec_sql', params: { query: 'SELECT 1' } },
    { name: 'exec_migration', params: { sql_text: 'SELECT 1' } },
    { name: 'exec_sql_select', params: { query: 'SELECT 1' } },
    { name: 'exec_sql_create', params: { sql_text: 'SELECT 1' } },
  ];

  for (const rpc of rpcs) {
    try {
      const { data, error } = await svc.rpc(rpc.name, rpc.params);
      if (error) {
        console.log(`${rpc.name}(${Object.keys(rpc.params).join(',')}): ❌ ${error.message}`);
      } else {
        console.log(`${rpc.name}(${Object.keys(rpc.params).join(',')}): ✅ ${JSON.stringify(data)}`);
      }
    } catch (e) {
      console.log(`${rpc.name}(${Object.keys(rpc.params).join(',')}): ❌ ${e.message}`);
    }
  }
})();