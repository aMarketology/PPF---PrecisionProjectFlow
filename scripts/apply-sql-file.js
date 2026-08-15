// Apply a single SQL file via direct PG connection to the real Supabase DB
// Usage: node scripts/apply-sql-file.js ADD_RFQ_LINE_ITEMS.sql
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const filename = process.argv[2];
  if (!filename) {
    console.error('Usage: node scripts/apply-sql-file.js <filename.sql>');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.resolve(__dirname, '..', 'supabase', filename), 'utf8');

  const pool = new Pool({
    host: 'db.ifrxzmemiihxfdimwvcw.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: decodeURIComponent('Dollabills420%21'),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    await client.query(sql);
    console.log(`✅ ${filename} executed successfully`);
    client.release();
  } catch (e) {
    console.error(`❌ ${filename}: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
