require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

// Use Supabase Management API to run SQL
async function runSqlViaManagementApi(sql) {
  const projectRef = 'ifrxzmemiihxfdimwvcw';
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('No SUPABASE_ACCESS_TOKEN in .env.local');
    console.log('Get one from: https://supabase.com/dashboard/account/tokens');
    return false;
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  console.log('Status:', res.status, text.substring(0, 300));
  return res.ok;
}

(async () => {
  const sql1 = fs.readFileSync('supabase/ADD_AUTO_JOIN_CHANNEL_MSG.sql', 'utf8');
  const sql2 = fs.readFileSync('supabase/TOKEN_TRANSFERS.sql', 'utf8');

  console.log('Running ADD_AUTO_JOIN_CHANNEL_MSG.sql...');
  await runSqlViaManagementApi(sql1);
  
  console.log('\nRunning TOKEN_TRANSFERS.sql...');
  await runSqlViaManagementApi(sql2);
})();