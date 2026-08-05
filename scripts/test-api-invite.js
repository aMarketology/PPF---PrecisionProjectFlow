// Test the send-invite API endpoint directly
// Simulates a real browser request with auth cookies

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  // 1. Sign in as bootysweat to get the access token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('Signing in as bootysweat...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'bootysweat.808@gmail.com',
    password: 'Dollabills420!',
  });
  
  if (authErr) {
    console.log('Sign-in error:', authErr.message);
    console.log('(Try checking the correct password)');
    return;
  }

  console.log('Signed in! Token:', auth.session?.access_token?.substring(0, 20) + '...');

  // 2. Use the token to call the API
  const res = await fetch('http://localhost:3001/api/messages/send-invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.session.access_token}`,
    },
    body: JSON.stringify({
      companyId: '4a2ef5d4-8461-457e-b81c-32883001c3be',
      targetUserId: '8d00d160-04ad-410d-9325-edaeb0866f01',
    }),
  });

  const data = await res.json();
  console.log('API response:', res.status, JSON.stringify(data, null, 2));
})();