/**
 * run-rls-fix.js
 * Reads FIX_RLS_CONVERSATION_PARTICIPANTS.sql and applies it
 * via the Supabase REST API (service_role key).
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const sqlPath = path.resolve(__dirname, '..', 'supabase', 'FIX_RLS_CONVERSATION_PARTICIPANTS.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Split into individual statements (semicolon-delimited)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 5);
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    // Extract a short description from the first comment or sql keyword
    const desc = stmt.split('\n')[0]?.trim()?.substring(0, 80) || `Statement ${i + 1}`;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      if (error) {
        console.log(`  [${i + 1}/${statements.length}] ❌ ${desc}`);
        console.log(`     Error: ${error.message}`);
      } else {
        console.log(`  [${i + 1}/${statements.length}] ✅ ${desc}`);
      }
    } catch (e) {
      console.log(`  [${i + 1}/${statements.length}] ❌ ${desc}`);
      console.log(`     Exception: ${e.message}`);
    }
  }
  
  console.log('\nDone!');
}

run().catch(console.error);