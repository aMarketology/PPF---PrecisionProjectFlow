// Apply DDL via Supabase pg-meta /pg/query endpoint (SQL Editor API)
// Usage: node scripts/apply-sql-via-meta.js ADD_RFQ_LINE_ITEMS.sql
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function main() {
  const filename = process.argv[2];
  if (!filename) {
    console.error('Usage: node scripts/apply-sql-via-meta.js <filename.sql>');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.resolve(__dirname, '..', 'supabase', filename), 'utf8');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Try the pg-meta query endpoint
  const res = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text.substring(0, 2000));
}

main().catch(e => { console.error(e); process.exit(1); });
