// Run SQL via the exec_sql_select RPC (service role)
// Usage: node scripts/run-sql-rpc.js "ALTER TABLE ..."
require('dotenv').config({ path: '.env.local' });

async function main() {
  const sql = process.argv[2];
  if (!sql) {
    console.error('Usage: node scripts/run-sql-rpc.js "<SQL>"');
    process.exit(1);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql_select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text.substring(0, 3000));
  if (!res.ok) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });