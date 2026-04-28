#!/usr/bin/env node
/**
 * setup-admin.js
 * ──────────────────────────────────────────────────────────────────────────────
 * 1. Finds or creates max@amarketology.com as a Supabase auth user
 * 2. Adds is_admin column to profiles (if missing)
 * 3. Migrates the "PPF Marketplace" profile + all its services to Max's user ID
 * 4. Marks Max's profile as is_admin = true, user_type = 'engineer'
 * 5. Saves Max's credentials to .env.local
 * 6. Deletes the old dealer ghost account (email: dealer@precisionprojectflow.com)
 *
 * Usage: node scripts/setup-admin.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing env vars'); process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OLD_DEALER_ID = process.env.PPF_DEALER_USER_ID; // 5afdc026-...
const MAX_EMAIL     = 'max@amarketology.com';
const MAX_PASSWORD  = process.env.PPF_ADMIN_PASSWORD || 'PPF_Admin_Max_2024!';
const MAX_NAME      = 'Max Real';

function appendEnvVar(key, value) {
  const envPath = path.resolve(__dirname, '../.env.local');
  let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const regex   = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
}

async function runSQL(sql) {
  // Use the REST API to run DDL via service role
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return res.ok;
}

async function main() {
  console.log('\n🚀  PPF Admin Setup — max@amarketology.com');
  console.log('────────────────────────────────────────────\n');

  // ── 1. Add is_admin column if it doesn't exist ────────────────────────────
  console.log('🔧  Checking is_admin column on profiles…');
  // Check if column exists by querying it
  const { error: colCheckErr } = await admin.from('profiles').select('is_admin').limit(1);
  if (colCheckErr?.message?.includes('column "is_admin" does not exist')) {
    console.log('  ℹ️   is_admin column not found — skipping flag (add via Supabase SQL editor)');
    console.log('  SQL: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;');
  }
  console.log('  ✅  Column check done\n');

  // ── 2. Find or create Max's auth user ────────────────────────────────────
  console.log(`👤  Finding or creating auth user: ${MAX_EMAIL}`);
  let maxUserId = null;

  // Try to find existing
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingMax = listData?.users?.find(u => u.email === MAX_EMAIL);

  if (existingMax) {
    maxUserId = existingMax.id;
    console.log(`  ℹ️   Found existing user: ${maxUserId}`);
    // Update password to known value
    await admin.auth.admin.updateUserById(maxUserId, { password: MAX_PASSWORD });
    console.log('  ✅  Password updated');
  } else {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: MAX_EMAIL,
      password: MAX_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: MAX_NAME, user_type: 'engineer' },
    });
    if (createErr) { console.error('  ❌  Failed:', createErr.message); process.exit(1); }
    maxUserId = newUser.user.id;
    console.log(`  ✅  Created: ${maxUserId}`);
  }

  // ── 3. Migrate services from old dealer to Max ───────────────────────────
  if (OLD_DEALER_ID && OLD_DEALER_ID !== maxUserId) {
    console.log(`\n📦  Migrating services from old dealer → Max…`);
    const { data: migrated, error: migErr } = await admin
      .from('services')
      .update({ provider_id: maxUserId })
      .eq('provider_id', OLD_DEALER_ID)
      .select('id');
    if (migErr) {
      console.warn(`  ⚠️   Migration warning: ${migErr.message}`);
    } else {
      console.log(`  ✅  Migrated ${migrated?.length ?? 0} services`);
    }
  } else if (!OLD_DEALER_ID) {
    console.log('\n  ℹ️   No old dealer ID in .env — skipping service migration');
  } else {
    console.log('\n  ℹ️   Max IS the dealer — no migration needed');
  }

  // ── 4. Upsert Max's profile as PPF Marketplace admin ────────────────────
  console.log('\n🏢  Upserting PPF Marketplace admin profile…');
  const profilePayload = {
    id:           maxUserId,
    email:        MAX_EMAIL,
    full_name:    MAX_NAME,
    user_type:    'engineer',
    bio:          'Official Precision Project Flow marketplace account. Curated listing of verified engineering services across structural, civil, mechanical, electrical, and consulting disciplines.',
    location:     'Dallas, TX',
    avatar_url:   'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop&crop=center',
  };

  const { error: profErr } = await admin
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });

  if (profErr) {
    console.warn(`  ⚠️   Profile upsert warning: ${profErr.message}`);
  } else {
    console.log('  ✅  Profile upserted');
  }

  // Try to set is_admin = true (works if column exists)
  const { error: adminFlagErr } = await admin
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', maxUserId);
  if (adminFlagErr) {
    console.warn(`  ⚠️   is_admin flag: ${adminFlagErr.message}`);
    console.log('  ℹ️   Run the SQL migration below to add the column first');
  } else {
    console.log('  ✅  is_admin = true set');
  }

  // ── 5. Delete old dealer ghost account ───────────────────────────────────
  if (OLD_DEALER_ID && OLD_DEALER_ID !== maxUserId) {
    console.log('\n🗑️   Removing old dealer ghost account…');
    // Delete profile first (cascade will handle services if any remain)
    await admin.from('profiles').delete().eq('id', OLD_DEALER_ID);
    // Delete auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(OLD_DEALER_ID);
    if (delErr) {
      console.warn(`  ⚠️   Could not delete old auth user: ${delErr.message}`);
    } else {
      console.log('  ✅  Old dealer account removed');
    }
  }

  // ── 6. Save to .env.local ─────────────────────────────────────────────────
  console.log('\n💾  Saving admin credentials to .env.local…');
  appendEnvVar('PPF_ADMIN_EMAIL',    MAX_EMAIL);
  appendEnvVar('PPF_ADMIN_PASSWORD', MAX_PASSWORD);
  appendEnvVar('PPF_ADMIN_USER_ID',  maxUserId);
  appendEnvVar('PPF_DEALER_USER_ID', maxUserId); // update dealer ID to point to Max
  console.log('  ✅  Saved');

  // ── 7. Verify ────────────────────────────────────────────────────────────
  const { data: services } = await admin
    .from('services')
    .select('id')
    .eq('provider_id', maxUserId);

  console.log('\n────────────────────────────────────────────');
  console.log('🎉  Admin setup complete!\n');
  console.log(`   Name:       ${MAX_NAME}`);
  console.log(`   Email:      ${MAX_EMAIL}`);
  console.log(`   Password:   ${MAX_PASSWORD}`);
  console.log(`   User ID:    ${maxUserId}`);
  console.log(`   Role:       Admin + PPF Marketplace vendor`);
  console.log(`   Services:   ${services?.length ?? 0} listings under this account`);
  console.log('\n   Login at:   /login');
  console.log('────────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\n❌  Error:', err.message);
  process.exit(1);
});
