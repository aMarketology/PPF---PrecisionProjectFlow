require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

// Read the SQL files and run them via Supabase REST API
async function runSqlFile(filename) {
  const sql = fs.readFileSync(path.resolve(__dirname, '..', 'supabase', filename), 'utf8');
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // We need to create a temp RPC or use the REST API directly
  // Actually, let's use the pg connection approach with node-postgres
  const { Pool } = require('pg');
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
    // Split by $$ function delimiters and semicolons properly
    // For DO blocks and functions, run as a single statement
    await client.query(sql);
    console.log(`✅ ${filename} executed successfully`);
    client.release();
    await pool.end();
  } catch (e) {
    console.log(`❌ ${filename}: ${e.message}`);
    try { await pool.end(); } catch {}
  }
}

(async () => {
  console.log('Running remaining SQL files via direct PG connection...\n');
  await runSqlFile('ADD_AUTO_JOIN_CHANNEL_MSG.sql');
  await runSqlFile('TOKEN_TRANSFERS.sql');
  console.log('\nDone! Now verify with: node scripts/verify-all-sql.js');
})();