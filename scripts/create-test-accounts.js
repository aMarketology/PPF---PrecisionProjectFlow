// Creates test vendor and client accounts directly via Supabase Admin API
// Run: node scripts/create-test-accounts.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testAccountPassword = process.env.TEST_ACCOUNT_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !testAccountPassword) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or TEST_ACCOUNT_PASSWORD in .env.local');
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const accounts = [
  {
    email: 'vendor@ppf.test',
    password: testAccountPassword,
    full_name: 'Vendor',
    user_type: 'engineer', // engineers = vendors in this app
  },
  {
    email: 'supplier@ppf.test',
    password: testAccountPassword,
    full_name: 'Supplier',
    user_type: 'client', // clients = suppliers/buyers in this app
  },
];

async function createAccount({ email, password, full_name, user_type }) {
  console.log(`\nCreating ${full_name} (${user_type})...`);

  // Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation
    user_metadata: { full_name, user_type },
  });

  if (error) {
    console.error(`  ❌ Auth error: ${error.message}`);
    return;
  }

  const userId = data.user.id;
  console.log(`  ✅ Auth user created: ${userId}`);

  // Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name,
      user_type,
      token_balance: 10, // give them 10 free tokens to test with
    });

  if (profileError) {
    console.error(`  ❌ Profile error: ${profileError.message}`);
  } else {
    console.log(`  ✅ Profile created`);
  }

  // If engineer (vendor), create a company profile too
  if (user_type === 'engineer') {
    const { error: companyError } = await supabase
      .from('company_profiles')
      .upsert({
        owner_id: userId,
        company_name: 'Test Vendor Co.',
        description: 'A test vendor company for development purposes.',
        email,
        phone: '555-000-0001',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        specialties: ['Electrical', 'Mechanical'],
      });

    if (companyError) {
      console.error(`  ❌ Company profile error: ${companyError.message}`);
    } else {
      console.log(`  ✅ Company profile created`);
    }
  }

  console.log(`  📧 Email: ${email}`);
}

(async () => {
  console.log('=== Creating Test Accounts ===');
  for (const account of accounts) {
    await createAccount(account);
  }
  console.log('\n=== Done ===');
  console.log('\nLogin at: http://localhost:3000/login');
  console.log('Vendor:   vendor@ppf.test');
  console.log('Supplier: supplier@ppf.test');
  console.log('Use the locally configured TEST_ACCOUNT_PASSWORD.');
})();
