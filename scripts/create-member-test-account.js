/**
 * create-member-test-account.js
 * Creates a plain company MEMBER (not owner/admin) attached to a seeded
 * company, so we can test what a basic member can do in /admin.
 *
 * Run: node scripts/create-member-test-account.js
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local'), quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMAIL = 'member@ppf.test';
const PASSWORD = process.env.TEST_ACCOUNT_PASSWORD || 'Ppf-pU5FAxHuslQV!7';
const COMPANY_SLUG = 'northwind-precision-machining';

// Find or create the auth user
let userId;
for (let page = 1; page <= 10; page++) {
  const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  const found = data.users.find(u => u.email?.toLowerCase() === EMAIL);
  if (found) { userId = found.id; break; }
  if (data.users.length < 200) break;
}

if (userId) {
  await supabase.auth.admin.updateUserById(userId, { password: PASSWORD });
  console.log('reused existing user', userId);
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Morgan Lee', user_type: 'engineer' },
  });
  if (error) { console.error('createUser:', error.message); process.exit(1); }
  userId = data.user.id;
  console.log('created user', userId);
}

// Profile
await supabase.from('profiles').upsert({
  id: userId,
  email: EMAIL,
  full_name: 'Morgan Lee',
  user_type: 'engineer',
  bio: 'Shop floor lead - member account for permission testing.',
  location: 'Cleveland, OH',
  token_balance: 50,
});

// Company
const { data: company } = await supabase
  .from('company_profiles')
  .select('id, company_name')
  .eq('slug', COMPANY_SLUG)
  .single();

if (!company) { console.error('company not found'); process.exit(1); }

// Membership as plain MEMBER
const { error: memErr } = await supabase
  .from('company_members')
  .upsert(
    { company_id: company.id, user_id: userId, role: 'member', status: 'active' },
    { onConflict: 'company_id,user_id' }
  );
if (memErr) { console.error('membership:', memErr.message); process.exit(1); }

console.log(`✅ ${EMAIL} is now a MEMBER of ${company.company_name}`);
console.log(`   password: ${PASSWORD}`);
