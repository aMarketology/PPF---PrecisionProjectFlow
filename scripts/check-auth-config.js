require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Test: send a reset email
  console.log('=== Test reset password ===');
  const { data, error } = await svc.auth.resetPasswordForEmail('bootysweat.808@gmail.com', {
    redirectTo: 'https://www.precisionprojectflow.com/reset-password',
  });
  console.log('Reset result:', error ? `❌ ${error.message}` : '✅ Email sent');
})();